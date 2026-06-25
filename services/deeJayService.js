// services/deeJayService.js
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const path = require("path");
const fs = require("fs").promises;
const { debug } = require("./debugService");
const browserHelper = require("../utils/browserHelper");
const { 
    getAllDeeJayInstances, 
    updateDeeJayInstanceStatus, 
    DEE_JAY_STATUS,
    deleteDeeJayInstance,
    createDeeJayInstance,
    resetAllDeeJayInstancesStatus
} = require("../config/initializeModules/deeJayIM");

const MessageType = require("../config/messageType");
const { runQuery, getDatabaseConnection } = require("../config/initializeModules/databaseIM");
const { EMOJIS, GIF_URLS } = require("../utils/randomContent");

class DeeJayService {
    constructor() {
        this.clients = new Map(); // instanceId -> { client, status, ... }
        this.isRunning = false;
        this.loopInterval = null;
        this.config = {
            minIntervalMinutes: 1,
            maxIntervalMinutes: 5,
            active: false,
            linkJubileu: false,
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
        try {
            const { app } = require("electron");
            if (app && app.isPackaged) {
                return path.join(app.getPath("userData"), "whatsapp-sessions-deejay");
            }
            return path.join(__dirname, "../.wwebjs_auth_deejay");
        } catch (error) {
            return path.join(__dirname, "../.wwebjs_auth_deejay");
        }
    }

    async initialize() {
        // Load persist config
        await this.loadConfig();

        // Reset any stale "connected" status from previous runs
        // This handles cases where the app was closed abruptly
        try {
            await resetAllDeeJayInstancesStatus();
        } catch (error) {
            console.error("Erro ao resetar status das instâncias Dee Jay:", error);
        }

        // Load instances from DB
        const instances = await getAllDeeJayInstances();
        // We don't auto-connect on startup for now, but we could.
        // Let's just load them into memory as disconnected
        for (const inst of instances) {
            this.clients.set(inst.instance_id, {
                status: DEE_JAY_STATUS.DISCONNECTED, // Always start as disconnected
                name: inst.name,
                qrCode: null,
                client: null
            });
        }
    }

    getConfigPath() {
        try {
            const { app } = require("electron");
            if (app && app.isPackaged) {
                return path.join(app.getPath("userData"), "data", "deeJayConfig.json");
            }
            return path.join(__dirname, "../config/deeJayConfig.json");
        } catch (error) {
            return path.join(__dirname, "../config/deeJayConfig.json");
        }
    }

    async loadConfig() {
        try {
            const configPath = this.getConfigPath();
            const data = await fs.readFile(configPath, 'utf8');
            const loadedConfig = JSON.parse(data);
            
            // Merge loaded config with defaults, ensuring valid types
            if (loadedConfig.minIntervalMinutes) this.config.minIntervalMinutes = loadedConfig.minIntervalMinutes;
            if (loadedConfig.maxIntervalMinutes) this.config.maxIntervalMinutes = loadedConfig.maxIntervalMinutes;
            if (loadedConfig.hasOwnProperty('linkJubileu')) this.config.linkJubileu = !!loadedConfig.linkJubileu;
            if (loadedConfig.hasOwnProperty('linkDrone')) this.config.linkDrone = !!loadedConfig.linkDrone;
            console.log("Dee Jay: Configuração carregada:", this.config);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error("Dee Jay: Erro ao carregar configuração:", error);
            } else {
                console.log("Dee Jay: Arquivo de configuração não encontrado, usando padrões.");
            }
        }
    }

    async saveConfig() {
        try {
             const configPath = this.getConfigPath();
             // Prepare object to save (exclude 'active' if it's runtime only, but user might want persistence)
             // User request: "persistir mesmo que o programa seja fechado". 
             // Usually active state is runtime, but intervals are persistent.
             // Let's persist everything for now provided it's in this.config.
             const data = JSON.stringify(this.config, null, 2);
             await fs.writeFile(configPath, data, 'utf8');
             console.log("Dee Jay: Configuração salva com sucesso.");
        } catch (error) {
            console.error("Dee Jay: Erro ao salvar configuração:", error);
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
            await debug(`Dee Jay: Instância ${instanceId} já está iniciada.`);
            return;
        }

        await debug(`Dee Jay: Iniciando instância ${instanceId}...`);

        const executablePath = browserHelper.getChromeExecutablePath();
        if (!executablePath) {
             console.warn("DeeJayService: Chrome não encontrado. Puppeteer tentará usar versão padrão.");
        }

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
                    '--disable-gpu' // Economiza recursos, útil para múltiplas instâncias
                ]
            }
        });

        const instanceData = this.clients.get(instanceId) || {};
        instanceData.client = client;
        instanceData.status = DEE_JAY_STATUS.CONNECTING;
        this.clients.set(instanceId, instanceData);
        
        try {
            await updateDeeJayInstanceStatus(instanceId, DEE_JAY_STATUS.CONNECTING);

            client.on('qr', (qr) => {
                debug(`Dee Jay: QR Code recebido para ${instanceId}`);
                instanceData.qrCode = qr;
                instanceData.status = DEE_JAY_STATUS.QR_PENDING;
                this.emit('instance-update', { instanceId, status: instanceData.status, qr });
            });

            client.on('ready', async () => {
                instanceData.status = DEE_JAY_STATUS.CONNECTED;
                instanceData.qrCode = null;
                const phoneNumber = client.info.wid.user;
                console.log(`Dee Jay conectado: ${phoneNumber} (${instanceId})`);
                await updateDeeJayInstanceStatus(instanceId, DEE_JAY_STATUS.CONNECTED, phoneNumber);
                this.emit('instance-update', { instanceId, status: instanceData.status });
            });
            
            client.on('authenticated', () => {
                 debug(`Dee Jay: Autenticado ${instanceId}`);
                 instanceData.status = DEE_JAY_STATUS.CONNECTING; // Ainda conectando até ready
                 instanceData.qrCode = null;
                 this.emit('instance-update', { instanceId, status: 'authenticated' });
            });

            client.on('auth_failure', async (msg) => {
                console.error(`Dee Jay: Falha de autenticação para ${instanceId}: ${msg}`);
                instanceData.status = DEE_JAY_STATUS.AUTH_FAILURE;
                await updateDeeJayInstanceStatus(instanceId, DEE_JAY_STATUS.AUTH_FAILURE);
                this.emit('instance-update', { instanceId, status: DEE_JAY_STATUS.AUTH_FAILURE });
            });

            client.on('disconnected', async (reason) => {
                console.log(`Dee Jay: Desconectado ${instanceId} (Razão: ${reason})`);
                instanceData.status = DEE_JAY_STATUS.DISCONNECTED;
                instanceData.client = null;
                await updateDeeJayInstanceStatus(instanceId, DEE_JAY_STATUS.DISCONNECTED);
                this.emit('instance-update', { instanceId, status: DEE_JAY_STATUS.DISCONNECTED });
            });

            await client.initialize();
            await debug(`Dee Jay: Cliente inicializado para ${instanceId}`);
            
            // Forward browser console logs to Node (help debug inner WA errors)
            if (client.pupPage) {
                client.pupPage.on('console', async msg => {
                    const text = msg.text();
                    if (msg.type() === 'error') {
                         await debug(`Dee Jay Browser Error (${instanceId}):`, text);
                         
                         // Detecção de Erro Crítico de Sessão Corrompida ou Incompatível
                         if (text.includes('WAWebSetPushnameConnAction')) {
                             console.error(`Dee Jay CRÍTICO: Sessão corrompida ou incompatível detectada na instância ${instanceId}. Forçando desconexão.`);
                             try {
                                 await client.destroy();
                                 instanceData.client = null;
                                 instanceData.status = DEE_JAY_STATUS.AUTH_FAILURE;
                                 await updateDeeJayInstanceStatus(instanceId, DEE_JAY_STATUS.AUTH_FAILURE);
                                 this.emit('instance-update', { instanceId, status: DEE_JAY_STATUS.AUTH_FAILURE, error: "Sessão incompatível. Recrie a instância." });
                             } catch (e) {
                                 console.error("Erro ao tentar recuperar de falha crítica:", e);
                             }
                         }
                    }
                });
            }

            // Safety Warning if stuck on authenticated too long
            setTimeout(() => {
                const currentStatus = this.clients.get(instanceId)?.status;
                if (currentStatus === DEE_JAY_STATUS.CONNECTING || currentStatus === 'authenticated') {
                     console.warn(`Dee Jay ALERTA: Instância ${instanceId} parece estar PRESA em '${currentStatus}' por mais de 60 segundos. Pode ser necessário reiniciar manualmente esta instância.`);
                     // Opcional: tentar reload
                     // if (client.pupPage) client.pupPage.reload();
                }
            }, 60000);

        } catch (e) {
            if (e.message && (e.message.includes('TargetCloseError') || e.message.includes('Target closed'))) {
                console.warn(`Dee Jay: Inicialização da instância ${instanceId} cancelada prematuramente (Target fechado). Ignorando erro para evitar alerta.`);
                return;
            }

            console.error(`Dee Jay: ERRO FATAL ao iniciar instância ${instanceId}:`, e);
            // Reverter estado
            const data = this.clients.get(instanceId);
            if (data) {
                data.client = null;
                data.status = DEE_JAY_STATUS.DISCONNECTED;
            }
            await updateDeeJayInstanceStatus(instanceId, DEE_JAY_STATUS.DISCONNECTED);
            this.emit('instance-update', { instanceId, status: DEE_JAY_STATUS.DISCONNECTED, error: e.message });
            throw e; // Propagar para o handler saber
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

    async setConfig(config) {
        this.config = { ...this.config, ...config };
        await this.saveConfig();
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
            const senderNum = sender.client?.info?.wid?.user;
            const receiverNum = receiver.client?.info?.wid?.user;
            
            await debug(`Dee Jay DEBUG: Loop ${sender.name} (${senderNum}) -> ${receiver.name} (${receiverNum})`);

            if (senderNum && receiverNum && senderNum === receiverNum) {
                console.warn(`Dee Jay AVISO: As instâncias '${sender.name}' e '${receiver.name}' estão conectadas no MESMO número de WhatsApp (${senderNum}). O Dee Jay precisa de números diferentes para conversar.`);
            }

            await this.sendSingleMessage(sender, receiver);

            if (!this.isRunning) break;

            // 3. Wait interval (1-3 min by default/config) before reply
            const minMs = this.config.minIntervalMinutes * 60 * 1000;
            const maxMs = this.config.maxIntervalMinutes * 60 * 1000;
            
            await debug(`Dee Jay: Aguardando resposta...`);
            await smartDelay({ minMs, maxMs });

            if (!this.isRunning) break;

            // 4. Receiver -> Sender (Reply)
            await this.sendSingleMessage(receiver, sender);

            if (!this.isRunning) break;

            // 5. Wait before next conversation
            await debug(`Dee Jay: Aguardando próxima conversa...`);
            await smartDelay({ minMs, maxMs });
        }
    }

    async sendSingleMessage(from, to) {
        // Randomization Logic:
        // 70% - Database Message
        // 15% - Emoji
        // 15% - GIF

        const rand = Math.random();
        let message = null;
        let options = undefined;

        try {
             if (rand < 0.70) {
                // Database Message
                message = await this.getRandomDeeJayMessage();
                if (!message) {
                    // Fallback if DB empty
                     message = this.getRandomEmoji();
                }
             } else if (rand < 0.85) {
                // Emoji
                message = this.getRandomEmoji();
             } else {
                // GIF
                const gifUrl = this.getRandomGifUrl();
                if (gifUrl) {
                    try {
                        message = await MessageMedia.fromUrl(gifUrl, { unsafeMime: true });
                        options = { sendVideoAsGif: true };
                    } catch (e) {
                         console.error("Dee Jay: Erro ao carregar GIF, enviando emoji em vez disso.", e);
                         message = this.getRandomEmoji();
                    }
                } else {
                     message = this.getRandomEmoji();
                }
             }
             
             if (!message) {
                 await debug("Dee Jay: Não foi possível gerar mensagem.");
                 return;
             }

            const receiverNumber = to.client.info.wid.user + "@c.us";
            // sendSeen: false para contornar erro de compatibilidade na whatsapp-web.js
            // (erro: Cannot read properties of undefined (reading 'markedUnread'))
            const sendOptions = { ...options, sendSeen: false };
            await from.client.sendMessage(receiverNumber, message, sendOptions);
            
            const logMsg = (typeof message === 'object') ? '[GIF]' : message;

            this.emit('log', {
                timestamp: new Date(),
                sender: from.name,
                receiver: to.name,
                message: logMsg
            });
            await debug(`Dee Jay: ${from.name} enviou para ${to.name}: ${logMsg}`);

        } catch (error) {
            console.error(`Dee Jay: Erro ao enviar de ${from.name} para ${to.name}:`, error);
        }
    }

    getRandomEmoji() {
        if (!EMOJIS || EMOJIS.length === 0) return "👍";
        return EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    }

    getRandomGifUrl() {
        if (!GIF_URLS || GIF_URLS.length === 0) return null;
        return GIF_URLS[Math.floor(Math.random() * GIF_URLS.length)];
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

    /**
     * Stops all Dee Jay instances (used during app cleanup)
     */
    async stopAll() {
        console.log("🛑 Parando todas as instâncias Dee Jay...");
        this.stopLoop(); // Stop the conversation loop first

        const instanceIds = Array.from(this.clients.keys());

        for (const instanceId of instanceIds) {
            try {
                await this.stopInstance(instanceId);
            } catch (error) {
                console.error(`Erro ao parar instância Dee Jay ${instanceId}:`, error.message);
            }
        }

        console.log("✅ Todas as instâncias Dee Jay paradas");
    }
}

const deeJayService = new DeeJayService();
module.exports = deeJayService;
