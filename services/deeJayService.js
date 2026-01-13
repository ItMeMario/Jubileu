// services/deeJayService.js
const { Client, LocalAuth } = require("whatsapp-web.js");
const path = require("path");
const fs = require("fs").promises;
const { debug } = require("./debugService");
const { 
    getAllDeeJayInstances, 
    updateDeeJayInstanceStatus, 
    DEE_JAY_STATUS,
    deleteDeeJayInstance,
    createDeeJayInstance
} = require("../config/initializeModules/deeJayIM");

const MessageType = require("../config/messageType");
const { runQuery, getDatabaseConnection } = require("../config/initializeModules/databaseIM");

class DeeJayService {
    constructor() {
        this.clients = new Map(); // instanceId -> { client, status, ... }
        this.isRunning = false;
        this.loopInterval = null;
        this.config = {
            minIntervalMinutes: 1,
            maxIntervalMinutes: 5,
            active: false
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
        return path.join(__dirname, "../.wwebjs_auth_deejay");
    }

    async initialize() {
        // Load instances from DB
        const instances = await getAllDeeJayInstances();
        // We don't auto-connect on startup for now, but we could.
        // Let's just load them into memory as disconnected
        for (const inst of instances) {
            this.clients.set(inst.instance_id, {
                status: inst.status,
                name: inst.name,
                qrCode: null,
                client: null
            });
        }
    }

    async createInstance(name) {
        const instance = await createDeeJayInstance(name);
        this.clients.set(instance.instance_id, {
            status: DEE_JAY_STATUS.DISCONNECTED,
            name: instance.name,
            qrCode: null,
            client: null
        });
        return instance;
    }

    async removeInstance(instanceId) {
        await this.stopInstance(instanceId);
        await deleteDeeJayInstance(instanceId);
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
            return; // Already started
        }

        const client = new Client({
            authStrategy: new LocalAuth({
                clientId: instanceId,
                dataPath: this.getBaseSessionPath(),
            }),
            puppeteer: {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        });

        const instanceData = this.clients.get(instanceId) || {};
        instanceData.client = client;
        instanceData.status = DEE_JAY_STATUS.CONNECTING;
        this.clients.set(instanceId, instanceData);
        await updateDeeJayInstanceStatus(instanceId, DEE_JAY_STATUS.CONNECTING);

        client.on('qr', (qr) => {
            instanceData.qrCode = qr;
            instanceData.status = DEE_JAY_STATUS.QR_PENDING;
            this.emit('instance-update', { instanceId, status: instanceData.status, qr });
        });

        client.on('ready', async () => {
            instanceData.status = DEE_JAY_STATUS.CONNECTED;
            instanceData.qrCode = null;
            const phoneNumber = client.info.wid.user;
            console.log(`Dee Jay conectado: ${phoneNumber}`);
            await updateDeeJayInstanceStatus(instanceId, DEE_JAY_STATUS.CONNECTED, phoneNumber);
            this.emit('instance-update', { instanceId, status: instanceData.status });
        });
        
        client.on('authenticated', () => {
             instanceData.status = DEE_JAY_STATUS.CONNECTING;
             instanceData.qrCode = null;
             this.emit('instance-update', { instanceId, status: 'authenticated' });
        });

        client.on('disconnected', async () => {
            instanceData.status = DEE_JAY_STATUS.DISCONNECTED;
            instanceData.client = null;
            await updateDeeJayInstanceStatus(instanceId, DEE_JAY_STATUS.DISCONNECTED);
             this.emit('instance-update', { instanceId, status: DEE_JAY_STATUS.DISCONNECTED });
        });

        try {
            await client.initialize();
        } catch (e) {
            console.error("Error initializing Dee Jay client:", e);
        }
    }

    async stopInstance(instanceId) {
        const data = this.clients.get(instanceId);
        if (data && data.client) {
            try {
                await data.client.destroy();
            } catch(e) {}
            data.client = null;
            data.status = DEE_JAY_STATUS.DISCONNECTED;
            await updateDeeJayInstanceStatus(instanceId, DEE_JAY_STATUS.DISCONNECTED);
            this.emit('instance-update', { instanceId, status: DEE_JAY_STATUS.DISCONNECTED });
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

    // --- Dee Jay Logic ---

    async startLoop() {
        if (this.isRunning) return;
        
        const connectedInstances = this.getConnectedInstances();
        if (connectedInstances.length < 2) {
            throw new Error("Precisa de pelo menos 2 instâncias conectadas.");
        }

        this.isRunning = true;
        this.emit('loop-status', { active: true });
        this.runConversationLoop();
    }

    stopLoop() {
        this.isRunning = false;
        // No timer to clear, the loop will check isRunning after await
        this.emit('loop-status', { active: false });
    }

    getConnectedInstances() {
        const connected = [];
        this.clients.forEach((val, key) => {
            if (val.status === DEE_JAY_STATUS.CONNECTED && val.client) {
                connected.push(val);
            }
        });
        return connected;
    }

    setConfig(config) {
        this.config = { ...this.config, ...config };
    }
    
    getConfig() {
        return this.config;
    }

    async runConversationLoop() {
        const { smartDelay } = require("../utils/delay");

        while (this.isRunning) {
            const connected = this.getConnectedInstances();
            if (connected.length < 2) {
                this.stopLoop();
                break;
            }

            // --- Conversation Logic ---

            // 1. Pick Pair
            const senderIdx = Math.floor(Math.random() * connected.length);
            const sender = connected[senderIdx];

            let receiverIdx;
            do {
                receiverIdx = Math.floor(Math.random() * connected.length);
            } while (receiverIdx === senderIdx);
            const receiver = connected[receiverIdx];

            // 2. Sender -> Receiver
            await this.sendSingleMessage(sender, receiver);

            if (!this.isRunning) break;

            // 3. Wait interval (1-3 min by default/config) before reply
            const minMs = this.config.minIntervalMinutes * 60 * 1000;
            const maxMs = this.config.maxIntervalMinutes * 60 * 1000;
            
            console.log(`Dee Jay: Aguardando resposta...`);
            await smartDelay({ minMs, maxMs });

            if (!this.isRunning) break;

            // 4. Receiver -> Sender (Reply)
            await this.sendSingleMessage(receiver, sender);

            if (!this.isRunning) break;

            // 5. Wait before next conversation
            console.log(`Dee Jay: Aguardando próxima conversa...`);
            await smartDelay({ minMs, maxMs });
        }
    }

    async sendSingleMessage(from, to) {
        const message = await this.getRandomDeeJayMessage();
        if (!message) {
            console.log("Dee Jay: Nenhuma mensagem do tipo 'dee_jay' encontrada.");
            return;
        }

        try {
            const receiverNumber = to.client.info.wid.user + "@c.us";
            await from.client.sendMessage(receiverNumber, message);
            
            this.emit('log', {
                timestamp: new Date(),
                sender: from.name,
                receiver: to.name,
                message: message
            });
            console.log(`Dee Jay: ${from.name} enviou para ${to.name}: ${message}`);
        } catch (error) {
            console.error(`Dee Jay: Erro ao enviar de ${from.name} para ${to.name}:`, error);
        }
    }

    async getRandomDeeJayMessage() {
        let db;
        try {
            db = await getDatabaseConnection();
            
            return new Promise((resolve, reject) => {
                const query = `SELECT message_content FROM messages WHERE message_type = ? ORDER BY RANDOM() LIMIT 1`;
                db.get(query, [MessageType.DEE_JAY], (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row ? row.message_content : null);
                    }
                });
            });
        } catch (e) {
            console.error("Dee Jay: Erro ao buscar mensagem do banco:", e);
            return null;
        } finally {
            if (db) {
                db.close((err) => {
                    if (err) console.error("Dee Jay: Erro ao fechar conexão com banco:", err);
                });
            }
        }
    }
}

const deeJayService = new DeeJayService();
module.exports = deeJayService;
