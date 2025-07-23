const fs = require('fs').promises;
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '../data/devMode.json');

// Função de debug que será exportada
async function debug(...args) {
    try {
        const data = await fs.readFile(CONFIG_FILE, 'utf8');
        const config = JSON.parse(data);
        
        if (config.debugEnabled === true) {
            console.log('[DEBUG]', ...args);
        }
    } catch (error) {
        // Se não conseguir ler o arquivo, não mostra debug
        // Evita spam de erros no console
    }
}

// Função para alternar debug
async function toggleDebugMode() {
    try {
        const data = await fs.readFile(CONFIG_FILE, 'utf8');
        const config = JSON.parse(data);
        
        config.debugEnabled = !config.debugEnabled;
        config.lastDebugChanged = new Date().toISOString();
        
        await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
        
        return { success: true, debugEnabled: config.debugEnabled };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Função para obter status atual do debug
async function getDebugStatus() {
    try {
        const data = await fs.readFile(CONFIG_FILE, 'utf8');
        const config = JSON.parse(data);
        return {
            debugEnabled: config.debugEnabled || false,
            lastDebugChanged: config.lastDebugChanged || null
        };
    } catch (error) {
        return { debugEnabled: false, lastDebugChanged: null };
    }
}

module.exports = {
    debug,
    toggleDebugMode,
    getDebugStatus
};