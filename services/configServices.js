const fs = require('fs');
const path = require('path');

// Caminhos dos arquivos
const GROUPS_FILE = path.join(__dirname, '../data/groups.json');
const CONFIG_FILE = path.join(__dirname, '../data/config.json');

// Helpers para ler arquivos
function readJsonFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        }
        return null;
    } catch (error) {
        console.error(`Erro ao ler ${filePath}:`, error);
        return null;
    }
}

// Pega o link do grupo primário (SINGLE) ou todos (MULTIPLE)
function getGroupLink() {
    const config = readJsonFile(CONFIG_FILE) || { mode: 'SINGLE' };
    const groups = readJsonFile(GROUPS_FILE) || [];

    if (config.mode === 'SINGLE') {
        const primaryGroup = groups.find(g => g.isPrimary) || groups[0];
        return primaryGroup?.link || '';
    } else { // MULTIPLE
        return groups.map(g => g.link).filter(Boolean);
    }
}

// Define o link do grupo primário
function setGroupLink(link) {
    const groups = readJsonFile(GROUPS_FILE) || [];
    let primaryGroup = groups.find(g => g.isPrimary);

    if (!primaryGroup) {
        primaryGroup = { 
            id: Date.now().toString(),
            link,
            isPrimary: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        groups.push(primaryGroup);
    } else {
        primaryGroup.link = link;
        primaryGroup.updatedAt = new Date().toISOString();
    }

    try {
        fs.writeFileSync(GROUPS_FILE, JSON.stringify(groups, null, 2));
        return true;
    } catch (error) {
        console.error('Erro ao salvar groups.json:', error);
        return false;
    }
}

module.exports = { getGroupLink, setGroupLink };