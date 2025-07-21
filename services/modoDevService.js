const fs = require('fs').promises;
const path = require('path');
const { delay, randomDelay } = require("../utils/delay");
const { initializeDevModeConfig } = require("../utils/initialize");

// Arquivo de configuração para persistir o modo
const CONFIG_FILE = path.join(__dirname, '../data/devMode.json');

// Configuração padrão
const DEFAULT_CONFIG = {
    isDevMode: false,
    lastChanged: null
};

/**
 * Carrega a configuração do arquivo
 */
async function loadConfig() {
    try {
        // Garante que o arquivo existe antes de tentar lê-lo
        await initializeDevModeConfig();
        
        const data = await fs.readFile(CONFIG_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Erro ao carregar configuração:', error);
        return DEFAULT_CONFIG;
    }
}

/**
 * Salva a configuração no arquivo
 */
async function saveConfig(config) {
    try {
        await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        console.error('Erro ao salvar configuração:', error);
        return false;
    }
}

/**
 * Define o modo de desenvolvimento
 */
async function setDevMode(isDevMode) {
    try {
        const config = await loadConfig();
        config.isDevMode = isDevMode;
        config.lastChanged = new Date().toISOString();
        
        const saved = await saveConfig(config);
        
        if (saved) {
            console.log(`\n📝 Configuração salva: ${isDevMode ? 'Modo Dev' : 'Modo Produção'}`);
            return { success: true, config };
        } else {
            return { success: false, error: 'Falha ao salvar configuração' };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Obtém o modo atual
 */
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

/**
 * Obtém status detalhado do sistema
 */
async function getDetailedStatus() {
    try {
        const config = await loadConfig();
        
        // Verifica se o arquivo de config existe
        let configExists = false;
        try {
            await fs.access(CONFIG_FILE);
            configExists = true;
        } catch (error) {
            configExists = false;
        }
        
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

/**
 * Executa o delay baseado no modo atual
 */
async function executeDelay() {
    try {
        const config = await loadConfig();
        
        if (config.isDevMode) {
            // Modo desenvolvimento: 3 segundos fixo
            await delay(3000);
        } else {
            // Modo produção: 1-3 minutos aleatório
            await randomDelay(60000, 180000);
        }
    } catch (error) {
        console.error('Erro ao executar delay:', error);
        // Em caso de erro, usa delay padrão de produção
        await randomDelay(60000, 180000);
    }
}

/**
 * Testa o delay atual (para demonstração)
 */
async function testDelay() {
    const config = await loadConfig();
    
    if (config.isDevMode) {
        console.log('🔧 Executando delay de desenvolvimento (3s)...');
        await delay(3000);
    } else {
        console.log('🚀 Executando delay de produção (simulação com 5s)...');
        // Para teste, usa um delay menor que o real de produção
        await delay(5000);
    }
}

/**
 * Retorna a função de delay apropriada baseada no modo atual
 * Esta função pode ser usada em outros arquivos que precisam do delay
 */
async function getDelayFunction() {
    const config = await loadConfig();
    
    if (config.isDevMode) {
        return () => delay(3000);
    } else {
        return () => randomDelay(60000, 180000);
    }
}

/**
 * Força a recarga da configuração (útil se outro processo alterou o arquivo)
 */
async function reloadConfig() {
    try {
        // Remove cache se existir
        delete require.cache[CONFIG_FILE];
        return await loadConfig();
    } catch (error) {
        throw new Error(`Erro ao recarregar configuração: ${error.message}`);
    }
}

module.exports = {
    setDevMode,
    getCurrentMode,
    getDetailedStatus,
    executeDelay,
    testDelay,
    getDelayFunction,
    reloadConfig
};