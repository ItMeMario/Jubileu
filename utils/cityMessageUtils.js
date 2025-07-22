const fs = require('fs');
const path = require('path');

const baseFolder = path.join(__dirname, '../data/citiesMessageTxt'); // Corrigido nome da pasta

function ensureCityMessageFolder() {
    try {
        if (!fs.existsSync(baseFolder)) {
            fs.mkdirSync(baseFolder, { recursive: true });
            console.log(`📁 Pasta citiesMessageTxt criada: ${baseFolder}`);
        }
        return true;
    } catch (error) {
        console.error(`❌ Erro ao criar pasta citiesMessageTxt:`, error);
        throw error;
    }
}

function getMessageFilePath(cityId) {
    return path.join(baseFolder, `${cityId}.txt`);
}

async function saveCityMessage(cityId, message) {
    try {
        if (!cityId) {
            throw new Error('ID da cidade é obrigatório');
        }

        ensureCityMessageFolder();
        const filePath = getMessageFilePath(cityId);
        const messageToSave = message || '';
        
        await fs.promises.writeFile(filePath, messageToSave, 'utf8');
        
        if (messageToSave) {
            console.log(`💾 Mensagem da cidade ${cityId} salva (${messageToSave.length} caracteres)`);
        } else {
            console.log(`🗑️ Mensagem da cidade ${cityId} limpa`);
        }
        
        return true;
    } catch (error) {
        console.error(`❌ Erro ao salvar mensagem da cidade ${cityId}:`, error.message);
        throw error;
    }
}

async function loadCityMessage(cityId) {
    try {
        if (!cityId) {
            return '';
        }

        const filePath = getMessageFilePath(cityId);
        
        if (fs.existsSync(filePath)) {
            const message = await fs.promises.readFile(filePath, 'utf8');
            return message;
        }
        
        return '';
    } catch (error) {
        console.error(`❌ Erro ao carregar mensagem da cidade ${cityId}:`, error.message);
        return '';
    }
}

async function deleteCityMessage(cityId) {
    try {
        if (!cityId) {
            console.log('⚠️ ID da cidade não fornecido para exclusão da mensagem');
            return false;
        }

        const filePath = getMessageFilePath(cityId);
        
        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
            console.log(`🗑️ Arquivo de mensagem da cidade ${cityId} removido`);
            return true;
        } else {
            console.log(`ℹ️ Arquivo de mensagem da cidade ${cityId} não existe`);
            return false;
        }
    } catch (error) {
        console.error(`❌ Erro ao deletar mensagem da cidade ${cityId}:`, error.message);
        throw error;
    }
}

async function listAllMessageFiles() {
    try {
        ensureCityMessageFolder();
        const files = await fs.promises.readdir(baseFolder);
        const txtFiles = files.filter(file => file.endsWith('.txt'));
        
        console.log(`📋 Encontrados ${txtFiles.length} arquivos de mensagem`);
        return txtFiles;
    } catch (error) {
        console.error('❌ Erro ao listar arquivos de mensagem:', error.message);
        return [];
    }
}

function messageFileExists(cityId) {
    try {
        if (!cityId) return false;
        const filePath = getMessageFilePath(cityId);
        return fs.existsSync(filePath);
    } catch (error) {
        console.error(`❌ Erro ao verificar existência do arquivo da cidade ${cityId}:`, error.message);
        return false;
    }
}

async function getMessageFileInfo(cityId) {
    try {
        if (!cityId) return null;
        
        const filePath = getMessageFilePath(cityId);
        
        if (!fs.existsSync(filePath)) {
            return null;
        }
        
        const stats = await fs.promises.stat(filePath);
        const content = await loadCityMessage(cityId);
        
        return {
            cityId,
            filePath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            contentLength: content.length,
            hasContent: content.length > 0
        };
    } catch (error) {
        console.error(`❌ Erro ao obter informações do arquivo da cidade ${cityId}:`, error.message);
        return null;
    }
}

// Função utilitária para limpeza de arquivos órfãos
async function cleanupOrphanedMessageFiles(validCityIds) {
    try {
        const messageFiles = await listAllMessageFiles();
        const orphanedFiles = [];
        
        for (const file of messageFiles) {
            const cityId = path.basename(file, '.txt');
            if (!validCityIds.includes(cityId)) {
                orphanedFiles.push({
                    cityId,
                    filePath: getMessageFilePath(cityId)
                });
            }
        }
        
        if (orphanedFiles.length > 0) {
            console.log(`🧹 Encontrados ${orphanedFiles.length} arquivos órfãos de mensagem`);
            for (const orphaned of orphanedFiles) {
                await fs.promises.unlink(orphaned.filePath);
                console.log(`🗑️ Arquivo órfão removido: ${orphaned.cityId}.txt`);
            }
        }
        
        return orphanedFiles.length;
    } catch (error) {
        console.error('❌ Erro na limpeza de arquivos órfãos:', error.message);
        throw error;
    }
}

module.exports = {
    saveCityMessage,
    loadCityMessage,
    deleteCityMessage,
    listAllMessageFiles,
    messageFileExists,
    ensureCityMessageFolder,
    getMessageFilePath,
    getMessageFileInfo,
    cleanupOrphanedMessageFiles
};