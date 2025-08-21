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
    ipcMain.handle(
      "open-config",
      this.handlers.config.openConfig.bind(this.handlers.config)
    );
    ipcMain.handle(
      "config-close-window",
      this.handlers.config.closeWindow.bind(this.handlers.config)
    );
  }

  registerMessageHandlers() {
    ipcMain.handle(
      "config-get-messages",
      this.handlers.message.getMessages.bind(this.handlers.message)
    );
    ipcMain.handle(
      "config-add-message",
      this.handlers.message.addMessage.bind(this.handlers.message)
    );
    ipcMain.handle(
      "config-update-message",
      this.handlers.message.updateMessage.bind(this.handlers.message)
    );
    ipcMain.handle(
      "config-delete-message",
      this.handlers.message.deleteMessage.bind(this.handlers.message)
    );
    ipcMain.handle(
      "config-get-last-message",
      this.handlers.message.getLastMessage.bind(this.handlers.message)
    );
    ipcMain.handle(
      "config-get-available-options",
      this.handlers.message.getAvailableOptions.bind(this.handlers.message)
    );
  }

  // Método para limpar todos os handlers (útil para testes ou reinicialização)
  removeAllHandlers() {
    const events = [
      "start-whatsapp",
      "stop-whatsapp",
      "open-config",
      "config-close-window",
      "config-get-messages",
      "config-add-message",
      "config-update-message",
      "config-delete-message",
      "config-get-last-message",
      "config-get-available-options",
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
