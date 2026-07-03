// services/droneService.js
const { Client, LocalAuth } = require("whatsapp-web.js");
const path = require("path");
const fs = require("fs").promises;
const { debug } = require("./debugService");
const pathHelper = require("../utils/pathHelper");
const db = require("../config/db");

const DRONE_STATUS = {
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

/**
 * Aplica transformações ao número conforme opções escolhidas
 */
function aplicarTransformacoes(numero, opcoes = {}) {
    let numeroProcessado = numero.replace(/\D/g, ""); // Remove tudo que não é dígito

    // Aplica prefixo de país (ex: "55")
    if (opcoes.prefixoPais && opcoes.prefixoPais.trim().length > 0) {
        const prefixo = opcoes.prefixoPais.replace(/\D/g, "");
        // Só adiciona se o número não começar com o prefixo
        if (!numeroProcessado.startsWith(prefixo)) {
            numeroProcessado = prefixo + numeroProcessado;
        }
    }

    // Aplica DDD (ex: "11")
    if (opcoes.ddd && opcoes.ddd.trim().length > 0) {
        const ddd = opcoes.ddd.replace(/\D/g, "");

        // Se tem prefixo país (55) e número não tem DDD ainda
        if (opcoes.prefixoPais) {
            const prefixo = opcoes.prefixoPais.replace(/\D/g, "");
            // Se número começa com prefixo e tem menos que 13 dígitos (55 + 11 + 9XXXX)
            if (
                numeroProcessado.startsWith(prefixo) &&
                numeroProcessado.length < 13
            ) {
                // Insere DDD após o prefixo do país
                numeroProcessado =
                    prefixo + ddd + numeroProcessado.substring(prefixo.length);
            }
        } else {
            // Sem prefixo país, apenas adiciona DDD no início
            if (!numeroProcessado.startsWith(ddd)) {
                numeroProcessado = ddd + numeroProcessado;
            }
        }
    }

    // Adiciona 9º dígito (somente para números brasileiros)
    if (opcoes.adicionar9Digito === true) {
        let digitosPosicao;

        if (numeroProcessado.startsWith("55")) {
            // Formato: 55 + DDD (2) + número (8 ou 9)
            digitosPosicao = numeroProcessado.substring(4); // Pula "55" + DDD

            // Se tem 8 dígitos, adiciona o 9
            if (digitosPosicao.length === 8) {
                numeroProcessado =
                    numeroProcessado.substring(0, 4) + "9" + digitosPosicao;
            }
        } else if (numeroProcessado.length === 10) {
            // Formato sem código país: DDD (2) + número (8)
            const dddParte = numeroProcessado.substring(0, 2);
            const numeroParte = numeroProcessado.substring(2);

            if (numeroParte.length === 8) {
                numeroProcessado = dddParte + "9" + numeroParte;
            }
        }
    }

    return numeroProcessado;
}

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
                    status: DRONE_STATUS.DISCONNECTED,
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
        try {
            const configPath = this.getConfigPath();
            const data = await fs.readFile(configPath, 'utf8');
            const loadedConfig = JSON.parse(data);
            
            this.config = { ...this.config, ...loadedConfig };
            console.log("Drone: Configuração carregada:", this.config);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error("Drone: Erro ao carregar configuração:", error);
            }
        }
    }

    async saveConfig() {
        try {
             const configPath = this.getConfigPath();
             const data = JSON.stringify(this.config, null, 2);
             await fs.writeFile(configPath, data, 'utf8');
             console.log("Drone: Configuração salva.");
        } catch (error) {
            console.error("Drone: Erro ao salvar configuração:", error);
        }
    }

    async createInstance(name) {
        const instanceId = `drone-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        
        await new Promise((resolve, reject) => {
            db.run(
                "INSERT INTO drone_instances (id, name, status) VALUES (?, ?, ?)",
                [instanceId, name, DRONE_STATUS.DISCONNECTED],
                function(err) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        this.clients.set(instanceId, {
            status: DRONE_STATUS.DISCONNECTED,
            name: name,
            qrCode: null,
            client: null
        });

        return { instanceId, name, status: DRONE_STATUS.DISCONNECTED };
    }

    async removeInstance(instanceId) {
        await this.stopInstance(instanceId);
        
        await new Promise((resolve, reject) => {
            db.run("DELETE FROM drone_instances WHERE id = ?", [instanceId], function(err) {
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
        instanceData.status = DRONE_STATUS.CONNECTING;
        this.clients.set(instanceId, instanceData);

        try {
            await this.dbUpdateDroneInstanceStatus(instanceId, DRONE_STATUS.CONNECTING);
            this.emit('instance-update', { instanceId, status: DRONE_STATUS.CONNECTING });

            client.on('qr', (qr) => {
                debug(`Drone: QR Code recebido para ${instanceId}`);
                instanceData.qrCode = qr;
                instanceData.status = DRONE_STATUS.QR_PENDING;
                this.emit('instance-update', { instanceId, status: instanceData.status, qr });
            });

            client.on('ready', async () => {
                instanceData.status = DRONE_STATUS.CONNECTED;
                instanceData.qrCode = null;
                const phoneNumber = client.info.wid.user;
                console.log(`Drone conectado: ${phoneNumber} (${instanceId})`);
                await this.dbUpdateDroneInstanceStatus(instanceId, DRONE_STATUS.CONNECTED, phoneNumber);
                this.emit('instance-update', { instanceId, status: instanceData.status });
            });

            client.on('authenticated', () => {
                debug(`Drone: Autenticado ${instanceId}`);
                instanceData.status = DRONE_STATUS.CONNECTING;
                instanceData.qrCode = null;
                this.emit('instance-update', { instanceId, status: 'authenticated' });
            });

            client.on('auth_failure', async (msg) => {
                console.error(`Drone: Falha de autenticação para ${instanceId}: ${msg}`);
                instanceData.status = DRONE_STATUS.AUTH_FAILURE;
                await this.dbUpdateDroneInstanceStatus(instanceId, DRONE_STATUS.AUTH_FAILURE);
                this.emit('instance-update', { instanceId, status: DRONE_STATUS.AUTH_FAILURE });
            });

            client.on('disconnected', async (reason) => {
                console.log(`Drone: Desconectado ${instanceId} (Razão: ${reason})`);
                instanceData.status = DRONE_STATUS.DISCONNECTED;
                instanceData.client = null;
                instanceData.qrCode = null;
                await this.dbUpdateDroneInstanceStatus(instanceId, DRONE_STATUS.DISCONNECTED);
                this.emit('instance-update', { instanceId, status: DRONE_STATUS.DISCONNECTED });
            });

            await client.initialize();
            await debug(`Drone: Cliente inicializado com sucesso para ${instanceId}`);

        } catch (e) {
            console.error(`Drone: ERRO ao iniciar instância ${instanceId}:`, e);
            instanceData.client = null;
            instanceData.status = DRONE_STATUS.DISCONNECTED;
            instanceData.qrCode = null;
            await this.dbUpdateDroneInstanceStatus(instanceId, DRONE_STATUS.DISCONNECTED);
            this.emit('instance-update', { instanceId, status: DRONE_STATUS.DISCONNECTED, error: e.message });
            throw e;
        }
    }

    async stopInstance(instanceId) {
        const data = this.clients.get(instanceId);
        if (data && data.client) {
            const { safeDestroyClient } = require("../utils/processCleanup");
            await safeDestroyClient(data.client, `Drone ${instanceId}`);
            data.client = null;
            data.status = DRONE_STATUS.DISCONNECTED;
            data.qrCode = null;
            try {
                await this.dbUpdateDroneInstanceStatus(instanceId, DRONE_STATUS.DISCONNECTED);
            } catch (e) {
                console.error(`Drone: Erro ao atualizar status de ${instanceId} no banco:`, e.message);
            }
            this.emit('instance-update', { instanceId, status: DRONE_STATUS.DISCONNECTED });
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
        return new Promise((resolve, reject) => {
            db.all("SELECT * FROM drone_instances ORDER BY created_at ASC", [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    dbUpdateDroneInstanceStatus(instanceId, status, phoneNumber = null) {
        return new Promise((resolve, reject) => {
            let query = "UPDATE drone_instances SET status = ?, updated_at = CURRENT_TIMESTAMP";
            let params = [status];

            if (phoneNumber) {
                query += ", phone_number = ?";
                params.push(phoneNumber);
            }

            if (status === DRONE_STATUS.CONNECTED) {
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

    dbResetAllDroneInstancesStatus() {
        return new Promise((resolve, reject) => {
            db.run(
                "UPDATE drone_instances SET status = ?",
                [DRONE_STATUS.DISCONNECTED],
                function(err) {
                    if (err) reject(err);
                    else {
                        console.log(`🔄 ${this.changes} instância(s) Drone resetadas para disconnected`);
                        resolve(true);
                    }
                }
            );
        });
    }

    // --- CRUD de Mensagens ---

    dbGetDroneMessages() {
        return new Promise((resolve, reject) => {
            db.all("SELECT * FROM drone_messages ORDER BY id DESC", [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    dbAddDroneMessage(content) {
        return new Promise((resolve, reject) => {
            db.run("INSERT INTO drone_messages (message_content) VALUES (?)", [content], function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, message_content: content });
            });
        });
    }

    dbDeleteDroneMessage(id) {
        return new Promise((resolve, reject) => {
            db.run("DELETE FROM drone_messages WHERE id = ?", [id], function(err) {
                if (err) reject(err);
                else resolve(this.changes > 0);
            });
        });
    }

    // --- CRUD e Lógica de Clientes Destinatários ---

    dbGetDroneClients() {
        return new Promise((resolve, reject) => {
            db.all("SELECT * FROM drone_clients ORDER BY id DESC", [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }

    dbAddDroneClient(name, tel) {
        return new Promise((resolve, reject) => {
            db.run(
                "INSERT OR IGNORE INTO drone_clients (name, tel, status) VALUES (?, ?, 'pending')",
                [name, tel],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID, name, tel, status: "pending" });
                }
            );
        });
    }

    dbAddDroneClientsBatch(clients) {
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run("BEGIN TRANSACTION");
                const stmt = db.prepare("INSERT OR IGNORE INTO drone_clients (name, tel, status) VALUES (?, ?, 'pending')");
                
                let added = 0;
                clients.forEach(c => {
                    stmt.run([c.name, c.tel], function(err) {
                        if (!err && this.changes > 0) {
                            added++;
                        }
                    });
                });

                stmt.finalize((err) => {
                    if (err) {
                        db.run("ROLLBACK");
                        reject(err);
                    } else {
                        db.run("COMMIT", (commitErr) => {
                            if (commitErr) reject(commitErr);
                            else resolve(added);
                        });
                    }
                });
            });
        });
    }

    dbRemoveDroneClient(id) {
        return new Promise((resolve, reject) => {
            db.run("DELETE FROM drone_clients WHERE id = ?", [id], function(err) {
                if (err) reject(err);
                else resolve(this.changes > 0);
            });
        });
    }

    dbClearDroneClients(type = "all") {
        return new Promise((resolve, reject) => {
            let query = "DELETE FROM drone_clients";
            let params = [];
            if (type === "sent") {
                query += " WHERE status = 'sent'";
            } else if (type === "failed") {
                query += " WHERE status = 'failed'";
            }
            db.run(query, params, function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    }

    async dbGetDroneStats() {
        return new Promise((resolve, reject) => {
            db.all("SELECT status, COUNT(*) as count FROM drone_clients GROUP BY status", [], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                const stats = { total: 0, pending: 0, sent: 0, failed: 0 };
                rows.forEach(r => {
                    stats[r.status] = r.count;
                    stats.total += r.count;
                });
                resolve(stats);
            });
        });
    }

    dbUpdateClientStatus(id, status) {
        return new Promise((resolve, reject) => {
            db.run(
                "UPDATE drone_clients SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [status, id],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes > 0);
                }
            );
        });
    }

    // --- Loop de Disparo de Mensagens ---

    getConnectedInstances() {
        const connected = [];
        this.clients.forEach((val, key) => {
            if (val.status === DRONE_STATUS.CONNECTED && val.client) {
                connected.push({
                    instanceId: key,
                    client: val.client,
                    name: val.name
                });
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

    async startDispatch() {
        if (this.isDispatching) return { success: false, message: "Disparo já está rodando." };

        const connected = this.getConnectedInstances();
        if (connected.length === 0) {
            throw new Error("Nenhuma conta de Drone conectada e pronta.");
        }

        // Busca clientes pendentes ou falhos do banco
        const clientsToSend = await new Promise((resolve, reject) => {
            db.all(
                "SELECT * FROM drone_clients WHERE status IN ('pending', 'failed') ORDER BY id ASC",
                [],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });

        if (clientsToSend.length === 0) {
            throw new Error("Nenhum contato pendente ou falho na lista para disparo.");
        }

        const messages = await this.dbGetDroneMessages();
        if (messages.length === 0) {
            throw new Error("Nenhuma mensagem cadastrada. Adicione modelos de mensagens primeiro.");
        }

        this.isDispatching = true;
        this.emit('dispatch-status', { active: true });

        // Inicializa estatísticas de progresso
        this.dispatchProgress = {
            total: clientsToSend.length,
            current: 0,
            sent: 0,
            failed: 0
        };

        // Divide os clientes entre as instâncias disponíveis
        const numClients = clientsToSend.length;
        const numDrones = connected.length;
        const droneTasks = Array.from({ length: numDrones }, () => []);

        for (let i = 0; i < numClients; i++) {
            const droneIndex = i % numDrones;
            droneTasks[droneIndex].push(clientsToSend[i]);
        }

        // Inicia loops paralelos de envio para cada drone
        const promises = connected.map((drone, idx) => {
            const tasks = droneTasks[idx];
            return this.runDroneLoop(drone, tasks, messages);
        });

        // Aguarda todas as tarefas completarem em background
        Promise.all(promises).then(() => {
            this.isDispatching = false;
            this.emit('dispatch-status', { active: false });
            this.emit('dispatch-complete', this.dispatchProgress);
        }).catch(err => {
            console.error("Erro no processamento geral de disparo:", err);
            this.isDispatching = false;
            this.emit('dispatch-status', { active: false });
        });

        return { success: true, message: `Disparo iniciado para ${clientsToSend.length} contatos usando ${connected.length} instâncias.` };
    }

    async runDroneLoop(drone, tasks, messages) {
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

        for (let i = 0; i < tasks.length; i++) {
            if (!this.isDispatching) break;

            const clientData = tasks[i];
            
            // Transforma o número seguindo as configurações
            const formatOptions = {
                prefixoPais: this.config.addCountryPrefix ? this.config.defaultCountryPrefix : null,
                ddd: this.config.addDDD ? this.config.defaultDDD : null,
                adicionar9Digito: this.config.add9thDigit
            };

            const formattedNum = aplicarTransformacoes(clientData.tel, formatOptions);
            const whatsappNumber = formattedNum + "@c.us";

            // Escolhe mensagem aleatória e substitui variáveis
            const msgObj = messages[Math.floor(Math.random() * messages.length)];
            let text = msgObj.message_content;
            
            // Substitui {{name}}
            const clientName = clientData.name || "Cliente";
            text = text.replace(/\{\{name\}\}/g, clientName);

            try {
                // Atualiza status como enviando
                this.emit('dispatch-progress', {
                    clientName: clientName,
                    phoneNumber: clientData.tel,
                    formattedNumber: formattedNum,
                    status: 'sending',
                    droneName: drone.name
                });

                // Envia
                await drone.client.sendMessage(whatsappNumber, text);
                
                // Atualiza banco
                await this.dbUpdateClientStatus(clientData.id, 'sent');
                
                this.dispatchProgress.sent++;
                this.dispatchProgress.current++;

                // Emite log e progresso de sucesso
                const logMsg = `[Enviado] ${drone.name} ➔ ${clientName} (${formattedNum})`;
                this.emit('log', {
                    timestamp: new Date(),
                    droneName: drone.name,
                    clientName: clientName,
                    message: logMsg,
                    status: 'success'
                });
                
                this.emit('dispatch-progress', {
                    clientName: clientName,
                    phoneNumber: clientData.tel,
                    formattedNumber: formattedNum,
                    status: 'sent',
                    droneName: drone.name,
                    progress: this.dispatchProgress
                });

            } catch (err) {
                console.error(`Drone: Erro ao enviar mensagem para ${clientData.tel} usando ${drone.name}:`, err);
                
                // Atualiza banco
                await this.dbUpdateClientStatus(clientData.id, 'failed');
                
                this.dispatchProgress.failed++;
                this.dispatchProgress.current++;

                const logMsg = `[Falha] ${drone.name} ➔ ${clientName} (${formattedNum}): ${err.message}`;
                this.emit('log', {
                    timestamp: new Date(),
                    droneName: drone.name,
                    clientName: clientName,
                    message: logMsg,
                    status: 'failed'
                });

                this.emit('dispatch-progress', {
                    clientName: clientName,
                    phoneNumber: clientData.tel,
                    formattedNumber: formattedNum,
                    status: 'failed',
                    error: err.message,
                    droneName: drone.name,
                    progress: this.dispatchProgress
                });
            }

            // Aguarda delay configurado se não for o último item
            if (i < tasks.length - 1 && this.isDispatching) {
                const waitTime = getRandomInt(this.config.minIntervalSeconds * 1000, this.config.maxIntervalSeconds * 1000);
                await delay(waitTime);
            }
        }
    }

    async stopDispatch() {
        this.isDispatching = false;
        this.emit('dispatch-status', { active: false });
        return { success: true };
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
