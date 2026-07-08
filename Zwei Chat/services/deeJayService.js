// services/deeJayService.js
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const path = require("path");
const fs = require("fs").promises;
const { debug } = require("./debugService");
const pathHelper = require("../utils/pathHelper");
const db = require("../config/db");
const { EMOJIS, GIF_URLS, STICKER_URLS } = require("../utils/randomContent");

const DEE_JAY_STATUS = {
    DISCONNECTED: "disconnected",
    CONNECTING: "connecting",
    CONNECTED: "connected",
    QR_PENDING: "qr_pending",
    AUTH_FAILURE: "auth_failure",
};

function getChromeExecutablePath() {
    const platform = process.platform;
    if (platform === "win32") {
        const possiblePaths = [
            "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
            "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
            process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe",
        ];
        return possiblePaths[0];
    } else if (platform === "darwin") {
        return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    } else {
        return "/usr/bin/google-chrome";
    }
}

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
                    status: DEE_JAY_STATUS.DISCONNECTED,
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
        try {
            const configPath = this.getConfigPath();
            const data = await fs.readFile(configPath, 'utf8');
            const loadedConfig = JSON.parse(data);
            
            if (loadedConfig.minIntervalMinutes) this.config.minIntervalMinutes = loadedConfig.minIntervalMinutes;
            if (loadedConfig.maxIntervalMinutes) this.config.maxIntervalMinutes = loadedConfig.maxIntervalMinutes;
            if (loadedConfig.hasOwnProperty('linkBotPrincipal')) this.config.linkBotPrincipal = !!loadedConfig.linkBotPrincipal;
            if (loadedConfig.hasOwnProperty('linkDrone')) this.config.linkDrone = !!loadedConfig.linkDrone;
            if (loadedConfig.hasOwnProperty('active')) this.config.active = !!loadedConfig.active;
            
            console.log("Dee Jay: Configuração carregada:", this.config);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error("Dee Jay: Erro ao carregar configuração:", error);
            }
        }
    }

    async saveConfig() {
        try {
             const configPath = this.getConfigPath();
             const data = JSON.stringify(this.config, null, 2);
             await fs.writeFile(configPath, data, 'utf8');
             console.log("Dee Jay: Configuração salva.");
        } catch (error) {
            console.error("Dee Jay: Erro ao salvar configuração:", error);
        }
    }

    async createInstance(name) {
        const instanceId = `dj-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        
        await new Promise((resolve, reject) => {
            db.run(
                "INSERT INTO dee_jay_instances (id, name, status) VALUES (?, ?, ?)",
                [instanceId, name, DEE_JAY_STATUS.DISCONNECTED],
                function(err) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        this.clients.set(instanceId, {
            status: DEE_JAY_STATUS.DISCONNECTED,
            name: name,
            qrCode: null,
            client: null
        });

        return { instanceId, name, status: DEE_JAY_STATUS.DISCONNECTED };
    }

    async removeInstance(instanceId) {
        await this.stopInstance(instanceId);
        
        await new Promise((resolve, reject) => {
            db.run("DELETE FROM dee_jay_instances WHERE id = ?", [instanceId], function(err) {
                if (err) reject(err);
                else resolve();
            });
        });

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
        instanceData.status = DEE_JAY_STATUS.CONNECTING;
        this.clients.set(instanceId, instanceData);

        try {
            await this.dbUpdateDeeJayInstanceStatus(instanceId, DEE_JAY_STATUS.CONNECTING);
            this.emit('instance-update', { instanceId, status: DEE_JAY_STATUS.CONNECTING });

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
                await this.dbUpdateDeeJayInstanceStatus(instanceId, DEE_JAY_STATUS.CONNECTED, phoneNumber);
                this.emit('instance-update', { instanceId, status: instanceData.status });
            });

            client.on('authenticated', () => {
                debug(`Dee Jay: Autenticado ${instanceId}`);
                instanceData.status = DEE_JAY_STATUS.CONNECTING;
                instanceData.qrCode = null;
                this.emit('instance-update', { instanceId, status: 'authenticated' });
            });

            client.on('auth_failure', async (msg) => {
                console.error(`Dee Jay: Falha de autenticação para ${instanceId}: ${msg}`);
                instanceData.status = DEE_JAY_STATUS.AUTH_FAILURE;
                await this.dbUpdateDeeJayInstanceStatus(instanceId, DEE_JAY_STATUS.AUTH_FAILURE);
                this.emit('instance-update', { instanceId, status: DEE_JAY_STATUS.AUTH_FAILURE });
            });

            client.on('disconnected', async (reason) => {
                console.log(`Dee Jay: Desconectado ${instanceId} (Razão: ${reason})`);
                instanceData.status = DEE_JAY_STATUS.DISCONNECTED;
                instanceData.client = null;
                instanceData.qrCode = null;
                await this.dbUpdateDeeJayInstanceStatus(instanceId, DEE_JAY_STATUS.DISCONNECTED);
                this.emit('instance-update', { instanceId, status: DEE_JAY_STATUS.DISCONNECTED });
            });

            await client.initialize();
            await debug(`Dee Jay: Cliente inicializado com sucesso para ${instanceId}`);

        } catch (e) {
            console.error(`Dee Jay: ERRO ao iniciar instância ${instanceId}:`, e);
            instanceData.client = null;
            instanceData.status = DEE_JAY_STATUS.DISCONNECTED;
            instanceData.qrCode = null;
            await this.dbUpdateDeeJayInstanceStatus(instanceId, DEE_JAY_STATUS.DISCONNECTED);
            this.emit('instance-update', { instanceId, status: DEE_JAY_STATUS.DISCONNECTED, error: e.message });
            throw e;
        }
    }

    async stopInstance(instanceId) {
        const data = this.clients.get(instanceId);
        if (data && data.client) {
            const { safeDestroyClient } = require("../utils/processCleanup");
            await safeDestroyClient(data.client, `DeeJay ${instanceId}`);
            data.client = null;
            data.status = DEE_JAY_STATUS.DISCONNECTED;
            data.qrCode = null;
            try {
                await this.dbUpdateDeeJayInstanceStatus(instanceId, DEE_JAY_STATUS.DISCONNECTED);
            } catch (e) {
                console.error(`Dee Jay: Erro ao atualizar status de ${instanceId} no banco:`, e.message);
            }
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

    // --- Métodos de Banco de Dados Locais ---

    dbGetAllDeeJayInstances() {
        return new Promise((resolve, reject) => {
            db.all("SELECT * FROM dee_jay_instances ORDER BY created_at ASC", [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    dbUpdateDeeJayInstanceStatus(instanceId, status, phoneNumber = null) {
        return new Promise((resolve, reject) => {
            let query = "UPDATE dee_jay_instances SET status = ?, updated_at = CURRENT_TIMESTAMP";
            let params = [status];

            if (phoneNumber) {
                query += ", phone_number = ?";
                params.push(phoneNumber);
            }

            if (status === DEE_JAY_STATUS.CONNECTED) {
                query += ", last_connected_at = CURRENT_TIMESTAMP";
            }

            query += " WHERE id = ?";
            params.push(instanceId);

            db.run(query, params, function(err) {
                if (err) reject(err);
                else resolve(this.changes > 0);
            });
        });
    }

    dbResetAllDeeJayInstancesStatus() {
        return new Promise((resolve, reject) => {
            db.run(
                "UPDATE dee_jay_instances SET status = ?",
                [DEE_JAY_STATUS.DISCONNECTED],
                function(err) {
                    if (err) reject(err);
                    else {
                        console.log(`🔄 ${this.changes} instância(s) Dee Jay resetadas para disconnected`);
                        resolve(true);
                    }
                }
            );
        });
    }

    async getRandomDeeJayMessage() {
        return new Promise((resolve) => {
            db.get("SELECT message_content FROM dee_jay_messages ORDER BY RANDOM() LIMIT 1", [], (err, row) => {
                if (err) {
                    console.error("Dee Jay: Erro ao buscar mensagem aleatória no banco:", err);
                    resolve(null);
                } else {
                    resolve(row ? row.message_content : null);
                }
            });
        });
    }

    dbGetDeeJayMessages() {
        return new Promise((resolve, reject) => {
            db.all("SELECT * FROM dee_jay_messages ORDER BY id DESC", [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    dbAddDeeJayMessage(content) {
        return new Promise((resolve, reject) => {
            db.run("INSERT INTO dee_jay_messages (message_content) VALUES (?)", [content], function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, message_content: content });
            });
        });
    }

    dbDeleteDeeJayMessage(id) {
        return new Promise((resolve, reject) => {
            db.run("DELETE FROM dee_jay_messages WHERE id = ?", [id], function(err) {
                if (err) reject(err);
                else resolve(this.changes > 0);
            });
        });
    }

    // --- Lógica de Conversação e Loop ---

    async startLoop() {
        if (this.isRunning) return;
        
        const connectedInstances = this.getConnectedInstances();
        if (connectedInstances.length < 2) {
            throw new Error("Precisa de pelo menos 2 instâncias conectadas.");
        }

        this.isRunning = true;
        this.config.active = true;
        await this.saveConfig();

        this.emit('loop-status', { active: true });
        this.runConversationLoop();
    }

    async stopLoop() {
        this.isRunning = false;
        this.config.active = false;
        await this.saveConfig();
        this.emit('loop-status', { active: false });
    }

    getConnectedInstances() {
        const connected = [];
        
        // 1. Instâncias nativas do Dee Jay conectadas
        this.clients.forEach((val, key) => {
            if (val.status === DEE_JAY_STATUS.CONNECTED && val.client) {
                connected.push({
                    client: val.client,
                    status: val.status,
                    name: val.name
                });
            }
        });

        // 2. Instâncias do Bot Principal (se a opção de vinculação estiver ativada)
        if (this.config.linkBotPrincipal) {
            try {
                const clientModule = require("../client/client");
                const botClients = clientModule.clients; // Map de instanceId -> Client
                botClients.forEach((clientInstance, instanceId) => {
                    // Verifica se o cliente está conectado e pronto
                    if (clientInstance && clientInstance.pupPage && clientInstance.info) {
                        connected.push({
                            client: clientInstance,
                            status: DEE_JAY_STATUS.CONNECTED,
                            name: `[Bot] Instância ${instanceId}`
                        });
                    }
                });
            } catch (e) {
                console.error("Dee Jay: Erro ao obter instâncias do bot principal para vinculação:", e);
            }
        }

        // 3. Instâncias do Drone (se a opção de vinculação estiver ativada)
        if (this.config.linkDrone) {
            try {
                const droneService = require("./droneService");
                const droneStatuses = droneService.getConnectedInstances();
                droneStatuses.forEach(inst => {
                    if (inst.client && inst.client.info) {
                        connected.push({
                            client: inst.client,
                            status: DEE_JAY_STATUS.CONNECTED,
                            name: `[Drone] ${inst.name || 'Disparador'}`
                        });
                    }
                });
            } catch (e) {
                console.error("Dee Jay: Erro ao obter instâncias do drone para vinculação:", e);
            }
        }

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
        // Helper simples para delay inteligente
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

        while (this.isRunning) {
            const connected = this.getConnectedInstances();
            if (connected.length < 2) {
                console.log("Dee Jay: Instâncias conectadas insuficientes (< 2). Parando o loop.");
                await this.stopLoop();
                break;
            }

            // Seleciona par de instâncias
            const senderIdx = Math.floor(Math.random() * connected.length);
            const sender = connected[senderIdx];
            const senderNum = sender.client?.info?.wid?.user;

            let receiverIdx;
            let receiver;
            let receiverNum;
            let attempts = 0;
            const maxAttempts = 50;

            do {
                receiverIdx = Math.floor(Math.random() * connected.length);
                receiver = connected[receiverIdx];
                receiverNum = receiver.client?.info?.wid?.user;
                attempts++;
            } while (
                (receiverIdx === senderIdx || (senderNum && receiverNum && senderNum === receiverNum)) && 
                attempts < maxAttempts
            );

            if (senderNum && receiverNum && senderNum === receiverNum) {
                console.warn("Dee Jay: Não foi possível selecionar duas instâncias com números diferentes.");
                await delay(10000);
                continue;
            }

            await debug(`Dee Jay Loop: ${sender.name} (${senderNum}) -> ${receiver.name} (${receiverNum})`);

            // 1. Envia mensagem do Remetente para o Destinatário
            await this.sendSingleMessage(sender, receiver);

            if (!this.isRunning) break;

            // Calcula o tempo de espera do intervalo configurado
            const minMs = this.config.minIntervalMinutes * 60 * 1000;
            const maxMs = this.config.maxIntervalMinutes * 60 * 1000;
            const waitTime = getRandomInt(minMs, maxMs);

            await debug(`Dee Jay: Aguardando resposta de ${receiver.name} em ${Math.round(waitTime / 1000)}s...`);
            await delay(waitTime);

            if (!this.isRunning) break;

            // 2. Envia a resposta do Destinatário para o Remetente (Inverte os papéis)
            await this.sendSingleMessage(receiver, sender);

            if (!this.isRunning) break;

            // Aguarda mais um intervalo antes de iniciar um novo ciclo
            const nextCycleWait = getRandomInt(minMs, maxMs);
            await debug(`Dee Jay: Ciclo concluído. Próximo ciclo em ${Math.round(nextCycleWait / 1000)}s...`);
            await delay(nextCycleWait);
        }
    }

    async sendSingleMessage(from, to) {
        // Probabilidade de tipos de mensagem:
        // 55% - Banco de dados (dee_jay_messages)
        // 15% - Emoji
        // 15% - GIF
        // 15% - Sticker

        const rand = Math.random();
        let message = null;
        let options = undefined;

        try {
             if (rand < 0.55) {
                // Banco de Dados
                message = await this.getRandomDeeJayMessage();
                if (!message) {
                    message = this.getRandomEmoji();
                }
             } else if (rand < 0.70) {
                // Emoji
                message = this.getRandomEmoji();
             } else if (rand < 0.85) {
                // GIF
                const gifUrl = this.getRandomGifUrl();
                if (gifUrl) {
                    try {
                        message = await MessageMedia.fromUrl(gifUrl, { unsafeMime: true });
                        options = { sendVideoAsGif: true };
                    } catch (e) {
                         message = this.getRandomEmoji();
                    }
                } else {
                     message = this.getRandomEmoji();
                }
             } else {
                // Sticker
                const stickerUrl = this.getRandomStickerUrl();
                if (stickerUrl) {
                    try {
                        message = await MessageMedia.fromUrl(stickerUrl, { unsafeMime: true });
                        options = { sendMediaAsSticker: true };
                    } catch (e) {
                         message = this.getRandomEmoji();
                    }
                } else {
                     message = this.getRandomEmoji();
                }
             }
             
             if (!message) return;

            const receiverNumber = to.client.info.wid.user + "@c.us";
            const sendOptions = { ...options, sendSeen: false }; // Evita erro de leitura
            
            await from.client.sendMessage(receiverNumber, message, sendOptions);
            
            let logMsg = message;
            if (typeof message === 'object') {
                if (options && options.sendMediaAsSticker) {
                    logMsg = '[Figurinha 🖼️]';
                } else {
                    logMsg = '[GIF 🎥]';
                }
            }

            this.emit('log', {
                timestamp: new Date(),
                sender: from.name,
                receiver: to.name,
                message: logMsg
            });
            await debug(`Dee Jay LOG: ${from.name} ➜ ${to.name}: ${logMsg}`);

        } catch (error) {
            console.error(`Dee Jay: Falha ao enviar mensagem de ${from.name} para ${to.name}:`, error);
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
    
    getRandomStickerUrl() {
        if (!STICKER_URLS || STICKER_URLS.length === 0) return null;
        return STICKER_URLS[Math.floor(Math.random() * STICKER_URLS.length)];
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
