const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');

async function ensureDataDirectory() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        console.log(`✅ Pasta data criada/verificada: ${DATA_DIR}`);
    } catch (error) {
        console.error('Erro ao criar diretório data:', error);
        throw error;
    }
}

async function ensureCityMessageTxtFolder() {
    const folderPath = path.join(DATA_DIR, 'cityMessageTxt');
    try {
        await fs.mkdir(folderPath, { recursive: true });
        console.log(`✅ Pasta cityMessageTxt criada/verificada: ${folderPath}`);
        return folderPath;
    } catch (error) {
        console.error('Erro ao criar pasta cityMessageTxt:', error);
        throw error;
    }
}

// Funções adicionadas para corrigir o erro do messageService
async function readJsonFile(filename, defaultValue = null) {
    await ensureDataDirectory();
    const filePath = path.join(DATA_DIR, filename);
    
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // Arquivo não existe, retorna valor padrão
            return defaultValue;
        }
        console.error(`Erro ao ler ${filename}:`, error);
        throw error;
    }
}

async function saveJsonFile(filename, data) {
    await ensureDataDirectory();
    const filePath = path.join(DATA_DIR, filename);
    
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`Erro ao salvar ${filename}:`, error);
        return false;
    }
}

async function createJsonFileIfNotExists(filename, defaultContent) {
    await ensureDataDirectory();
    const filePath = path.join(DATA_DIR, filename);

    try {
        await fs.access(filePath); // Verifica se já existe
        console.log(`✅ Arquivo ${filename} já existe em ${DATA_DIR}`);
        return filePath;
    } catch (err) {
        if (err.code === 'ENOENT') {
            await fs.writeFile(filePath, JSON.stringify(defaultContent, null, 2), 'utf8');
            console.log(`✅ Arquivo ${filename} criado em ${DATA_DIR}`);
            return filePath;
        }
        throw err;
    }
}

async function initializeDevModeConfig() {
    const defaultConfig = { isDevMode: false, lastChanged: null };
    return await createJsonFileIfNotExists('devMode.json', defaultConfig);
}

async function initializeCitiesConfig() {
    const defaultCities = [];
    return await createJsonFileIfNotExists('cities.json', defaultCities);
}

async function initializeGroupsConfig() {
    const defaultGroups = { mode: "SINGLE", groups: [] };
    return await createJsonFileIfNotExists('groups.json', defaultGroups);
}

async function initializeMessagesConfig() {
    const defaultMessages = [];
    return await createJsonFileIfNotExists('messages.json', defaultMessages);
}

async function initializeIndicadoresConfig() {
    const defaultIndicadores = {
        atendidos: 0,
        interessados: 0,
        conversoes: 0,
        lastReset: null
    };
    return await createJsonFileIfNotExists('indicadores.json', defaultIndicadores);
}

async function initializeAllConfigs() {
    console.log('🚀 Inicializando arquivos e pastas do sistema...\n');

    const results = await Promise.allSettled([
        initializeDevModeConfig(),
        initializeCitiesConfig(),
        initializeGroupsConfig(),
        initializeMessagesConfig(),
        initializeIndicadoresConfig(),
        ensureCityMessageTxtFolder() // Garantir que esta função seja chamada
    ]);

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const errorCount = results.filter(r => r.status === 'rejected').length;

    console.log(`✅ Inicialização concluída: ${successCount} sucesso(s), ${errorCount} erro(s)\n`);
    
    if (errorCount > 0) {
        console.log('❌ Detalhes dos erros:');
        results.forEach((r, i) => {
            if (r.status === 'rejected') {
                const functionNames = [
                    'initializeDevModeConfig',
                    'initializeCitiesConfig', 
                    'initializeGroupsConfig',
                    'initializeMessagesConfig',
                    'initializeIndicadoresConfig',
                    'ensureCityMessageTxtFolder'
                ];
                console.error(`   ${functionNames[i]}: ${r.reason.message}`);
            }
        });
        console.log('');
    }

    return { success: successCount, errors: errorCount };
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
    ensureCityMessageTxtFolder,
    DATA_DIR,
    readJsonFile,
    saveJsonFile
};