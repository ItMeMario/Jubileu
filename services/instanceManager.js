// services/instanceManager.js
const { Client, LocalAuth } = require("whatsapp-web.js");
const path = require("path");
const fs = require("fs").promises;
const { debug } = require("./debugService");
const startScout = require("../utils/scout");
const {
  INSTANCE_STATUS,
  MAX_INSTANCES,
  getAllInstances,
  getInstanceById,
  createInstance,
  updateInstanceStatus,
  updateInstanceName,
  deleteInstance,
  countActiveInstances,
} = require("../config/initialize");

/**
 * Gerenciador central de instâncias WhatsApp
 * Responsável por criar, gerenciar e destruir clientes WhatsApp
 */
class InstanceManager {
  constructor() {
    // Map de clientes ativos: instanceId -> { client, status, qrCode, info }
    this.clients = new Map();

    // Callbacks para eventos (serão registrados pelo IPC)
    this.eventCallbacks = new Map();

    // Flag de inicialização
    this.isInitialized = false;
  }

  /**
   * Obtém o caminho do executável do Chrome
   * @returns {string}
   */
  getChromeExecutablePath() {
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
   * Obtém o caminho base para sessões
   * @returns {string}
   */
  getBaseSessionPath() {
    try {
      const { app } = require("electron");

      if (app && app.isPackaged) {
        const userDataPath = app.getPath("userData");
        return path.join(userDataPath, "whatsapp-sessions");
      } else {
        return path.join(__dirname, "../.wwebjs_auth");
      }
    } catch (error) {
      return path.join(__dirname, "../.wwebjs_auth");
    }
  }

  /**
   * Obtém o caminho da sessão para uma instância específica
   * @param {string} instanceId - ID da instância
   * @returns {string}
   */
  getSessionPath(instanceId) {
    return path.join(this.getBaseSessionPath(), instanceId);
  }

  /**
   * Cria configuração do Puppeteer
   * @returns {Object}
   */
  getPuppeteerConfig() {
    return {
      executablePath: this.getChromeExecutablePath(),
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-features=TranslateUI",
        "--disable-ipc-flooding-protection",
        "--disable-extensions",
        "--disable-default-apps",
        "--disable-sync",
        "--disable-translate",
        "--hide-scrollbars",
        "--mute-audio",
        "--disable-software-rasterizer",
        "--disable-dev-tools",
        "--disable-webgl",
        "--disable-threaded-animation",
        "--disable-threaded-scrolling",
        "--disable-in-process-stack-traces",
        "--disable-histogram-customizer",
        "--disable-gl-extensions",
        "--disable-composited-antialiasing",
        "--disable-canvas-aa",
        "--disable-3d-apis",
        "--disable-breakpad",
        "--disable-component-update",
        "--disable-print-preview",
        "--disable-features=AudioServiceOutOfProcess",
        "--disable-features=IsolateOrigins",
        "--disable-features=site-per-process",
        "--disable-blink-features=AutomationControlled",
      ],
      timeout: 60000,
    };
  }

  /**
   * Registra callback para eventos de instâncias
   * @param {string} event - Nome do evento
   * @param {Function} callback - Função callback
   */
  on(event, callback) {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event).push(callback);
  }

  /**
   * Emite evento para callbacks registrados
   * @param {string} event - Nome do evento
   * @param {string} instanceId - ID da instância
   * @param {any} data - Dados do evento
   */
  emit(event, instanceId, data) {
    const callbacks = this.eventCallbacks.get(event) || [];
    callbacks.forEach((callback) => {
      try {
        callback(instanceId, data);
      } catch (error) {
        console.error(`Erro no callback do evento ${event}:`, error);
      }
    });
  }

  /**
   * Cria um novo cliente WhatsApp para uma instância
   * @param {string} instanceId - ID da instância
   * @returns {Client}
   */
  createClient(instanceId) {
    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: instanceId,
        dataPath: this.getBaseSessionPath(),
      }),
      puppeteer: this.getPuppeteerConfig(),
    });

    return client;
  }

  /**
   * Configura os event listeners de um cliente
   * @param {string} instanceId - ID da instância
   * @param {Client} client - Cliente WhatsApp
   */
  setupClientEvents(instanceId, client) {
    // QR Code
    client.on("qr", async (qr) => {
      await debug(`[${instanceId}] 📱 QR Code recebido`);

      // Atualiza estado local
      const instanceData = this.clients.get(instanceId);
      if (instanceData) {
        instanceData.qrCode = qr;
        instanceData.status = INSTANCE_STATUS.QR_PENDING;
      }

      // Atualiza banco de dados
      await updateInstanceStatus(instanceId, INSTANCE_STATUS.QR_PENDING);

      // Emite evento
      this.emit("qr", instanceId, qr);
    });

    // Autenticado
    client.on("authenticated", async () => {
      await debug(`[${instanceId}] ✅ Autenticado`);

      const instanceData = this.clients.get(instanceId);
      if (instanceData) {
        instanceData.qrCode = null;
        instanceData.status = INSTANCE_STATUS.CONNECTING;
      }

      await updateInstanceStatus(instanceId, INSTANCE_STATUS.CONNECTING);
      this.emit("authenticated", instanceId, null);
    });

    // Pronto
    client.on("ready", async () => {
      await debug(`[${instanceId}] ✅ Cliente pronto!`);

      const instanceData = this.clients.get(instanceId);
      if (instanceData) {
        instanceData.status = INSTANCE_STATUS.CONNECTED;
        instanceData.info = client.info;
      }

      // Obtém número do telefone
      const phoneNumber = client.info?.wid?.user || null;

      await updateInstanceStatus(
        instanceId,
        INSTANCE_STATUS.CONNECTED,
        phoneNumber
      );

      this.emit("ready", instanceId, client.info);
    });

    // Falha de autenticação
    client.on("auth_failure", async (msg) => {
      await debug(`[${instanceId}] ❌ Falha na autenticação: ${msg}`);

      const instanceData = this.clients.get(instanceId);
      if (instanceData) {
        instanceData.status = INSTANCE_STATUS.AUTH_FAILURE;
        instanceData.qrCode = null;
      }

      await updateInstanceStatus(instanceId, INSTANCE_STATUS.AUTH_FAILURE);
      this.emit("auth_failure", instanceId, msg);
    });

    // Desconectado
    client.on("disconnected", async (reason) => {
      await debug(`[${instanceId}] 🔌 Desconectado: ${reason}`);

      const instanceData = this.clients.get(instanceId);
      if (instanceData) {
        instanceData.status = INSTANCE_STATUS.DISCONNECTED;
        instanceData.qrCode = null;
        instanceData.info = null;
      }

      await updateInstanceStatus(instanceId, INSTANCE_STATUS.DISCONNECTED);
      this.emit("disconnected", instanceId, reason);

      // Se foi logout, limpa a sessão
      if (reason === "LOGOUT" || reason === "UNPAIRED") {
        await this.clearSession(instanceId);
      }
    });

    // Loading screen
    client.on("loading_screen", async (percent, message) => {
      await debug(`[${instanceId}] ⏳ Carregando: ${percent}% - ${message}`);
      this.emit("loading", instanceId, { percent, message });
    });

    // Mudança de estado
    client.on("change_state", async (state) => {
      await debug(`[${instanceId}] 🔄 Estado: ${state}`);
      this.emit("state_change", instanceId, state);
    });

    // Mensagem recebida
    client.on("message", async (msg) => {
      this.emit("message", instanceId, msg);
    });
  }

  /**
   * Inicializa o gerenciador carregando instâncias do banco
   */
  async initialize() {
    if (this.isInitialized) {
      await debug("InstanceManager já inicializado");
      return;
    }

    await debug("🚀 Inicializando InstanceManager...");

    try {
      // Carrega instâncias do banco de dados
      const instances = await getAllInstances();
      await debug(`📋 ${instances.length} instância(s) encontrada(s) no banco`);

      this.isInitialized = true;
      await debug("✅ InstanceManager inicializado");
    } catch (error) {
      console.error("❌ Erro ao inicializar InstanceManager:", error);
      throw error;
    }
  }

  /**
   * Cria uma nova instância
   * @param {string} name - Nome da instância
   * @param {string} type - Tipo da instância (default: 'whatsapp')
   * @returns {Promise<Object>}
   */
  async addInstance(name, type = 'whatsapp') {
    // Verifica limite
    const count = await countActiveInstances();
    if (count >= MAX_INSTANCES) {
      throw new Error(`Limite máximo de ${MAX_INSTANCES} instâncias atingido`);
    }

    // Cria no banco de dados
    const instance = await createInstance(name, type);
    await debug(`✅ Instância criada: ${instance.instance_id} (${name}) - Tipo: ${type}`);

    return instance;
  }

  /**
   * Inicia uma instância (conecta ao WhatsApp)
   * @param {string} instanceId - ID da instância
   * @returns {Promise<Object>}
   */
  async startInstance(instanceId) {
    // Verifica se já está rodando
    if (this.clients.has(instanceId)) {
      const existingData = this.clients.get(instanceId);
      if (
        existingData.status === INSTANCE_STATUS.CONNECTED ||
        existingData.status === INSTANCE_STATUS.CONNECTING
      ) {
        return {
          success: false,
          message: "Instância já está conectada ou conectando",
        };
      }

      // Se existe mas está desconectada, destrói antes de recriar
      await this.destroyClient(instanceId);
    }

    // Verifica se existe no banco
    const instance = await getInstanceById(instanceId);
    if (!instance) {
      throw new Error(`Instância não encontrada: ${instanceId}`);
    }

    await debug(`🚀 Iniciando instância: ${instanceId}`);

    // Cria novo cliente
    const client = this.createClient(instanceId);

    // Armazena no Map
    this.clients.set(instanceId, {
      client,
      status: INSTANCE_STATUS.CONNECTING,
      qrCode: null,
      info: null,
      name: instance.name,
    });

    // Atualiza status no banco
    await updateInstanceStatus(instanceId, INSTANCE_STATUS.CONNECTING);

    // Configura eventos
    this.setupClientEvents(instanceId, client);

    // Inicia o Scout para esta instância
    startScout(client);

    // Inicializa cliente
    try {
      await client.initialize();
      return { success: true, message: "Instância iniciada" };
    } catch (error) {
      await debug(
        `❌ Erro ao iniciar instância ${instanceId}: ${error.message}`
      );

      // Atualiza status para desconectado
      const instanceData = this.clients.get(instanceId);
      if (instanceData) {
        instanceData.status = INSTANCE_STATUS.DISCONNECTED;
      }
      await updateInstanceStatus(instanceId, INSTANCE_STATUS.DISCONNECTED);

      throw error;
    }
  }

  /**
   * Para uma instância (desconecta do WhatsApp)
   * @param {string} instanceId - ID da instância
   * @returns {Promise<Object>}
   */
  async stopInstance(instanceId) {
    await debug(`🛑 Parando instância: ${instanceId}`);

    await this.destroyClient(instanceId);
    await updateInstanceStatus(instanceId, INSTANCE_STATUS.DISCONNECTED);

    return { success: true, message: "Instância parada" };
  }

  /**
   * Destrói um cliente completamente
   * @param {string} instanceId - ID da instância
   */
  async destroyClient(instanceId) {
    const instanceData = this.clients.get(instanceId);

    if (!instanceData) {
      return;
    }

    try {
      const { client } = instanceData;

      // Remove listeners
      client.removeAllListeners();

      // Destrói se tiver página aberta
      if (client.pupPage) {
        await client.destroy();
      }

      await debug(`✅ Cliente ${instanceId} destruído`);
    } catch (error) {
      console.error(`Erro ao destruir cliente ${instanceId}:`, error.message);
    } finally {
      // Remove do Map
      this.clients.delete(instanceId);
    }
  }

  /**
   * Limpa a sessão de uma instância
   * @param {string} instanceId - ID da instância
   */
  async clearSession(instanceId) {
    const sessionPath = this.getSessionPath(instanceId);

    try {
      await fs.rm(sessionPath, { recursive: true, force: true });
      await debug(`🗑️ Sessão limpa: ${instanceId}`);
    } catch (error) {
      console.warn(`Erro ao limpar sessão ${instanceId}:`, error.message);
    }
  }

  /**
   * Remove uma instância completamente
   * @param {string} instanceId - ID da instância
   * @returns {Promise<Object>}
   */
  async removeInstance(instanceId) {
    await debug(`🗑️ Removendo instância: ${instanceId}`);

    // Para o cliente se estiver rodando
    await this.destroyClient(instanceId);

    // Limpa sessão
    await this.clearSession(instanceId);

    // Remove do banco (soft delete)
    await deleteInstance(instanceId);

    return { success: true, message: "Instância removida" };
  }

  /**
   * Obtém o cliente de uma instância
   * @param {string} instanceId - ID da instância
   * @returns {Client|null}
   */
  getClient(instanceId) {
    const instanceData = this.clients.get(instanceId);
    return instanceData?.client || null;
  }

  /**
   * Obtém o status de uma instância
   * @param {string} instanceId - ID da instância
   * @returns {Object}
   */
  getInstanceStatus(instanceId) {
    const instanceData = this.clients.get(instanceId);

    if (!instanceData) {
      return {
        instanceId,
        status: INSTANCE_STATUS.DISCONNECTED,
        qrCode: null,
        info: null,
      };
    }

    return {
      instanceId,
      status: instanceData.status,
      qrCode: instanceData.qrCode,
      info: instanceData.info,
      name: instanceData.name,
    };
  }

  /**
   * Obtém status de todas as instâncias ativas em memória
   * @returns {Array}
   */
  getAllInstancesStatus() {
    const statuses = [];

    for (const [instanceId, data] of this.clients) {
      statuses.push({
        instanceId,
        status: data.status,
        qrCode: data.qrCode,
        info: data.info,
        name: data.name,
      });
    }

    return statuses;
  }

  /**
   * Lista todas as instâncias (do banco + status em memória)
   * @returns {Promise<Array>}
   */
  async listInstances() {
    const dbInstances = await getAllInstances();

    return dbInstances.map((instance) => {
      const memoryData = this.clients.get(instance.instance_id);

      return {
        ...instance,
        // Sobrescreve com dados em memória se disponível
        status: memoryData?.status || instance.status,
        qrCode: memoryData?.qrCode || null,
        info: memoryData?.info || null,
        isRunning: !!memoryData,
      };
    });
  }

  /**
   * Atualiza o nome de uma instância
   * @param {string} instanceId - ID da instância
   * @param {string} name - Novo nome
   * @returns {Promise<boolean>}
   */
  async renameInstance(instanceId, name) {
    const updated = await updateInstanceName(instanceId, name);

    // Atualiza em memória também
    const instanceData = this.clients.get(instanceId);
    if (instanceData) {
      instanceData.name = name;
    }

    return updated;
  }

  /**
   * Para todas as instâncias (usado no cleanup)
   */
  async stopAll() {
    await debug("🛑 Parando todas as instâncias...");

    const instanceIds = Array.from(this.clients.keys());

    for (const instanceId of instanceIds) {
      try {
        await this.stopInstance(instanceId);
      } catch (error) {
        console.error(`Erro ao parar instância ${instanceId}:`, error.message);
      }
    }

    await debug("✅ Todas as instâncias paradas");
  }

  /**
   * Reconecta uma instância (limpa sessão e reinicia)
   * @param {string} instanceId - ID da instância
   * @returns {Promise<Object>}
   */
  async reconnectInstance(instanceId) {
    await debug(`🔄 Reconectando instância: ${instanceId}`);

    // Para e limpa
    await this.destroyClient(instanceId);
    await this.clearSession(instanceId);

    // Aguarda um pouco
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Reinicia
    return await this.startInstance(instanceId);
  }
}

// Exporta instância singleton
const instanceManager = new InstanceManager();

module.exports = {
  instanceManager,
  InstanceManager,
};
