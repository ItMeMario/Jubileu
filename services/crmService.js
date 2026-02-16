// services/crmService.js
const { Client, LocalAuth } = require("whatsapp-web.js");
const path = require("path");
const fs = require("fs").promises;
const { debug } = require("./debugService");
const browserHelper = require("../utils/browserHelper");
const {
    getAllCrmInstances,
    updateCrmInstanceStatus,
    CRM_STATUS,
    deleteCrmInstance,
    createCrmInstance,
    resetAllCrmInstancesStatus
} = require("../config/initializeModules/crmIM");
const MessageType = require("../config/messageType");
const { smartDelay } = require("../utils/delay");
const { getMessage } = require("../utils/messageReader");
const { sendMessageOptions } = require("../config/compatibility/whatsappCompatibility");

class CrmService {
    constructor() {
        this.clients = new Map(); // instanceId -> { client, status, ... }
        this.eventCallbacks = new Map();
    }

    on(event, callback) {
        if (!this.eventCallbacks.has(event)) {
            this.eventCallbacks.set(event, []);
        }
        this.eventCallbacks.get(event).push(callback);
    }

    emit(event, data) {
        const callbacks = this.eventCallbacks.get(event) || [];
        callbacks.forEach(callback => {
            try { callback(data); } catch (e) { console.error(e); }
        });
    }

    getBaseSessionPath() {
        return path.join(__dirname, "../.wwebjs_auth_crm");
    }

    async initialize() {
        // Reset valid session status on startup
        try {
            await resetAllCrmInstancesStatus();
        } catch (error) {
            console.error("Erro ao resetar status das instâncias CRM:", error);
        }

        // Load instances from DB
        const instances = await getAllCrmInstances();
        for (const inst of instances) {
            this.clients.set(inst.instance_id, {
                status: CRM_STATUS.DISCONNECTED,
                name: inst.name,
                qrCode: null,
                client: null
            });
        }
    }

    async createInstance(name) {
        const instance = await createCrmInstance(name);
        this.clients.set(instance.instance_id, {
            status: CRM_STATUS.DISCONNECTED,
            name: instance.name,
            qrCode: null,
            client: null
        });
        return instance;
    }

    async removeInstance(instanceId) {
        await this.stopInstance(instanceId);
        await deleteCrmInstance(instanceId);
        this.clients.delete(instanceId);
        
        // Clean session
        try {
            const sessionPath = path.join(this.getBaseSessionPath(), "session-" + instanceId);
            await fs.rm(sessionPath, { recursive: true, force: true }).catch(() => {});
        } catch (e) { console.error(e); }
        return true;
    }

    async startInstance(instanceId) {
        if (this.clients.get(instanceId)?.client) {
            await debug(`CRM: Instância ${instanceId} já está iniciada.`);
            return;
        }

        await debug(`CRM: Iniciando instância ${instanceId}...`);

        const executablePath = browserHelper.getChromeExecutablePath();

        const client = new Client({
            authStrategy: new LocalAuth({
                clientId: instanceId,
                dataPath: this.getBaseSessionPath(),
            }),
            puppeteer: {
                executablePath: executablePath,
                headless: true,
                args: [
                    '--no-sandbox', 
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            }
        });

        const instanceData = this.clients.get(instanceId) || {};
        instanceData.client = client;
        instanceData.status = CRM_STATUS.CONNECTING;
        this.clients.set(instanceId, instanceData);
        
        try {
            await updateCrmInstanceStatus(instanceId, CRM_STATUS.CONNECTING);

            client.on('qr', (qr) => {
                debug(`CRM: QR Code recebido para ${instanceId}`);
                instanceData.qrCode = qr;
                instanceData.status = "qr_pending"; // Matching generic status or need to add to enum? Used string literal in deeJay
                this.emit('instance-update', { instanceId, status: "qr_pending", qr });
            });

            client.on('ready', async () => {
                instanceData.status = CRM_STATUS.CONNECTED;
                instanceData.qrCode = null;
                const phoneNumber = client.info.wid.user;
                console.log(`CRM conectado: ${phoneNumber} (${instanceId})`);
                await updateCrmInstanceStatus(instanceId, CRM_STATUS.CONNECTED); // Assuming update accepts phone number? checked crmIM.js, it doesn't seem to take phoneNumber yet. Will check.
                this.emit('instance-update', { instanceId, status: instanceData.status });
            });
            
            client.on('authenticated', () => {
                 debug(`CRM: Autenticado ${instanceId}`);
                 instanceData.status = CRM_STATUS.CONNECTING;
                 instanceData.qrCode = null;
                 this.emit('instance-update', { instanceId, status: 'authenticated' });
            });

            client.on('auth_failure', async (msg) => {
                console.error(`CRM: Falha de autenticação para ${instanceId}: ${msg}`);
                instanceData.status = CRM_STATUS.AUTH_FAILURE;
                await updateCrmInstanceStatus(instanceId, CRM_STATUS.AUTH_FAILURE);
                this.emit('instance-update', { instanceId, status: CRM_STATUS.AUTH_FAILURE });
            });

            client.on('disconnected', async (reason) => {
                console.log(`CRM: Desconectado ${instanceId} (Razão: ${reason})`);
                instanceData.status = CRM_STATUS.DISCONNECTED;
                instanceData.client = null;
                await updateCrmInstanceStatus(instanceId, CRM_STATUS.DISCONNECTED);
                this.emit('instance-update', { instanceId, status: CRM_STATUS.DISCONNECTED });
            });

            client.on('message', async (msg) => {
                if (msg.fromMe) return;

                try {
                    await debug(`CRM: Mensagem recebida de ${msg.from} em ${instanceId}. Aguardando delay...`);
                    // Usando smartDelay conforme solicitado (padrão 1-3 min se não passar args, ou configurável se necessario)
                    // Para um "welcome" talvez fosse melhor menos tempo, mas vou respeitar o "usar do delay.js" genérico
                    // Se precisar de algo mais rápido, podemos passar { minMs: 2000, maxMs: 10000 }
                    await smartDelay(); 

                    const welcomeMessage = await getMessage(MessageType.CRM_WELCOME);
                    
                    if (welcomeMessage) {
                        await client.sendMessage(msg.from, welcomeMessage, sendMessageOptions);
                        await debug(`CRM: Auto-resposta enviada para ${msg.from} em ${instanceId}`);

                        // Aguarda novamente e envia CRM_TIPS
                        await smartDelay();
                        const tipsMessage = await getMessage(MessageType.CRM_TIPS);

                        if (tipsMessage) {
                            await client.sendMessage(msg.from, tipsMessage, sendMessageOptions);
                            await debug(`CRM: Dicas enviadas para ${msg.from} em ${instanceId}`);
                        } else {
                            console.warn(`CRM: Mensagem ${MessageType.CRM_TIPS} não encontrada ou vazia.`);
                        }
                    } else {
                        console.warn(`CRM: Mensagem ${MessageType.CRM_WELCOME} não encontrada ou vazia.`);
                    }
                } catch (error) {
                    console.error(`CRM: Erro ao enviar auto-resposta para ${msg.from}:`, error);
                }
            });

            await client.initialize();
            await debug(`CRM: Cliente inicializado para ${instanceId}`);
            
        } catch (e) {
            console.error(`CRM: ERRO FATAL ao iniciar instância ${instanceId}:`, e);
            const data = this.clients.get(instanceId);
            if (data) {
                data.client = null;
                data.status = CRM_STATUS.DISCONNECTED;
            }
            await updateCrmInstanceStatus(instanceId, CRM_STATUS.DISCONNECTED);
            this.emit('instance-update', { instanceId, status: CRM_STATUS.DISCONNECTED, error: e.message });
            throw e;
        }
    }

    async stopInstance(instanceId) {
        const data = this.clients.get(instanceId);
        if (data && data.client) {
            try {
                await data.client.destroy();
            } catch(e) {}
            data.client = null;
            data.status = CRM_STATUS.DISCONNECTED;
            await updateCrmInstanceStatus(instanceId, CRM_STATUS.DISCONNECTED);
            this.emit('instance-update', { instanceId, status: CRM_STATUS.DISCONNECTED });
        }
    }

    getInstances() {
        const list = [];
        this.clients.forEach((val, key) => {
            list.push({
                instanceId: key,
                name: val.name,
                status: val.status,
                qrCode: val.qrCode
            });
        });
        return list;
    }
}

const crmService = new CrmService();
module.exports = crmService;
