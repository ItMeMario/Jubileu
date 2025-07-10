// services/configService.js
const fs = require('fs');
const path = require('path');

// Caminho ajustado para salvar o JSON dentro da pasta services
const CONFIG_FILE = path.join(__dirname, 'linkGrupo.json');

function getConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const data = fs.readFileSync(CONFIG_FILE, 'utf8');
            return JSON.parse(data);
        }
        return { groupLink: '' }; // Valor padrão
    } catch (error) {
        console.error('Erro ao ler configuração:', error);
        return { groupLink: '' };
    }
}

function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        console.error('Erro ao salvar configuração:', error);
        return false;
    }
}

function getGroupLink() {
    return getConfig().groupLink;
}

function setGroupLink(link) {
    const config = getConfig();
    config.groupLink = link;
    return saveConfig(config);
}

module.exports = {
    getGroupLink,
    setGroupLink
};