// main/ipcManager.js
const { ipcMain } = require("electron");
const WhatsAppHandlers = require("./ipc/whatsAppHandlers");
const FlowHandlers = require("./ipc/flowHandlers");
const DeeJayHandlers = require("./ipc/deeJayHandlers");
const DroneHandlers = require("./ipc/droneHandlers");

class IPCManager {
  constructor() {
    this.handlers = {
      whatsapp: null,
      flows: null,
      deejay: null,
      drone: null,
    };
  }

  registerAllHandlers(modules) {
    try {
      this.handlers.whatsapp = new WhatsAppHandlers(modules);
      this.handlers.flows = new FlowHandlers();
      this.handlers.deejay = new DeeJayHandlers(modules.windowManager);
      this.handlers.drone = new DroneHandlers(modules.windowManager);

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
