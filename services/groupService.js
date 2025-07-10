const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const GROUPS_FILE = path.join(DATA_DIR, 'groups.json');
const DEFAULT_MODE = 'SINGLE'; // SINGLE ou MULTI

class GroupService {
    constructor() {
        this.groups = [];
        this.mode = DEFAULT_MODE;
        this._ensureDataDirExists();
        this._loadGroups();
    }

    _ensureDataDirExists() {
        try {
            if (!fs.existsSync(DATA_DIR)) {
                fs.mkdirSync(DATA_DIR, { recursive: true });
                console.log(`Diretório ${DATA_DIR} criado com sucesso.`);
            }
        } catch (error) {
            console.error(`Erro ao criar diretório ${DATA_DIR}:`, error);
            throw error;
        }
    }

    _loadGroups() {
        try {
            if (fs.existsSync(GROUPS_FILE)) {
                const data = fs.readFileSync(GROUPS_FILE, 'utf8');
                const parsed = JSON.parse(data);
                this.groups = parsed.groups || [];
                this.mode = parsed.mode || DEFAULT_MODE;
            } else {
                this._saveGroups();
            }
        } catch (error) {
            console.error('Erro ao carregar grupos:', error);
            this.groups = [];
            this.mode = DEFAULT_MODE;
        }
    }

    _saveGroups() {
        try {
            const data = JSON.stringify({
                groups: this.groups,
                mode: this.mode
            }, null, 2);
            fs.writeFileSync(GROUPS_FILE, data, 'utf8');
        } catch (error) {
            console.error('Erro ao salvar grupos:', error);
            throw error;
        }
    }

    addGroup(link) {
        const existing = this.groups.find(g => g.link === link);
        if (existing) return existing;

        const newGroup = {
            id: Date.now().toString(),
            link,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.groups.push(newGroup);
        this._saveGroups();
        return newGroup;
    }

    updateGroup(id, newLink) {
        const group = this.groups.find(g => g.id === id);
        if (!group) return false;

        group.link = newLink;
        group.updatedAt = new Date().toISOString();
        this._saveGroups();
        return true;
    }

    deleteGroup(id) {
        const index = this.groups.findIndex(g => g.id === id);
        if (index === -1) return false;

        this.groups.splice(index, 1);
        this._saveGroups();
        return true;
    }

    getGroupById(id) {
        return this.groups.find(g => g.id === id);
    }

    getAllGroups() {
        return [...this.groups];
    }

    getActiveGroups() {
        if (this.mode === 'SINGLE' && this.groups.length > 0) {
            return [this.groups[0]]; // Retorna apenas o primeiro grupo no modo SINGLE
        }
        return [...this.groups];
    }

    setMode(newMode) {
        if (['SINGLE', 'MULTI'].includes(newMode)) {
            this.mode = newMode;
            this._saveGroups();
            return true;
        }
        return false;
    }

    getCurrentMode() {
        return this.mode;
    }
}

module.exports = new GroupService();