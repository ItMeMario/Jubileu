// services/droneService.js
const { Client, LocalAuth } = require("whatsapp-web.js");
const path = require("path");
const fs = require("fs").promises;
const { debug } = require("./debugService");
const pathHelper = require("../utils/pathHelper");

// Shared modules
const { SERVICE_STATUS } = require("./servicesModules/constants");
const { getChromeExecutablePath } = require("./servicesModules/chromePath");

// Drone modules
const { aplicarTransformacoes } = require("./droneServiceModules/numberTransformer");
const droneDb = require("./droneServiceModules/droneDb");
const droneConfig = require("./droneServiceModules/droneConfig");
const droneDispatch = require("./droneServiceModules/droneDispatch");

const DRONE_STATUS = SERVICE_STATUS;

class DroneService {
    constructor() {
        this.clients = new Map(); // instanceId -> { client, status, name, qrCode }
        this.isDispatching = false;
        this.dispatchProgress = { total: 0, current: 0, sent: 0, failed: 0 };
        this.config = {
            minIntervalSeconds: 5,
            maxIntervalSeconds: 15,
            batchSize: 200,
            add9thDigit: false,
            addDDD: false,
            defaultDDD: "",
            addCountryPrefix: false,
            defaultCountryPrefix: "55"
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
        return pathHelper.getUserDataPath("whatsapp-sessions-drone");
    }

    getConfigPath() {
        return path.join(pathHelper.getUserDataPath(), "droneConfig.json");
    }

    async initialize() {
        // Carrega configurações salvas
        await this.loadConfig();

        // Reseta status de instâncias presas no banco
        try {
            await this.dbResetAllDroneInstancesStatus();
        } catch (error) {
            console.error("Erro ao resetar status das instâncias Drone:", error);
        }

        // Carrega instâncias cadastradas no banco para a memória
        try {
            const instances = await this.dbGetAllDroneInstances();
            for (const inst of instances) {
                this.clients.set(inst.id, {
                    status: SERVICE_STATUS.DISCONNECTED,
                    name: inst.name,
                    qrCode: null,
                    client: null
                });
            }
        } catch (error) {
            console.error("Erro ao carregar instâncias Drone do banco:", error);
        }
    }

    async loadConfig() {
        const configPath = this.getConfigPath();
        this.config = await droneConfig.loadConfig(configPath, this.config);
    }

    async saveConfig() {
        const configPath = this.getConfigPath();
        await droneConfig.saveConfig(configPath, this.config);
    }

    async createInstance(name) {
        const instanceId = `drone-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        await droneDb.dbInsertDroneInstance(instanceId, name, SERVICE_STATUS.DISCONNECTED);

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
        await droneDb.dbDeleteDroneInstance(instanceId);

        this.clients.delete(instanceId);

        // Limpa o diretório da sessão
        try {
            const sessionPath = path.join(this.getBaseSessionPath(), "session-" + instanceId);
            await fs.rm(sessionPath, { recursive: true, force: true }).catch(() => {});
        } catch (e) { 
            console.error("Erro ao remover diretório de sessão do Drone:", e); 
        }

        return true;
    }

    async startInstance(instanceId) {
        const instanceData = this.clients.get(instanceId);
        if (!instanceData) {
            throw new Error("Instância não encontrada na memória.");
        }

        if (instanceData.client) {
            await debug(`Drone: Instância ${instanceId} já está rodando.`);
            return;
        }

        await debug(`Drone: Iniciando cliente para ${instanceId}...`);

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
            await this.dbUpdateDroneInstanceStatus(instanceId, SERVICE_STATUS.CONNECTING);
            this.emit('instance-update', { instanceId, status: SERVICE_STATUS.CONNECTING });

            client.on('qr', (qr) => {
                debug(`Drone: QR Code recebido para ${instanceId}`);
                instanceData.qrCode = qr;
                instanceData.status = SERVICE_STATUS.QR_PENDING;
                this.emit('instance-update', { instanceId, status: instanceData.status, qr });
            });

            client.on('ready', async () => {
                instanceData.status = SERVICE_STATUS.CONNECTED;
                instanceData.qrCode = null;
                const phoneNumber = client.info.wid.user;
                console.log(`Drone conectado: ${phoneNumber} (${instanceId})`);
                await this.dbUpdateDroneInstanceStatus(instanceId, SERVICE_STATUS.CONNECTED, phoneNumber);
                this.emit('instance-update', { instanceId, status: instanceData.status });
            });

            client.on('authenticated', () => {
                debug(`Drone: Autenticado ${instanceId}`);
                instanceData.status = SERVICE_STATUS.CONNECTING;
                instanceData.qrCode = null;
                this.emit('instance-update', { instanceId, status: 'authenticated' });
            });

            client.on('auth_failure', async (msg) => {
                console.error(`Drone: Falha de autenticação para ${instanceId}: ${msg}`);
                instanceData.status = SERVICE_STATUS.AUTH_FAILURE;
                await this.dbUpdateDroneInstanceStatus(instanceId, SERVICE_STATUS.AUTH_FAILURE);
                this.emit('instance-update', { instanceId, status: SERVICE_STATUS.AUTH_FAILURE });
            });

            client.on('disconnected', async (reason) => {
                console.log(`Drone: Desconectado ${instanceId} (Razão: ${reason})`);
                instanceData.status = SERVICE_STATUS.DISCONNECTED;
                instanceData.client = null;
                instanceData.qrCode = null;
                await this.dbUpdateDroneInstanceStatus(instanceId, SERVICE_STATUS.DISCONNECTED);
                this.emit('instance-update', { instanceId, status: SERVICE_STATUS.DISCONNECTED });
            });

            await client.initialize();
            await debug(`Drone: Cliente inicializado com sucesso para ${instanceId}`);

        } catch (e) {
            console.error(`Drone: ERRO ao iniciar instância ${instanceId}:`, e);
            instanceData.client = null;
            instanceData.status = SERVICE_STATUS.DISCONNECTED;
            instanceData.qrCode = null;
            await this.dbUpdateDroneInstanceStatus(instanceId, SERVICE_STATUS.DISCONNECTED);
            this.emit('instance-update', { instanceId, status: SERVICE_STATUS.DISCONNECTED, error: e.message });
            throw e;
        }
    }

    async stopInstance(instanceId) {
        const data = this.clients.get(instanceId);
        if (data && data.client) {
            const { safeDestroyClient } = require("../utils/processCleanup");
            await safeDestroyClient(data.client, `Drone ${instanceId}`);
            data.client = null;
            data.status = SERVICE_STATUS.DISCONNECTED;
            data.qrCode = null;
            try {
                await this.dbUpdateDroneInstanceStatus(instanceId, SERVICE_STATUS.DISCONNECTED);
            } catch (e) {
                console.error(`Drone: Erro ao atualizar status de ${instanceId} no banco:`, e.message);
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

    dbGetAllDroneInstances() {
        return droneDb.dbGetAllDroneInstances();
    }

    dbUpdateDroneInstanceStatus(instanceId, status, phoneNumber = null) {
        return droneDb.dbUpdateDroneInstanceStatus(instanceId, status, phoneNumber);
    }

    dbResetAllDroneInstancesStatus() {
        return droneDb.dbResetAllDroneInstancesStatus();
    }

    // --- CRUD de Mensagens ---

    dbGetDroneMessages() {
        return droneDb.dbGetDroneMessages();
    }

    dbAddDroneMessage(content) {
        return droneDb.dbAddDroneMessage(content);
    }

    dbDeleteDroneMessage(id) {
        return droneDb.dbDeleteDroneMessage(id);
    }

    // --- CRUD e Lógica de Clientes Destinatários ---

    dbGetDroneClients() {
        return droneDb.dbGetDroneClients();
    }

    dbAddDroneClient(name, tel) {
        return droneDb.dbAddDroneClient(name, tel);
    }

    dbAddDroneClientsBatch(clients) {
        return droneDb.dbAddDroneClientsBatch(clients);
    }

    dbRemoveDroneClient(id) {
        return droneDb.dbRemoveDroneClient(id);
    }

    dbClearDroneClients(type = "all") {
        return droneDb.dbClearDroneClients(type);
    }

    dbGetDroneStats() {
        return droneDb.dbGetDroneStats();
    }

    dbUpdateClientStatus(id, status) {
        return droneDb.dbUpdateClientStatus(id, status);
    }

    dbGetPendingAndFailedClients() {
        return droneDb.dbGetPendingAndFailedClients();
    }

    // --- Loop de Disparo de Mensagens ---

    getConnectedInstances() {
        return droneDispatch.getConnectedInstances(this);
    }

    async setConfig(config) {
        this.config = { ...this.config, ...config };
        await this.saveConfig();
    }
    
    getConfig() {
        return this.config;
    }

    async startDispatch() {
        return droneDispatch.startDispatch(this);
    }

    async runDroneLoop(drone, tasks, messages) {
        return droneDispatch.runDroneLoop(this, drone, tasks, messages);
    }

    async stopDispatch() {
        return droneDispatch.stopDispatch(this);
    }

    async stopAll() {
        console.log("🛑 Drone: Parando todas as instâncias...");
        await this.stopDispatch();

        const instanceIds = Array.from(this.clients.keys());
        for (const instanceId of instanceIds) {
            try {
                await this.stopInstance(instanceId);
            } catch (error) {
                console.error(`Erro ao parar instância Drone ${instanceId}:`, error.message);
            }
        }
        console.log("✅ Drone: Todas as instâncias paradas.");
    }
}

const droneService = new DroneService();
module.exports = droneService;
