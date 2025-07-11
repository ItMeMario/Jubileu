const fs = require('fs');
const path = require('path');

const DATA_DIR    = path.join(__dirname, '../data');
const GROUPS_FILE = path.join(DATA_DIR, 'groups.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const DEFAULT_MODE = 'SINGLE';

class GroupService {
  constructor() {
    this.groups = [];
    this.config = { mode: DEFAULT_MODE };
    this._ensureDataDirExists();
    this._loadData();
  }

  /* ──────────────────────────────
     utilidades internas
  ────────────────────────────── */
  _ensureDataDirExists() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  _loadData() {
    try {
      // grupos
      if (fs.existsSync(GROUPS_FILE)) {
        this.groups = JSON.parse(fs.readFileSync(GROUPS_FILE, 'utf8'));
      } else {
        this._saveGroups();
      }

      // config
      if (fs.existsSync(CONFIG_FILE)) {
        this.config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      } else {
        this._saveConfig();
      }

      // garante grupo primário em SINGLE
      if (this.config.mode === 'SINGLE' &&
          this.groups.length &&
          !this.groups.some(g => g.isPrimary)) {
        this.groups[0].isPrimary = true;
        this._saveGroups();
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      this.groups = [];
      this.config = { mode: DEFAULT_MODE };
    }
  }

  _saveGroups()  { fs.writeFileSync(GROUPS_FILE, JSON.stringify(this.groups,  null, 2)); }
  _saveConfig()  { fs.writeFileSync(CONFIG_FILE,  JSON.stringify(this.config, null, 2)); }

  /* ──────────────────────────────
     CRUD de grupos
  ────────────────────────────── */
  addGroup(link, setAsPrimary = false, name = '', descricao = '') {
    const newGroup = {
      id: Date.now().toString(),
      link,
      name: name.toLowerCase(),          // opcional
      descricao: descricao.toLowerCase(),// opcional
      isPrimary: setAsPrimary || !this.groups.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (newGroup.isPrimary) this.groups.forEach(g => g.isPrimary = false);
    this.groups.push(newGroup);
    this._saveGroups();
    return newGroup;
  }

  updateGroup(id, updates = {}) {
    const group = this.groups.find(g => g.id === id);
    if (!group) return false;

    Object.assign(group, updates, { updatedAt: new Date().toISOString() });
    this._saveGroups();
    return true;
  }

  deleteGroup(id) {
    const idx = this.groups.findIndex(g => g.id === id);
    if (idx === -1) return false;

    const [removed] = this.groups.splice(idx, 1);
    if (removed.isPrimary && this.groups.length) this.groups[0].isPrimary = true;
    this._saveGroups();
    return true;
  }

  setPrimaryGroup(id) {
    const group = this.groups.find(g => g.id === id);
    if (!group) return false;

    this.groups.forEach(g => g.isPrimary = false);
    group.isPrimary = true;
    group.updatedAt = new Date().toISOString();
    this._saveGroups();
    return true;
  }

  /* ──────────────────────────────
     getters
  ────────────────────────────── */
  getPrimaryGroup()      { return this.groups.find(g => g.isPrimary) || this.groups[0]; }
  getPrimaryGroupLink()  { const g = this.getPrimaryGroup(); return g ? g.link : ''; }
  getAllGroupLinks()     { return this.groups.map(g => g.link); }
  getAllGroups()         { return [...this.groups]; }
  getGroupById(id)       { return this.groups.find(g => g.id === id); }
  getCurrentMode()       { return this.config.mode; }

  getActiveGroups() {
    if (this.config.mode === 'SINGLE') return this.getPrimaryGroup() ? [this.getPrimaryGroup()] : [];
    return [...this.groups];
  }

  /* ──────────────────────────────
     modo de operação
  ────────────────────────────── */
  setMode(newMode) {
    if (!['SINGLE', 'MULTI'].includes(newMode)) return false;
    this.config.mode = newMode;
    this._saveConfig();

    if (newMode === 'SINGLE' && this.groups.length && !this.groups.some(g => g.isPrimary)) {
      this.groups[0].isPrimary = true;
      this._saveGroups();
    }
    return true;
  }

  moveToFirstPosition(groupId) {
    const idx = this.groups.findIndex(g => g.id === groupId);
    if (idx > 0) {
      const [g] = this.groups.splice(idx, 1);
      this.groups.unshift(g);
      this._saveGroups();
      return true;
    }
    return false;
  }

  /* ──────────────────────────────
     NOVO: encontrar cidade pelo input
     - aceita texto (nome/descrição) ou número do menu (1,2,3...)
  ────────────────────────────── */
  findCityByInput(input, cityList = []) {
  if (!input) return null;
  const entrada = input.toString().trim().toLowerCase();

  // 1) Se for número, usa índice baseado na lista fornecida
  if (/^\d+$/.test(entrada)) {
    const idx = parseInt(entrada, 10) - 1;
    return cityList[idx] || null;
  }

  // 2) Match exato
  return cityList.find(g =>
    g.name === entrada || g.descricao === entrada
  ) || null;
}
}

module.exports = new GroupService();
