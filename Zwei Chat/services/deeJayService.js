// services/deeJayService.js
const { Client, LocalAuth } = require("whatsapp-web.js");
const path = require("path");
const fs = require("fs").promises;
const { debug } = require("./debugService");
const pathHelper = require("../utils/pathHelper");

// Shared modules
const { SERVICE_STATUS } = require("./servicesModules/constants");
const { getChromeExecutablePath } = require("./servicesModules/chromePath");

// Dee Jay modules
const deeJayDb = require("./deeJayServiceModules/deeJayDb");
const deeJayConfig = require("./deeJayServiceModules/deeJayConfig");
const deeJayLoop = require("./deeJayServiceModules/deeJayLoop");

const DEE_JAY_STATUS = SERVICE_STATUS;

class DeeJayService {
    constructor() {
        this.clients = new Map(); // instanceId -> { client, status, name, qrCode }
        this.isRunning = false;
        this.config = {
            minIntervalMinutes: 1,
            maxIntervalMinutes: 5,
            active: false,
            linkBotPrincipal: false,
            linkDrone: false
        };
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
        return pathHelper.getUserDataPath("whatsapp-sessions-deejay");
    }

    getConfigPath() {
        return path.join(pathHelper.getUserDataPath(), "deeJayConfig.json");
    }

    async initialize() {
        // Carrega configurações salvas
        await this.loadConfig();

        // Sempre reseta o estado 'active' do loop para false ao inicializar a aplicação
        if (this.config.active) {
            this.config.active = false;
            await this.saveConfig();
        }

        // Reseta status de instâncias presas no banco (devido a fechamento abrupto)
        try {
            await this.dbResetAllDeeJayInstancesStatus();
        } catch (error) {
            console.error("Erro ao resetar status das instâncias Dee Jay:", error);
        }

        // Carrega instâncias cadastradas no banco para a memória
        try {
            const instances = await this.dbGetAllDeeJayInstances();
            for (const inst of instances) {
                this.clients.set(inst.id, {
                    status: SERVICE_STATUS.DISCONNECTED,
                    name: inst.name,
                    qrCode: null,
                    client: null
                });
            }
        } catch (error) {
            console.error("Erro ao carregar instâncias Dee Jay do banco:", error);
        }
    }

    async loadConfig() {
        const configPath = this.getConfigPath();
        this.config = await deeJayConfig.loadConfig(configPath, this.config);
    }

    async saveConfig() {
        const configPath = this.getConfigPath();
        await deeJayConfig.saveConfig(configPath, this.config);
    }

    async createInstance(name) {
        const instanceId = `dj-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        await deeJayDb.dbInsertDeeJayInstance(instanceId, name, SERVICE_STATUS.DISCONNECTED);

        this.clients.set(instanceId, {
            status: SERVICE_STATUS.DISCONNECTED,
            name: name,
            qrCode: null,
            client: null
        });

        return { instanceId, name, status: SERVICE_STATUS.DISCONNECTED };
    }

    async removeInstance(instanceId) {
        await this.stopInstance(instanceId);
        await deeJayDb.dbDeleteDeeJayInstance(instanceId);

        this.clients.delete(instanceId);

        // Limpa o diretório da sessão
        try {
            const sessionPath = path.join(this.getBaseSessionPath(), "session-" + instanceId);
            await fs.rm(sessionPath, { recursive: true, force: true }).catch(() => {});
        } catch (e) { 
            console.error("Erro ao remover diretório de sessão do Dee Jay:", e); 
        }

        return true;
    }

    async startInstance(instanceId) {
        const instanceData = this.clients.get(instanceId);
        if (!instanceData) {
            throw new Error("Instância não encontrada na memória.");
        }

        if (instanceData.client) {
            await debug(`Dee Jay: Instância ${instanceId} já está rodando.`);
            return;
        }

        await debug(`Dee Jay: Iniciando cliente para ${instanceId}...`);

        const executablePath = getChromeExecutablePath();
        const client = new Client({
            authStrategy: new LocalAuth({
                clientId: instanceId,
                dataPath: this.getBaseSessionPath(),
            }),
            puppeteer: {
                executablePath: executablePath,
                headless: true,
                args: [
                    '--window-position=-10000,-10000',
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

        instanceData.client = client;
        instanceData.status = SERVICE_STATUS.CONNECTING;
        this.clients.set(instanceId, instanceData);

        try {
            await this.dbUpdateDeeJayInstanceStatus(instanceId, SERVICE_STATUS.CONNECTING);
            this.emit('instance-update', { instanceId, status: SERVICE_STATUS.CONNECTING });

            client.on('qr', (qr) => {
                debug(`Dee Jay: QR Code recebido para ${instanceId}`);
                instanceData.qrCode = qr;
                instanceData.status = SERVICE_STATUS.QR_PENDING;
                this.emit('instance-update', { instanceId, status: instanceData.status, qr });
            });

            client.on('ready', async () => {
                instanceData.status = SERVICE_STATUS.CONNECTED;
                instanceData.qrCode = null;
                const phoneNumber = client.info.wid.user;
                console.log(`Dee Jay conectado: ${phoneNumber} (${instanceId})`);
                await this.dbUpdateDeeJayInstanceStatus(instanceId, SERVICE_STATUS.CONNECTED, phoneNumber);
                this.emit('instance-update', { instanceId, status: instanceData.status });
            });

            client.on('authenticated', () => {
                debug(`Dee Jay: Autenticado ${instanceId}`);
                instanceData.status = SERVICE_STATUS.CONNECTING;
                instanceData.qrCode = null;
                this.emit('instance-update', { instanceId, status: 'authenticated' });
            });

            client.on('auth_failure', async (msg) => {
                console.error(`Dee Jay: Falha de autenticação para ${instanceId}: ${msg}`);
                instanceData.status = SERVICE_STATUS.AUTH_FAILURE;
                await this.dbUpdateDeeJayInstanceStatus(instanceId, SERVICE_STATUS.AUTH_FAILURE);
                this.emit('instance-update', { instanceId, status: SERVICE_STATUS.AUTH_FAILURE });
            });

            client.on('disconnected', async (reason) => {
                console.log(`Dee Jay: Desconectado ${instanceId} (Razão: ${reason})`);
                instanceData.status = SERVICE_STATUS.DISCONNECTED;
                instanceData.client = null;
                instanceData.qrCode = null;
                await this.dbUpdateDeeJayInstanceStatus(instanceId, SERVICE_STATUS.DISCONNECTED);
                this.emit('instance-update', { instanceId, status: SERVICE_STATUS.DISCONNECTED });
            });

            await client.initialize();
            await debug(`Dee Jay: Cliente inicializado com sucesso para ${instanceId}`);

        } catch (e) {
            console.error(`Dee Jay: ERRO ao iniciar instância ${instanceId}:`, e);
            instanceData.client = null;
            instanceData.status = SERVICE_STATUS.DISCONNECTED;
            instanceData.qrCode = null;
            await this.dbUpdateDeeJayInstanceStatus(instanceId, SERVICE_STATUS.DISCONNECTED);
            this.emit('instance-update', { instanceId, status: SERVICE_STATUS.DISCONNECTED, error: e.message });
            throw e;
        }
    }

    async stopInstance(instanceId) {
        const data = this.clients.get(instanceId);
        if (data && data.client) {
            const { safeDestroyClient } = require("../utils/processCleanup");
            await safeDestroyClient(data.client, `DeeJay ${instanceId}`);
            data.client = null;
            data.status = SERVICE_STATUS.DISCONNECTED;
            data.qrCode = null;
            try {
                await this.dbUpdateDeeJayInstanceStatus(instanceId, SERVICE_STATUS.DISCONNECTED);
            } catch (e) {
                console.error(`Dee Jay: Erro ao atualizar status de ${instanceId} no banco:`, e.message);
            }
            this.emit('instance-update', { instanceId, status: SERVICE_STATUS.DISCONNECTED });
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

    // --- Métodos de Banco de Dados Locais ---

    dbGetAllDeeJayInstances() {
        return deeJayDb.dbGetAllDeeJayInstances();
    }

    dbUpdateDeeJayInstanceStatus(instanceId, status, phoneNumber = null) {
        return deeJayDb.dbUpdateDeeJayInstanceStatus(instanceId, status, phoneNumber);
    }

    dbResetAllDeeJayInstancesStatus() {
        return deeJayDb.dbResetAllDeeJayInstancesStatus();
    }

    getRandomDeeJayMessage() {
        return deeJayDb.getRandomDeeJayMessage();
    }

    dbGetDeeJayMessages() {
        return deeJayDb.dbGetDeeJayMessages();
    }

    dbAddDeeJayMessage(content) {
        return deeJayDb.dbAddDeeJayMessage(content);
    }

    dbDeleteDeeJayMessage(id) {
        return deeJayDb.dbDeleteDeeJayMessage(id);
    }

    // --- Lógica de Conversação e Loop ---

    async startLoop() {
        return deeJayLoop.startLoop(this);
    }

    async stopLoop() {
        return deeJayLoop.stopLoop(this);
    }

    getConnectedInstances() {
        return deeJayLoop.getConnectedInstances(this);
    }

    getConnectedCount() {
        return deeJayLoop.getConnectedInstances(this).length;
    }

    async setConfig(config) {
        this.config = { ...this.config, ...config };
        await this.saveConfig();
    }
    
    getConfig() {
        return this.config;
    }

    async runConversationLoop() {
        return deeJayLoop.runConversationLoop(this);
    }

    async sendSingleMessage(from, to) {
        return deeJayLoop.sendSingleMessage(this, from, to);
    }

    async stopAll() {
        console.log("🛑 Dee Jay: Parando todas as instâncias...");
        await this.stopLoop();

        const instanceIds = Array.from(this.clients.keys());
        for (const instanceId of instanceIds) {
            try {
                await this.stopInstance(instanceId);
            } catch (error) {
                console.error(`Erro ao parar instância Dee Jay ${instanceId}:`, error.message);
            }
        }
        console.log("✅ Dee Jay: Todas as instâncias paradas.");
    }
}

const deeJayService = new DeeJayService();
module.exports = deeJayService;
