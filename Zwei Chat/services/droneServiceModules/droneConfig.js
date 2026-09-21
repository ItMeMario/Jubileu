// services/droneServiceModules/droneConfig.js
const fs = require("fs").promises;

async function loadConfig(configPath, currentConfig) {
    try {
        const data = await fs.readFile(configPath, 'utf8');
        const loadedConfig = JSON.parse(data);
        
        const config = { ...currentConfig, ...loadedConfig };
        console.log("Drone: Configuração carregada:", config);
        return config;
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error("Drone: Erro ao carregar configuração:", error);
        }
        return currentConfig;
    }
}

async function saveConfig(configPath, config) {
    try {
         const data = JSON.stringify(config, null, 2);
         await fs.writeFile(configPath, data, 'utf8');
         console.log("Drone: Configuração salva.");
    } catch (error) {
        console.error("Drone: Erro ao salvar configuração:", error);
    }
}

module.exports = {
    loadConfig,
    saveConfig
};
