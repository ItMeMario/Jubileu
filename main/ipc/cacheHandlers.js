const fs = require('fs').promises;
const path = require('path');
const pathHelper = require('../../utils/pathHelper');
const { instanceManager } = require('../../services/instanceManager');

class CacheHandlers {
    async clearCache() {
        try {
            const authPath = path.resolve(process.cwd(), '.wwebjs_auth');
            const cachePath = path.resolve(process.cwd(), '.wwebjs_cache');
            const deeJayAuthPath = path.resolve(process.cwd(), '.wwebjs_auth_deejay');
            const crmAuthPath = path.resolve(process.cwd(), '.wwebjs_auth_crm');

            // 1. Parar todas as instâncias (Main + Dee Jay + CRM)
            console.log('Parando todas as instâncias...');
            await instanceManager.stopAll();
            
            // Stop and Remove Dee Jay Instances
            try {
                const deeJayService = require('../../services/deeJayService');
                deeJayService.stopLoop();
                const djInstances = deeJayService.getInstances();
                for (const dj of djInstances) {
                    await deeJayService.removeInstance(dj.instanceId);
                    console.log(`Instância Dee Jay removida: ${dj.instanceId}`);
                }
            } catch (e) {
                console.error("Erro ao remover Dee Jay instances:", e);
            }

            // Stop and Remove CRM Instances
            try {
                const crmService = require('../../services/crmService');
                const crmInstances = crmService.getInstances();
                for (const crm of crmInstances) {
                    await crmService.removeInstance(crm.instanceId);
                    console.log(`Instância CRM removida: ${crm.instanceId}`);
                }
            } catch (e) {
                console.error("Erro ao remover CRM instances:", e);
            }

            // 2. Listar e remover todas as instâncias do banco
            console.log('Removendo registros de instâncias...');
            const instances = await instanceManager.listInstances();
            for (const instance of instances) {
                try {
                    await instanceManager.removeInstance(instance.instance_id);
                    console.log(`Instância removida: ${instance.instance_id}`);
                } catch (err) {
                    console.error(`Erro ao remover instância ${instance.instance_id}:`, err);
                }
            }

            const results = {
                auth: false,
                cache: false,
                deeJay: false,
                crm: false,
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

            // Remove .wwebjs_auth_deejay
            try {
                await fs.rm(deeJayAuthPath, { recursive: true, force: true });
                results.deeJay = true;
            } catch (err) {
                console.error(`Erro ao remover .wwebjs_auth_deejay: ${err.message}`);
            }

            // Remove .wwebjs_auth_crm
            try {
                await fs.rm(crmAuthPath, { recursive: true, force: true });
                results.crm = true;
            } catch (err) {
                console.error(`Erro ao remover .wwebjs_auth_crm: ${err.message}`);
            }

            if (results.auth || results.cache || results.deeJay || results.crm) {
                console.log('Cache limpo com sucesso');
                return { success: true, message: 'Cache e sessões (WhatsApp, Dee Jay e CRM) limpos com sucesso! Reinicie o aplicativo para efetivar as mudanças.' };
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
