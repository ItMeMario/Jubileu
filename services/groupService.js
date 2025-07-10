const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
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

    _ensureDataDirExists() {
        try {
            if (!fs.existsSync(DATA_DIR)) {
                fs.mkdirSync(DATA_DIR, { recursive: true });
            }
        } catch (error) {
            console.error('Erro ao criar diretório:', error);
            throw error;
        }
    }

    _loadData() {
        try {
            // Carrega grupos
            if (fs.existsSync(GROUPS_FILE)) {
                const groupsData = fs.readFileSync(GROUPS_FILE, 'utf8');
                this.groups = JSON.parse(groupsData);
            } else {
                this._saveGroups();
            }

            // Carrega configurações
            if (fs.existsSync(CONFIG_FILE)) {
                const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
                this.config = JSON.parse(configData);
            } else {
                this._saveConfig();
            }

            // Garante que existe um grupo primário no modo SINGLE
            if (this.config.mode === 'SINGLE' && this.groups.length > 0 && !this.groups.some(g => g.isPrimary)) {
                this.groups[0].isPrimary = true;
                this._saveGroups();
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            this.groups = [];
            this.config = { mode: DEFAULT_MODE };
        }
    }

    _saveGroups() {
        fs.writeFileSync(GROUPS_FILE, JSON.stringify(this.groups, null, 2));
    }

    _saveConfig() {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));
    }

    // Métodos públicos
    addGroup(link, setAsPrimary = false) {
        const newGroup = {
            id: Date.now().toString(),
            link,
            isPrimary: setAsPrimary || this.groups.length === 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Se definido como primário, remove a flag de outros grupos
        if (newGroup.isPrimary) {
            this.groups.forEach(g => g.isPrimary = false);
        }

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

        const [deletedGroup] = this.groups.splice(index, 1);
        
        // Se estava deletando o grupo primário e ainda existem grupos
        if (deletedGroup.isPrimary && this.groups.length > 0) {
            this.groups[0].isPrimary = true;
        }
        
        this._saveGroups();
        return true;
    }

    setPrimaryGroup(id) {
        const group = this.groups.find(g => g.id === id);
        if (!group) return false;

        // Remove a flag de todos os grupos
        this.groups.forEach(g => g.isPrimary = false);
        
        // Define o novo grupo como primário
        group.isPrimary = true;
        group.updatedAt = new Date().toISOString();
        
        this._saveGroups();
        return true;
    }

    getPrimaryGroup() {
        return this.groups.find(g => g.isPrimary) || this.groups[0];
    }

    getPrimaryGroupLink() {
        const primary = this.getPrimaryGroup();
        return primary ? primary.link : '';
    }

    getAllGroupLinks() {
        return this.groups.map(g => g.link);
    }

    setMode(newMode) {
        if (!['SINGLE', 'MULTI'].includes(newMode)) return false;
        
        this.config.mode = newMode;
        this._saveConfig();
        
        // No modo SINGLE, garante que existe um grupo primário
        if (newMode === 'SINGLE' && this.groups.length > 0 && !this.groups.some(g => g.isPrimary)) {
            this.groups[0].isPrimary = true;
            this._saveGroups();
        }
        
        return true;
    }

    // Métodos existentes mantidos para compatibilidade
    getGroupById(id) {
        return this.groups.find(g => g.id === id);
    }

    getAllGroups() {
        return [...this.groups];
    }

    getCurrentMode() {
        return this.config.mode;
    }

    getActiveGroups() {
        if (this.config.mode === 'SINGLE') {
            const primary = this.getPrimaryGroup();
            return primary ? [primary] : [];
        }
        return [...this.groups];
    }

    moveToFirstPosition(groupId) {
        const index = this.groups.findIndex(g => g.id === groupId);
        if (index > 0) {
            const [group] = this.groups.splice(index, 1);
            this.groups.unshift(group);
            this._saveGroups();
            return true;
        }
        return false;
    }
}

module.exports = new GroupService();