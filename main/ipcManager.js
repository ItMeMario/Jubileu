const { ipcMain } = require("electron");
const WhatsAppHandlers = require("./ipc/whatsAppHandlers");
const ConfigHandlers = require("./ipc/configHandlers");
const MessageHandlers = require("./ipc/messageHandlers");

class IPCManager {
  constructor() {
    this.handlers = {
      whatsapp: null,
      config: null,
      message: null,
    };
  }

  registerAllHandlers(modules) {
    try {
      // Cria instâncias dos handlers com os módulos necessários
      this.handlers.whatsapp = new WhatsAppHandlers(modules);
      this.handlers.config = new ConfigHandlers();
      this.handlers.message = new MessageHandlers();

      // Registra handlers do WhatsApp
      this.registerWhatsAppHandlers();

      // Registra handlers de configuração
      this.registerConfigHandlers();

      // Registra handlers de mensagens
      this.registerMessageHandlers();

      console.log("Todos os handlers IPC registrados");
    } catch (error) {
      console.error("Erro ao registrar handlers IPC:", error);
      throw error;
    }
  }

  registerWhatsAppHandlers() {
    ipcMain.handle(
      "start-whatsapp",
      this.handlers.whatsapp.startWhatsApp.bind(this.handlers.whatsapp)
    );
    ipcMain.handle(
      "stop-whatsapp",
      this.handlers.whatsapp.stopWhatsApp.bind(this.handlers.whatsapp)
    );
  }

  registerConfigHandlers() {
    // Handlers básicos que já existem
    ipcMain.handle(
      "open-config",
      this.handlers.config.openConfig.bind(this.handlers.config)
    );
    ipcMain.handle(
      "config-close-window",
      this.handlers.config.closeWindow.bind(this.handlers.config)
    );

    // Registra apenas métodos que existem no ConfigHandlers
    this.registerConfigMethodIfExists(
      "getSystemConfig",
      "config-get-system-config"
    );
    this.registerConfigMethodIfExists(
      "updateSystemConfig",
      "config-update-system-config"
    );
    this.registerConfigMethodIfExists(
      "getAvailableOptions",
      "config-get-available-options"
    );
    this.registerConfigMethodIfExists(
      "getThemeSettings",
      "config-get-theme-settings"
    );
    this.registerConfigMethodIfExists(
      "updateThemeSettings",
      "config-update-theme-settings"
    );
    this.registerConfigMethodIfExists(
      "exportSettings",
      "config-export-settings"
    );
    this.registerConfigMethodIfExists(
      "importSettings",
      "config-import-settings"
    );
  }

  registerConfigMethodIfExists(methodName, ipcChannel) {
    if (typeof this.handlers.config[methodName] === "function") {
      ipcMain.handle(
        ipcChannel,
        this.handlers.config[methodName].bind(this.handlers.config)
      );
      console.log(`Registrado: ${ipcChannel}`);
    } else {
      console.warn(`Método ${methodName} não encontrado em ConfigHandlers`);
    }
  }

  registerMessageHandlers() {
    // Handlers básicos de mensagens (que já existem)
    ipcMain.handle(
      "message-get-messages",
      this.handlers.message.getMessages.bind(this.handlers.message)
    );
    ipcMain.handle(
      "message-add-message",
      this.handlers.message.addMessage.bind(this.handlers.message)
    );
    ipcMain.handle(
      "message-update-message",
      this.handlers.message.updateMessage.bind(this.handlers.message)
    );
    ipcMain.handle(
      "message-delete-message",
      this.handlers.message.deleteMessage.bind(this.handlers.message)
    );
    ipcMain.handle(
      "message-get-last-message",
      this.handlers.message.getLastMessage.bind(this.handlers.message)
    );

    // Registra métodos novos com verificação
    this.registerMessageMethodIfExists("getMessageTypes", "message-get-types");
    this.registerMessageMethodIfExists(
      "getMessageLocales",
      "message-get-locales"
    );

    // Mantém compatibilidade com método antigo
    this.registerMessageMethodIfExists(
      "getAvailableOptions",
      "message-get-available-options"
    );
  }

  registerMessageMethodIfExists(methodName, ipcChannel) {
    if (typeof this.handlers.message[methodName] === "function") {
      ipcMain.handle(
        ipcChannel,
        this.handlers.message[methodName].bind(this.handlers.message)
      );
      console.log(`Registrado: ${ipcChannel}`);
    } else {
      console.warn(`Método ${methodName} não encontrado em MessageHandlers`);
    }
  }

  // Método para limpar todos os handlers (útil para testes ou reinicialização)
  removeAllHandlers() {
    const events = [
      // WhatsApp events
      "start-whatsapp",
      "stop-whatsapp",

      // Config events
      "open-config",
      "config-close-window",
      "config-get-system-config",
      "config-update-system-config",
      "config-get-available-options",
      "config-get-theme-settings",
      "config-update-theme-settings",
      "config-export-settings",
      "config-import-settings",

      // Message events
      "message-get-messages",
      "message-add-message",
      "message-update-message",
      "message-delete-message",
      "message-get-last-message",
      "message-get-types",
      "message-get-locales",
      "message-get-available-options",
    ];

    events.forEach((event) => {
      ipcMain.removeAllListeners(event);
    });
  }

  // Método para obter handler específico (útil para debug)
  getHandler(type) {
    return this.handlers[type];
  }
}

module.exports = IPCManager;
