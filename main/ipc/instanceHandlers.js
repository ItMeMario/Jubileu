// main/ipc/instanceHandlers.js
const { BrowserWindow } = require("electron");
const QRCode = require("qrcode");
const { instanceManager } = require("../../services/instanceManager");
const { debug } = require("../../services/debugService");
const { sendMessageOptions } = require("../../config/compatibility/whatsappCompatibility");

/**
 * Handlers IPC para gerenciamento de instâncias WhatsApp
 */
class InstanceHandlers {
  constructor(modules = {}) {
    this.windowManager = modules.windowManager;
    this.messageHandler = modules.messageHandler;

    // Flag para controlar se os eventos já foram configurados
    this.eventsConfigured = false;
  }

  /**
   * Configura os event listeners do instanceManager
   * Deve ser chamado após a criação dos handlers
   */
  setupInstanceEvents() {
    if (this.eventsConfigured) {
      return;
    }

    // QR Code gerado
    instanceManager.on("qr", async (instanceId, qr) => {
      try {
        const qrImage = await QRCode.toDataURL(qr, {
          width: 300,
          margin: 2,
        });

        this.sendToRenderer("instance-qr", {
          instanceId,
          qrImage,
          qrText: qr,
        });
      } catch (error) {
        console.error(`Erro ao gerar QR Code para ${instanceId}:`, error);
      }
    });

    // Autenticado
    instanceManager.on("authenticated", (instanceId) => {
      this.sendToRenderer("instance-authenticated", { instanceId });
    });

    // Pronto
    instanceManager.on("ready", (instanceId, info) => {
      this.sendToRenderer("instance-ready", {
        instanceId,
        info: {
          phoneNumber: info?.wid?.user || null,
          pushname: info?.pushname || null,
        },
      });
    });

    // Falha de autenticação
    instanceManager.on("auth_failure", (instanceId, message) => {
      this.sendToRenderer("instance-auth-failure", {
        instanceId,
        message,
      });
    });

    // Desconectado
    instanceManager.on("disconnected", (instanceId, reason) => {
      this.sendToRenderer("instance-disconnected", {
        instanceId,
        reason,
      });
    });

    // Loading
    instanceManager.on("loading", (instanceId, data) => {
      this.sendToRenderer("instance-loading", {
        instanceId,
        percent: data.percent,
        message: data.message,
      });
    });

    // Mudança de estado
    instanceManager.on("state_change", (instanceId, state) => {
      this.sendToRenderer("instance-state-change", {
        instanceId,
        state,
      });
    });

    // Mensagem recebida
    instanceManager.on("message", async (instanceId, msg) => {
      if (this.messageHandler) {
        try {
          // Passa o instanceId junto com a mensagem para o handler
          await this.messageHandler(msg, instanceId);
        } catch (error) {
          console.error(
            `Erro ao processar mensagem da instância ${instanceId}:`,
            error
          );
        }
      }
    });

    this.eventsConfigured = true;
    debug("✅ Eventos do InstanceManager configurados");
  }

  /**
   * Envia mensagem para o renderer (todas as janelas)
   * @param {string} channel - Canal IPC
   * @param {any} data - Dados a enviar
   */
  sendToRenderer(channel, data) {
    try {
      const windows = BrowserWindow.getAllWindows();
      windows.forEach((win) => {
        if (win && !win.isDestroyed()) {
          win.webContents.send(channel, data);
        }
      });
    } catch (error) {
      console.error(`Erro ao enviar para renderer (${channel}):`, error);
    }
  }

  register(ipcMain) {
    ipcMain.handle("instance-initialize", this.initialize.bind(this));
    ipcMain.handle("instance-list", this.listInstances.bind(this));
    ipcMain.handle("instance-create", this.createInstance.bind(this));
    ipcMain.handle("instance-remove", this.removeInstance.bind(this));
    ipcMain.handle("instance-rename", this.renameInstance.bind(this));
    ipcMain.handle("instance-start", this.startInstance.bind(this));
    ipcMain.handle("instance-stop", this.stopInstance.bind(this));
    ipcMain.handle("instance-reconnect", this.reconnectInstance.bind(this));
    ipcMain.handle("instance-stop-all", this.stopAllInstances.bind(this));
    ipcMain.handle("instance-status", this.getInstanceStatus.bind(this));
    ipcMain.handle("instance-status-all", this.getAllInstancesStatus.bind(this));
    ipcMain.handle("instance-client-info", this.getClientInfo.bind(this));
    ipcMain.handle("instance-send-message", this.sendMessage.bind(this));
    ipcMain.handle("instance-get-config", this.getConfig.bind(this));
  }

  unregister(ipcMain) {
    ipcMain.removeHandler("instance-initialize");
    ipcMain.removeHandler("instance-list");
    ipcMain.removeHandler("instance-create");
    ipcMain.removeHandler("instance-remove");
    ipcMain.removeHandler("instance-rename");
    ipcMain.removeHandler("instance-start");
    ipcMain.removeHandler("instance-stop");
    ipcMain.removeHandler("instance-reconnect");
    ipcMain.removeHandler("instance-stop-all");
    ipcMain.removeHandler("instance-status");
    ipcMain.removeHandler("instance-status-all");
    ipcMain.removeHandler("instance-client-info");
    ipcMain.removeHandler("instance-send-message");
    ipcMain.removeHandler("instance-get-config");
  }

  /**
   * Inicializa o gerenciador de instâncias
   */
  async initialize() {
    try {
      await instanceManager.initialize();
      this.setupInstanceEvents();
      return { success: true, message: "InstanceManager inicializado" };
    } catch (error) {
      console.error("Erro ao inicializar InstanceManager:", error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Lista todas as instâncias
   */
  async listInstances() {
    try {
      const instances = await instanceManager.listInstances();
      return { success: true, data: instances };
    } catch (error) {
      console.error("Erro ao listar instâncias:", error);
      return { success: false, message: error.message, data: [] };
    }
  }

  /**
   * Cria uma nova instância
   * @param {Event} event - Evento IPC
   * @param {Object} params - Parâmetros { name, type }
   */
  async createInstance(event, { name, type = 'whatsapp' }) {
    try {
      if (!name || name.trim() === "") {
        return { success: false, message: "Nome da instância é obrigatório" };
      }

      const instance = await instanceManager.addInstance(name.trim(), type);

      this.sendToRenderer("instance-created", { instance });

      return { success: true, data: instance };
    } catch (error) {
      console.error("Erro ao criar instância:", error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Inicia uma instância
   * @param {Event} event - Evento IPC
   * @param {Object} params - Parâmetros { instanceId }
   */
  async startInstance(event, { instanceId }) {
    try {
      if (!instanceId) {
        return { success: false, message: "ID da instância é obrigatório" };
      }

      const result = await instanceManager.startInstance(instanceId);

      return result;
    } catch (error) {
      console.error(`Erro ao iniciar instância ${instanceId}:`, error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Para uma instância
   * @param {Event} event - Evento IPC
   * @param {Object} params - Parâmetros { instanceId }
   */
  async stopInstance(event, { instanceId }) {
    try {
      if (!instanceId) {
        return { success: false, message: "ID da instância é obrigatório" };
      }

      const result = await instanceManager.stopInstance(instanceId);

      this.sendToRenderer("instance-stopped", { instanceId });

      return result;
    } catch (error) {
      console.error(`Erro ao parar instância ${instanceId}:`, error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Remove uma instância
   * @param {Event} event - Evento IPC
   * @param {Object} params - Parâmetros { instanceId }
   */
  async removeInstance(event, { instanceId }) {
    try {
      if (!instanceId) {
        return { success: false, message: "ID da instância é obrigatório" };
      }

      const result = await instanceManager.removeInstance(instanceId);

      this.sendToRenderer("instance-removed", { instanceId });

      return result;
    } catch (error) {
      console.error(`Erro ao remover instância ${instanceId}:`, error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Renomeia uma instância
   * @param {Event} event - Evento IPC
   * @param {Object} params - Parâmetros { instanceId, name }
   */
  async renameInstance(event, { instanceId, name }) {
    try {
      if (!instanceId || !name) {
        return { success: false, message: "ID e nome são obrigatórios" };
      }

      const updated = await instanceManager.renameInstance(
        instanceId,
        name.trim()
      );

      if (updated) {
        this.sendToRenderer("instance-renamed", {
          instanceId,
          name: name.trim(),
        });
      }

      return {
        success: updated,
        message: updated ? "Instância renomeada" : "Instância não encontrada",
      };
    } catch (error) {
      console.error(`Erro ao renomear instância ${instanceId}:`, error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Reconecta uma instância (limpa sessão e reinicia)
   * @param {Event} event - Evento IPC
   * @param {Object} params - Parâmetros { instanceId }
   */
  async reconnectInstance(event, { instanceId }) {
    try {
      if (!instanceId) {
        return { success: false, message: "ID da instância é obrigatório" };
      }

      this.sendToRenderer("instance-reconnecting", { instanceId });

      const result = await instanceManager.reconnectInstance(instanceId);

      return result;
    } catch (error) {
      console.error(`Erro ao reconectar instância ${instanceId}:`, error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Obtém status de uma instância específica
   * @param {Event} event - Evento IPC
   * @param {Object} params - Parâmetros { instanceId }
   */
  async getInstanceStatus(event, { instanceId }) {
    try {
      if (!instanceId) {
        return { success: false, message: "ID da instância é obrigatório" };
      }

      const status = instanceManager.getInstanceStatus(instanceId);

      return { success: true, data: status };
    } catch (error) {
      console.error(`Erro ao obter status da instância ${instanceId}:`, error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Obtém status de todas as instâncias em memória
   */
  async getAllInstancesStatus() {
    try {
      const statuses = instanceManager.getAllInstancesStatus();
      return { success: true, data: statuses };
    } catch (error) {
      console.error("Erro ao obter status das instâncias:", error);
      return { success: false, message: error.message, data: [] };
    }
  }

  /**
   * Para todas as instâncias
   */
  async stopAllInstances() {
    try {
      await instanceManager.stopAll();
      this.sendToRenderer("all-instances-stopped", {});
      return { success: true, message: "Todas as instâncias paradas" };
    } catch (error) {
      console.error("Erro ao parar todas as instâncias:", error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Envia mensagem através de uma instância específica
   * @param {Event} event - Evento IPC
   * @param {Object} params - Parâmetros { instanceId, to, message }
   */
  async sendMessage(event, { instanceId, to, message }) {
    try {
      if (!instanceId || !to || !message) {
        return {
          success: false,
          message: "instanceId, to e message são obrigatórios",
        };
      }

      const client = instanceManager.getClient(instanceId);

      if (!client) {
        return { success: false, message: "Instância não está conectada" };
      }

      await client.sendMessage(to, message, sendMessageOptions);

      return { success: true, message: "Mensagem enviada" };
    } catch (error) {
      console.error(
        `Erro ao enviar mensagem pela instância ${instanceId}:`,
        error
      );
      return { success: false, message: error.message };
    }
  }

  /**
   * Obtém informações do cliente de uma instância
   * @param {Event} event - Evento IPC
   * @param {Object} params - Parâmetros { instanceId }
   */
  async getClientInfo(event, { instanceId }) {
    try {
      if (!instanceId) {
        return { success: false, message: "ID da instância é obrigatório" };
      }

      const client = instanceManager.getClient(instanceId);

      if (!client || !client.info) {
        return { success: false, message: "Instância não está conectada" };
      }

      return {
        success: true,
        data: {
          phoneNumber: client.info.wid?.user || null,
          pushname: client.info.pushname || null,
          platform: client.info.platform || null,
        },
      };
    } catch (error) {
      console.error(`Erro ao obter info do cliente ${instanceId}:`, error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Obtém constantes de configuração
   */
  async getConfig() {
    const {
      MAX_INSTANCES,
      INSTANCE_STATUS,
    } = require("../../config/initialize");

    return {
      success: true,
      data: {
        maxInstances: MAX_INSTANCES,
        statuses: INSTANCE_STATUS,
      },
    };
  }
}

module.exports = InstanceHandlers;
