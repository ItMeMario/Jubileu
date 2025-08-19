// groupService.js - Versão com banco de dados SQLite
const path = require("path");
const fs = require("fs");
const db = require("../config/db");
const { debug } = require("./debugService");

const DATA_DIR = path.join(__dirname, "../data");
const CONFIG_FILE = path.join(DATA_DIR, "config.json");
const DEFAULT_MODE = "SINGLE";

class GroupService {
  constructor() {
    this.config = { mode: DEFAULT_MODE };
    this._ensureDataDirExists();
    this._loadConfig();
  }

  _ensureDataDirExists() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  _loadConfig() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        this.config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
      } else {
        this._saveConfig();
      }
    } catch (e) {
      this.config = { mode: DEFAULT_MODE };
      this._saveConfig();
    }
  }

  _saveConfig() {
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));
    } catch (e) {
      console.error("Erro ao salvar config:", e);
    }
  }

  // 🔄 Busca todas as cidades do banco
  async getAllGroups() {
    return new Promise((resolve, reject) => {
      const sql = `SELECT id, name, link, isPrimary, message FROM cities ORDER BY id`;

      db.all(sql, [], (err, rows) => {
        if (err) {
          console.error("Erro ao buscar grupos:", err);
          debug("Erro ao buscar grupos do banco:", err);
          resolve([]); // Retorna array vazio em caso de erro
        } else {
          const groups = rows.map((row) => ({
            id: row.id,
            name: row.name,
            link: row.link,
            isPrimary: Boolean(row.isPrimary),
            message: row.message || `Bem vindo a ${row.name}`,
            descricao: row.name.toLowerCase(), // Para compatibilidade
            date: null, // Removido pois não existe mais na estrutura do banco
            createdAt: null, // Removido pois não existe mais na estrutura do banco
            updatedAt: null, // Removido pois não existe mais na estrutura do banco
          }));

          debug(`Grupos carregados do banco: ${groups.length} encontrados`);
          resolve(groups);
        }
      });
    });
  }

  // 🏆 Busca o grupo primário
  async getPrimaryGroup() {
    return new Promise((resolve, reject) => {
      const sql = `SELECT id, name, link, isPrimary, message FROM cities WHERE isPrimary = 1 LIMIT 1`;

      db.get(sql, [], (err, row) => {
        if (err) {
          console.error("Erro ao buscar grupo primário:", err);
          debug("Erro ao buscar grupo primário:", err);
          resolve(null);
        } else if (row) {
          const group = {
            id: row.id,
            name: row.name,
            link: row.link,
            isPrimary: Boolean(row.isPrimary),
            message: row.message || `Bem vindo a ${row.name}`,
            descricao: row.name.toLowerCase(),
          };
          debug("Grupo primário encontrado:", group.name);
          resolve(group);
        } else {
          debug("Nenhum grupo primário encontrado");
          resolve(null);
        }
      });
    });
  }

  // 🔗 Busca o link do grupo primário
  async getPrimaryGroupLink() {
    const primaryGroup = await this.getPrimaryGroup();
    return primaryGroup?.link || "";
  }

  // ⚙️ Busca uma cidade específica por nome (para o sistema de matching)
  async getGroupByName(cityName) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT id, name, link, isPrimary, message FROM cities WHERE LOWER(name) = LOWER(?) LIMIT 1`;

      db.get(sql, [cityName], (err, row) => {
        if (err) {
          console.error("Erro ao buscar cidade por nome:", err);
          debug("Erro ao buscar cidade por nome:", err);
          resolve(null);
        } else if (row) {
          const group = {
            id: row.id,
            name: row.name,
            link: row.link,
            isPrimary: Boolean(row.isPrimary),
            message: row.message || `Bem vindo a ${row.name}`,
            descricao: row.name.toLowerCase(),
          };
          resolve(group);
        } else {
          resolve(null);
        }
      });
    });
  }

  // 🔍 Busca cidades que contenham o termo (para busca fuzzy)
  async searchGroupsByName(searchTerm) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT id, name, link, isPrimary, message FROM cities WHERE LOWER(name) LIKE LOWER(?) ORDER BY name`;

      db.all(sql, [`%${searchTerm}%`], (err, rows) => {
        if (err) {
          console.error("Erro ao buscar cidades por termo:", err);
          debug("Erro ao buscar cidades por termo:", err);
          resolve([]);
        } else {
          const groups = rows.map((row) => ({
            id: row.id,
            name: row.name,
            link: row.link,
            isPrimary: Boolean(row.isPrimary),
            message: row.message || `Bem vindo a ${row.name}`,
            descricao: row.name.toLowerCase(),
          }));
          resolve(groups);
        }
      });
    });
  }

  // 📊 Conta o total de grupos
  async getGroupCount() {
    return new Promise((resolve, reject) => {
      const sql = `SELECT COUNT(*) as count FROM cities`;

      db.get(sql, [], (err, row) => {
        if (err) {
          console.error("Erro ao contar grupos:", err);
          resolve(0);
        } else {
          resolve(row.count);
        }
      });
    });
  }

  // 🛠️ Métodos para configuração (mantidos)
  getCurrentMode() {
    return this.config.mode;
  }

  setMode(mode) {
    this.config.mode = mode;
    this._saveConfig();
  }

  // 🔧 Método para garantir que existe pelo menos um grupo primário no modo SINGLE
  async ensurePrimaryGroupExists() {
    if (this.getCurrentMode() === "SINGLE") {
      const primaryGroup = await this.getPrimaryGroup();

      if (!primaryGroup) {
        // Se não há grupo primário, define o primeiro como primário
        const allGroups = await this.getAllGroups();
        if (allGroups.length > 0) {
          await this.setPrimaryGroup(allGroups[0].id);
          debug("Grupo primário definido automaticamente:", allGroups[0].name);
        }
      }
    }
  }

  // 🏆 Define um grupo como primário
  async setPrimaryGroup(groupId) {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        // Remove o status primário de todos os grupos
        db.run(`UPDATE cities SET isPrimary = 0`, (err) => {
          if (err) {
            console.error("Erro ao remover status primário:", err);
            resolve(false);
            return;
          }

          // Define o novo grupo primário
          db.run(
            `UPDATE cities SET isPrimary = 1 WHERE id = ?`,
            [groupId],
            (err) => {
              if (err) {
                console.error("Erro ao definir grupo primário:", err);
                resolve(false);
              } else {
                debug("Novo grupo primário definido, ID:", groupId);
                resolve(true);
              }
            }
          );
        });
      });
    });
  }
}

module.exports = new GroupService();
