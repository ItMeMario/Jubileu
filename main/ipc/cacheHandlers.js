const fs = require('fs').promises;
const path = require('path');
const pathHelper = require('../../utils/pathHelper');

class CacheHandlers {
    async clearCache() {
        try {
            const authPath = path.resolve(process.cwd(), '.wwebjs_auth');
            const cachePath = path.resolve(process.cwd(), '.wwebjs_cache');

            const results = {
                auth: false,
                cache: false,
                message: ''
            };

            // Remove .wwebjs_auth
            try {
                await fs.rm(authPath, { recursive: true, force: true });
                results.auth = true;
            } catch (err) {
                console.error(`Erro ao remover .wwebjs_auth: ${err.message}`);
            }

            // Remove .wwebjs_cache
            try {
                await fs.rm(cachePath, { recursive: true, force: true });
                results.cache = true;
            } catch (err) {
                console.error(`Erro ao remover .wwebjs_cache: ${err.message}`);
            }

            if (results.auth || results.cache) {
                console.log('Cache limpo com sucesso');
                return { success: true, message: 'Cache e sessão limpos com sucesso! Reinicie o aplicativo para efetivar as mudanças.' };
            } else {
                return { success: false, message: 'Não foi possível limpar o cache ou ele já estava vazio.' };
            }

        } catch (error) {
            console.error('Erro fatal ao limpar cache:', error);
            return { success: false, message: `Erro ao limpar cache: ${error.message}` };
        }
    }
}

module.exports = CacheHandlers;
