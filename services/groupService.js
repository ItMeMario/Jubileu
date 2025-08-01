// groupService.js (versão limpa, dependente apenas de cities.json)
const fs = require("fs");
const path = require("path");
const { debug } = require("./debugService");

const DATA_DIR = path.join(__dirname, "../data");
const CITIES_FILE = path.join(DATA_DIR, "cities.json");
const CITIES_MESSAGE_DIR = path.join(DATA_DIR, "citiesMessageTxt");
const CONFIG_FILE = path.join(DATA_DIR, "config.json");
const DEFAULT_MODE = "SINGLE";

class GroupService {
  constructor() {
    this.groups = [];
    this.config = { mode: DEFAULT_MODE };
    this._ensureDataDirExists();
    this._loadData();
  }

  _ensureDataDirExists() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(CITIES_MESSAGE_DIR))
      fs.mkdirSync(CITIES_MESSAGE_DIR, { recursive: true });
  }

  async _loadCityMessage(cityId) {
    try {
      const file = path.join(CITIES_MESSAGE_DIR, `${cityId}.txt`);
      if (fs.existsSync(file)) return fs.readFileSync(file, "utf8").trim();
      return null;
    } catch (_) {
      return null;
    }
  }

  async _saveCityMessage(cityId, message) {
    const file = path.join(CITIES_MESSAGE_DIR, `${cityId}.txt`);
    if (!message?.trim()) return fs.existsSync(file) && fs.unlinkSync(file);
    fs.writeFileSync(file, message.trim(), "utf8");
  }

  async _deleteCityMessage(cityId) {
    const file = path.join(CITIES_MESSAGE_DIR, `${cityId}.txt`);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }

  async _loadData() {
    try {
      if (!fs.existsSync(CITIES_FILE))
        throw new Error("cities.json não encontrado");
      const raw = fs.readFileSync(CITIES_FILE, "utf8");
      const citiesData = JSON.parse(raw);

      this.groups = await Promise.all(
        citiesData.map(async (city) => ({
          id: city.id,
          link: city.link,
          name: city.name.toLowerCase(),
          descricao: city.name.toLowerCase(),
          date: city.date,
          isPrimary: city.isPrimary || false,
          createdAt: city.createdAt || new Date().toISOString(),
          updatedAt: city.updatedAt || new Date().toISOString(),
          _messageFromFile: await this._loadCityMessage(city.id),
        }))
      );

      if (fs.existsSync(CONFIG_FILE)) {
        this.config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
      } else {
        this._saveConfig();
      }

      if (
        this.config.mode === "SINGLE" &&
        this.groups.length &&
        !this.groups.some((g) => g.isPrimary)
      ) {
        this.groups[0].isPrimary = true;
        this._saveGroups();
      }
    } catch (e) {
      this.groups = [];
      this.config = { mode: DEFAULT_MODE };
    }
  }

  async _saveGroups() {
    const citiesFormat = this.groups.map((group) => ({
      id: group.id,
      name: group.name.charAt(0).toUpperCase() + group.name.slice(1),
      link: group.link,
      date: group.date,
      isPrimary: group.isPrimary,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    }));
    fs.writeFileSync(CITIES_FILE, JSON.stringify(citiesFormat, null, 2));
  }

  _saveConfig() {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));
  }

  async getAllGroups() {
    return Promise.all(this.groups.map((g) => this._enrichGroupWithMessage(g)));
  }

  async getPrimaryGroup() {
    const g = this.groups.find((g) => g.isPrimary);
    return g ? this._enrichGroupWithMessage(g) : null;
  }

  async getPrimaryGroupLink() {
    const g = await this.getPrimaryGroup();
    return g?.link || "";
  }

  getCurrentMode() {
    return this.config.mode;
  }

  async _enrichGroupWithMessage(group) {
    const message =
      group._messageFromFile || (await this._loadCityMessage(group.id));
    return {
      ...group,
      message: message || `Bem vindo a ${group.name}`,
    };
  }
}

module.exports = new GroupService();
