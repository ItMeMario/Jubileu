const fs = require('fs').promises;
const path = require('path');
const { delay, randomDelay } = require("../utils/delay");
const { initializeDevModeConfig } = require("../utils/initialize");

const CONFIG_FILE = path.join(__dirname, '../data/devMode.json');

const DEFAULT_CONFIG = {
    isDevMode: false,
    lastChanged: null
};

async function loadConfig() {
    try {
        await initializeDevModeConfig();
        const data = await fs.readFile(CONFIG_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Erro ao carregar configuração:', error);
        return DEFAULT_CONFIG;
    }
}

async function saveConfig(config) {
    try {
        await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        console.error('Erro ao salvar configuração:', error);
        return false;
    }
}

async function toggleDevMode() {
    try {
        const config = await loadConfig();
        config.isDevMode = !config.isDevMode;
        config.lastChanged = new Date().toISOString();

        const saved = await saveConfig(config);
        if (saved) {
            return { success: true, isDevMode: config.isDevMode };
        } else {
            return { success: false, error: 'Falha ao salvar configuração' };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getCurrentMode() {
    try {
        const config = await loadConfig();
        return {
            isDevMode: config.isDevMode,
            lastChanged: config.lastChanged
        };
    } catch (error) {
        console.error('Erro ao carregar configuração:', error);
        return DEFAULT_CONFIG;
    }
}

async function getDetailedStatus() {
    try {
        const config = await loadConfig();

        let configExists = false;
        try {
            await fs.access(CONFIG_FILE);
            configExists = true;
        } catch (_) {}

        return {
            isDevMode: config.isDevMode,
            delayDescription: config.isDevMode ? '3 segundos (fixo)' : '1-3 minutos (aleatório)',
            lastChanged: config.lastChanged ? new Date(config.lastChanged).toLocaleString('pt-BR') : null,
            configExists
        };
    } catch (error) {
        throw new Error(`Erro ao obter status: ${error.message}`);
    }
}

async function testDelay() {
    const config = await loadConfig();
    if (config.isDevMode) {
        await delay(3000);
    } else {
        await randomDelay(60000, 180000);
    }
}

module.exports = {
    toggleDevMode,
    getCurrentMode,
    getDetailedStatus,
    testDelay
};
