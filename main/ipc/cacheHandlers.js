const fs = require('fs').promises;
const path = require('path');
const pathHelper = require('../../utils/pathHelper');
const { instanceManager } = require('../../services/instanceManager');

class CacheHandlers {
    register(ipcMain) {
        ipcMain.handle("clear-cache", this.clearCache.bind(this));
    }

    unregister(ipcMain) {
        ipcMain.removeHandler("clear-cache");
    }

    async clearCache() {
        try {
            // Detecta se está empacotado para usar os caminhos corretos
            const { app } = require("electron");
            const isPackaged = app && app.isPackaged;
            const userDataPath = isPackaged ? app.getPath("userData") : null;

            const authPath = isPackaged
                ? path.join(userDataPath, "whatsapp-sessions")
                : path.resolve(process.cwd(), '.wwebjs_auth');
            const cachePath = isPackaged
                ? path.join(userDataPath, "wwebjs-cache")
                : path.resolve(process.cwd(), '.wwebjs_cache');
            const deeJayAuthPath = isPackaged
                ? path.join(userDataPath, "whatsapp-sessions-deejay")
                : path.resolve(process.cwd(), '.wwebjs_auth_deejay');
            const crmAuthPath = isPackaged
                ? path.join(userDataPath, "whatsapp-sessions-crm")
                : path.resolve(process.cwd(), '.wwebjs_auth_crm');
            const droneAuthPath = isPackaged
                ? path.join(userDataPath, "whatsapp-sessions-drone")
                : path.resolve(process.cwd(), '.wwebjs_auth_drone');

            // 1. Parar todas as instâncias (Main + Dee Jay + CRM + Drone)
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

            // Stop and Remove Drone Instances
            try {
                const { droneInstanceManager } = require('../../services/droneServiceModules/droneInstanceManagerDSM');
                await droneInstanceManager.stopAll();
                const droneInstances = await droneInstanceManager.listInstances();
                for (const drone of droneInstances) {
                    await droneInstanceManager.removeInstance(drone.instance_id);
                    console.log(`Instância Drone removida: ${drone.instance_id}`);
                }
            } catch (e) {
                console.error("Erro ao remover Drone instances:", e);
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
                drone: false,
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

            // Remove .wwebjs_auth_drone
            try {
                await fs.rm(droneAuthPath, { recursive: true, force: true });
                results.drone = true;
            } catch (err) {
                console.error(`Erro ao remover .wwebjs_auth_drone: ${err.message}`);
            }

            if (results.auth || results.cache || results.deeJay || results.crm || results.drone) {
                console.log('Cache limpo com sucesso');
                return { success: true, message: 'Cache e sessões (WhatsApp, Dee Jay, CRM e Drone) limpos com sucesso! Reinicie o aplicativo para efetivar as mudanças.' };
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
