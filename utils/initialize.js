const fs = require('fs').promises;
const path = require('path');

// Diretório base para dados
const DATA_DIR = path.join(__dirname, '../data');

/**
 * Garante que o diretório data existe
 */
async function ensureDataDirectory() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') {
            console.error('Erro ao criar diretório data:', error);
            throw error;
        }
    }
}

/**
 * Cria um arquivo JSON se não existir
 */
async function createJsonFileIfNotExists(filename, defaultContent) {
    try {
        await ensureDataDirectory();
        
        const filePath = path.join(DATA_DIR, filename);
        
        // Verifica se o arquivo já existe
        try {
            await fs.access(filePath);
            return filePath; // Arquivo já existe
        } catch (error) {
            // Arquivo não existe, vamos criá-lo
            if (error.code === 'ENOENT') {
                await fs.writeFile(filePath, JSON.stringify(defaultContent, null, 2));
                console.log(`✅ Arquivo ${filename} criado em ${DATA_DIR}`);
                return filePath;
            }
            throw error;
        }
    } catch (error) {
        console.error(`Erro ao inicializar ${filename}:`, error);
        throw error;
    }
}

/**
 * Inicializa o arquivo de configuração do Modo Dev
 */
async function initializeDevModeConfig() {
    const defaultConfig = {
        isDevMode: false,
        lastChanged: null
    };
    
    return await createJsonFileIfNotExists('devMode.json', defaultConfig);
}

/**
 * Inicializa o arquivo de cidades (se você quiser padronizar)
 */
async function initializeCitiesConfig() {
    const defaultCities = [
        { name: "São Paulo", active: true },
        { name: "Rio de Janeiro", active: true },
        { name: "Belo Horizonte", active: true }
    ];
    
    return await createJsonFileIfNotExists('cities.json', defaultCities);
}

/**
 * Inicializa o arquivo de grupos (exemplo)
 */
async function initializeGroupsConfig() {
    const defaultGroups = {
        mode: "SINGLE",
        groups: []
    };
    
    return await createJsonFileIfNotExists('groups.json', defaultGroups);
}

/**
 * Inicializa o arquivo de mensagens (exemplo)
 */
async function initializeMessagesConfig() {
    const defaultMessages = {
        lastMessage: null,
        messages: []
    };
    
    return await createJsonFileIfNotExists('messages.json', defaultMessages);
}

/**
 * Inicializa o arquivo de indicadores (exemplo)
 */
async function initializeIndicadoresConfig() {
    const defaultIndicadores = {
        atendidos: 0,
        interessados: 0,
        conversoes: 0,
        lastReset: null
    };
    
    return await createJsonFileIfNotExists('indicadores.json', defaultIndicadores);
}

/**
 * Inicializa todos os arquivos necessários do sistema
 */
async function initializeAllConfigs() {
    try {
        console.log('🚀 Inicializando configurações do sistema...');
        
        await ensureDataDirectory();
        
        const results = await Promise.allSettled([
            initializeDevModeConfig(),
            initializeCitiesConfig(),
            initializeGroupsConfig(),
            initializeMessagesConfig(),
            initializeIndicadoresConfig()
        ]);
        
        const successCount = results.filter(r => r.status === 'fulfilled').length;
        const errorCount = results.filter(r => r.status === 'rejected').length;
        
        console.log(`✅ Inicialização concluída: ${successCount} sucessos, ${errorCount} erros`);
        
        if (errorCount > 0) {
            console.log('❌ Erros encontrados:');
            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    console.log(`   - Arquivo ${index}: ${result.reason.message}`);
                }
            });
        }
        
        return { success: successCount, errors: errorCount };
        
    } catch (error) {
        console.error('❌ Erro crítico na inicialização:', error);
        throw error;
    }
}

/**
 * Utilitário para ler arquivo JSON com fallback
 */
async function readJsonFile(filename, fallbackContent = {}) {
    try {
        const filePath = path.join(DATA_DIR, filename);
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.warn(`Aviso: Erro ao ler ${filename}, usando fallback:`, error.message);
        return fallbackContent;
    }
}

/**
 * Utilitário para salvar arquivo JSON
 */
async function saveJsonFile(filename, content) {
    try {
        await ensureDataDirectory();
        const filePath = path.join(DATA_DIR, filename);
        await fs.writeFile(filePath, JSON.stringify(content, null, 2));
        return true;
    } catch (error) {
        console.error(`Erro ao salvar ${filename}:`, error);
        return false;
    }
}

module.exports = {
    ensureDataDirectory,
    createJsonFileIfNotExists,
    initializeDevModeConfig,
    initializeCitiesConfig,
    initializeGroupsConfig,
    initializeMessagesConfig,
    initializeIndicadoresConfig,
    initializeAllConfigs,
    readJsonFile,
    saveJsonFile,
    DATA_DIR
};