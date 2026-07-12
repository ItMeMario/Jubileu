// services/deeJayServiceModules/deeJayConfig.js
const fs = require("fs").promises;

async function loadConfig(configPath, currentConfig) {
    try {
        const data = await fs.readFile(configPath, 'utf8');
        const loadedConfig = JSON.parse(data);
        
        const config = { ...currentConfig };
        if (loadedConfig.minIntervalMinutes) config.minIntervalMinutes = loadedConfig.minIntervalMinutes;
        if (loadedConfig.maxIntervalMinutes) config.maxIntervalMinutes = loadedConfig.maxIntervalMinutes;
        if (loadedConfig.deeJayInterval) config.deeJayInterval = loadedConfig.deeJayInterval;
        if (loadedConfig.hasOwnProperty('linkBotPrincipal')) config.linkBotPrincipal = !!loadedConfig.linkBotPrincipal;
        if (loadedConfig.hasOwnProperty('linkDrone')) config.linkDrone = !!loadedConfig.linkDrone;
        if (loadedConfig.hasOwnProperty('active')) config.active = !!loadedConfig.active;
        
        console.log("Dee Jay: Configuração carregada:", config);
        return config;
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error("Dee Jay: Erro ao carregar configuração:", error);
        }
        return currentConfig;
    }
}

async function saveConfig(configPath, config) {
    try {
         const data = JSON.stringify(config, null, 2);
         await fs.writeFile(configPath, data, 'utf8');
         console.log("Dee Jay: Configuração salva.");
    } catch (error) {
        console.error("Dee Jay: Erro ao salvar configuração:", error);
    }
}

module.exports = {
    loadConfig,
    saveConfig
};
