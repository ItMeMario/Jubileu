// main/ipcManager.js
const { ipcMain } = require("electron");
const WhatsAppHandlers = require("./ipc/whatsAppHandlers");

class IPCManager {
  constructor() {
    this.handlers = {
      whatsapp: null,
    };
  }

  registerAllHandlers(modules) {
    try {
      this.handlers.whatsapp = new WhatsAppHandlers(modules);

      // Registra os handlers
      Object.values(this.handlers).forEach(handler => {
        if (handler && typeof handler.register === 'function') {
          handler.register(ipcMain);
        }
      });

      // Handler para versão do app
      ipcMain.handle("get-app-version", () => {
        const { app } = require("electron");
        return app.getVersion();
      });

      console.log("Todos os handlers IPC do Zwei Chat registrados");
    } catch (error) {
      console.error("Erro ao registrar handlers IPC do Zwei Chat:", error);
      throw error;
    }
  }

  removeAllHandlers() {
    ipcMain.removeHandler("get-app-version");

    Object.values(this.handlers).forEach(handler => {
      if (handler && typeof handler.unregister === 'function') {
        handler.unregister(ipcMain);
      }
    });
    console.log("Todos os eventos IPC do Zwei Chat removidos.");
  }

  getHandler(type) {
    return this.handlers[type];
  }
}

module.exports = IPCManager;
