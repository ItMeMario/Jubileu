// services/droneServiceModules/droneInstanceManagerDSM.js
const { Client, LocalAuth } = require("whatsapp-web.js");
const path = require("path");
const fs = require("fs").promises;
const { debug } = require("../debugService");
const browserHelper = require("../../utils/browserHelper");
const startScout = require("../../utils/scout");
const {
  INSTANCE_STATUS,
  MAX_INSTANCES,
} = require("../../config/initialize");
const {
  getAllDroneInstances,
  getDroneInstanceById,
  createDroneInstance,
  updateDroneInstanceStatus,
  updateDroneInstanceName,
  deleteDroneInstance,
  countActiveDroneInstances,
} = require("../../config/initializeModules/droneInstancesIM");

/**
 * Gerenciador de instâncias WhatsApp para o Drone
 */
class DroneInstanceManager {
  constructor() {
    this.clients = new Map();
    this.eventCallbacks = new Map();
    this.isInitialized = false;
  }

  getBaseSessionPath() {
    try {
      const { app } = require("electron");
      if (app && app.isPackaged) {
        const userDataPath = app.getPath("userData");
        return path.join(userDataPath, "whatsapp-sessions-drone");
      } else {
        return path.join(__dirname, "../../../.wwebjs_auth_drone");
      }
    } catch (error) {
      return path.join(__dirname, "../../../.wwebjs_auth_drone");
    }
  }

  getSessionPath(instanceId) {
    return path.join(this.getBaseSessionPath(), instanceId);
  }

  getPuppeteerConfig() {
    const executablePath = browserHelper.getChromeExecutablePath();
    if (!executablePath) {
        console.warn("DroneInstanceManager: Chrome não encontrado pelo browserHelper. Usando padrão do Puppeteer.");
    }

    return {
      executablePath: executablePath,
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

  on(event, callback) {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event).push(callback);
  }

  emit(event, instanceId, data) {
    const callbacks = this.eventCallbacks.get(event) || [];
    callbacks.forEach((callback) => {
      try {
        callback(instanceId, data);
      } catch (error) {
        console.error(`Erro no callback do evento ${event} (Drone):`, error);
      }
    });
  }

  createClient(instanceId) {
    return new Client({
      authStrategy: new LocalAuth({
        clientId: instanceId,
        dataPath: this.getBaseSessionPath(),
      }),
      puppeteer: this.getPuppeteerConfig(),
    });
  }

  setupClientEvents(instanceId, client) {
    client.on("qr", async (qr) => {
      await debug(`[Drone ${instanceId}] 📱 QR Code recebido`);
      try {
        const QRCode = require("qrcode");
        const qrImage = await QRCode.toDataURL(qr, {
          width: 300,
          margin: 2,
        });
        const instanceData = this.clients.get(instanceId);
        if (instanceData) {
          instanceData.qrCode = qrImage;
          instanceData.status = INSTANCE_STATUS.QR_PENDING;
        }
        await updateDroneInstanceStatus(instanceId, INSTANCE_STATUS.QR_PENDING);
        this.emit("qr", instanceId, qrImage);
      } catch (err) {
        console.error(`Erro ao gerar QR Code para Drone ${instanceId}:`, err);
      }
    });

    client.on("authenticated", async () => {
      await debug(`[Drone ${instanceId}] ✅ Autenticado`);
      const instanceData = this.clients.get(instanceId);
      if (instanceData) {
        instanceData.qrCode = null;
        instanceData.status = INSTANCE_STATUS.CONNECTING;
      }
      await updateDroneInstanceStatus(instanceId, INSTANCE_STATUS.CONNECTING);
      this.emit("authenticated", instanceId, null);
    });

    client.on("ready", async () => {
      await debug(`[Drone ${instanceId}] ✅ Cliente pronto!`);
      const instanceData = this.clients.get(instanceId);
      if (instanceData) {
        instanceData.status = INSTANCE_STATUS.CONNECTED;
        instanceData.info = client.info;
      }
      const phoneNumber = client.info?.wid?.user || null;
      await updateDroneInstanceStatus(instanceId, INSTANCE_STATUS.CONNECTED, phoneNumber);
      this.emit("ready", instanceId, client.info);
    });

    client.on("auth_failure", async (msg) => {
      await debug(`[Drone ${instanceId}] ❌ Falha na autenticação: ${msg}`);
      const instanceData = this.clients.get(instanceId);
      if (instanceData) {
        instanceData.status = INSTANCE_STATUS.AUTH_FAILURE;
        instanceData.qrCode = null;
      }
      await updateDroneInstanceStatus(instanceId, INSTANCE_STATUS.AUTH_FAILURE);
      this.emit("auth_failure", instanceId, msg);
    });

    client.on("disconnected", async (reason) => {
      await debug(`[Drone ${instanceId}] 🔌 Desconectado: ${reason}`);
      const instanceData = this.clients.get(instanceId);
      if (instanceData) {
        instanceData.status = INSTANCE_STATUS.DISCONNECTED;
        instanceData.qrCode = null;
        instanceData.info = null;
      }
      await updateDroneInstanceStatus(instanceId, INSTANCE_STATUS.DISCONNECTED);
      this.emit("disconnected", instanceId, reason);
      if (reason === "LOGOUT" || reason === "UNPAIRED") {
        await this.clearSession(instanceId);
      }
    });

    client.on("loading_screen", async (percent, message) => {
      await debug(`[Drone ${instanceId}] ⏳ Carregando: ${percent}% - ${message}`);
      this.emit("loading", instanceId, { percent, message });
    });

    client.on("change_state", async (state) => {
      await debug(`[Drone ${instanceId}] 🔄 Estado: ${state}`);
      this.emit("state_change", instanceId, state);
    });

    client.on("message", async (msg) => {
      this.emit("message", instanceId, msg);
    });
  }

  async initialize() {
    if (this.isInitialized) return;
    await debug("🚀 Inicializando DroneInstanceManager...");
    try {
      const instances = await getAllDroneInstances();
      await debug(`📋 ${instances.length} instância(s) de Drone encontrada(s) no banco`);
      this.isInitialized = true;
    } catch (error) {
      console.error("❌ Erro ao inicializar DroneInstanceManager:", error);
      throw error;
    }
  }

  async addInstance(name) {
    const count = await countActiveDroneInstances();
    if (count >= MAX_INSTANCES) {
      throw new Error(`Limite máximo de ${MAX_INSTANCES} instâncias de Drone atingido`);
    }
    const instance = await createDroneInstance(name);
    await debug(`✅ Instância Drone criada: ${instance.instance_id} (${name})`);
    return instance;
  }

  async startInstance(instanceId) {
    if (this.clients.has(instanceId)) {
      const existingData = this.clients.get(instanceId);
      if (
        existingData.status === INSTANCE_STATUS.CONNECTED ||
        existingData.status === INSTANCE_STATUS.CONNECTING
      ) {
        return { success: false, message: "Instância já está conectada ou conectando" };
      }
      await this.destroyClient(instanceId);
    }

    const instance = await getDroneInstanceById(instanceId);
    if (!instance) {
      throw new Error(`Instância Drone não encontrada: ${instanceId}`);
    }

    await debug(`🚀 Iniciando instância Drone: ${instanceId}`);
    const client = this.createClient(instanceId);

    this.clients.set(instanceId, {
      client,
      status: INSTANCE_STATUS.CONNECTING,
      qrCode: null,
      info: null,
      name: instance.name,
    });

    await updateDroneInstanceStatus(instanceId, INSTANCE_STATUS.CONNECTING);
    this.setupClientEvents(instanceId, client);
    startScout(client);

    try {
      await client.initialize();
      return { success: true, message: "Instância iniciada" };
    } catch (error) {
      await debug(`❌ Erro ao iniciar instância Drone ${instanceId}: ${error.message}`);
      const instanceData = this.clients.get(instanceId);
      if (instanceData) {
        instanceData.status = INSTANCE_STATUS.DISCONNECTED;
      }
      await updateDroneInstanceStatus(instanceId, INSTANCE_STATUS.DISCONNECTED);
      throw error;
    }
  }

  async stopInstance(instanceId) {
    await debug(`🛑 Parando instância Drone: ${instanceId}`);
    await this.destroyClient(instanceId);
    await updateDroneInstanceStatus(instanceId, INSTANCE_STATUS.DISCONNECTED);
    return { success: true, message: "Instância parada" };
  }

  async destroyClient(instanceId) {
    const instanceData = this.clients.get(instanceId);
    if (!instanceData) return;
    try {
      const { client } = instanceData;
      client.removeAllListeners();
      if (client.pupPage) {
        await client.destroy();
      }
      await debug(`✅ Cliente Drone ${instanceId} destruído`);
    } catch (error) {
      console.error(`Erro ao destruir cliente Drone ${instanceId}:`, error.message);
    } finally {
      this.clients.delete(instanceId);
    }
  }

  async clearSession(instanceId) {
    const sessionPath = this.getSessionPath(instanceId);
    try {
      await fs.rm(sessionPath, { recursive: true, force: true });
      await debug(`🗑️ Sessão Drone limpa: ${instanceId}`);
    } catch (error) {
      console.warn(`Erro ao limpar sessão Drone ${instanceId}:`, error.message);
    }
  }

  async removeInstance(instanceId) {
    await debug(`🗑️ Removendo instância Drone: ${instanceId}`);
    await this.destroyClient(instanceId);
    await this.clearSession(instanceId);
    await deleteDroneInstance(instanceId);
    return { success: true, message: "Instância removida" };
  }

  getClient(instanceId) {
    const instanceData = this.clients.get(instanceId);
    return instanceData?.client || null;
  }

  getInstanceStatus(instanceId) {
    const instanceData = this.clients.get(instanceId);
    if (!instanceData) {
      return { instanceId, status: INSTANCE_STATUS.DISCONNECTED, qrCode: null, info: null };
    }
    return {
      instanceId,
      status: instanceData.status,
      qrCode: instanceData.qrCode,
      info: instanceData.info,
      name: instanceData.name,
    };
  }

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

  async listInstances() {
    const dbInstances = await getAllDroneInstances();
    return dbInstances.map((instance) => {
      const memoryData = this.clients.get(instance.instance_id);
      return {
        ...instance,
        status: memoryData?.status || instance.status,
        qrCode: memoryData?.qrCode || null,
        info: memoryData?.info || null,
        isRunning: !!memoryData,
      };
    });
  }

  async renameInstance(instanceId, name) {
    const updated = await updateDroneInstanceName(instanceId, name);
    const instanceData = this.clients.get(instanceId);
    if (instanceData) {
      instanceData.name = name;
    }
    return updated;
  }

  async stopAll() {
    await debug("🛑 Parando todas as instâncias do Drone...");
    const instanceIds = Array.from(this.clients.keys());
    for (const instanceId of instanceIds) {
      try {
        await this.stopInstance(instanceId);
      } catch (error) {
        console.error(`Erro ao parar instância Drone ${instanceId}:`, error.message);
      }
    }
    await debug("✅ Todas as instâncias do Drone paradas");
  }

  async reconnectInstance(instanceId) {
    await debug(`🔄 Reconectando instância Drone: ${instanceId}`);
    await this.destroyClient(instanceId);
    await this.clearSession(instanceId);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return await this.startInstance(instanceId);
  }
}

const droneInstanceManager = new DroneInstanceManager();

module.exports = {
  droneInstanceManager,
  DroneInstanceManager,
};
