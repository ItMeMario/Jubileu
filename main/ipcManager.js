const { ipcMain } = require("electron");
const WhatsAppHandlers = require("./ipc/whatsAppHandlers");
const ConfigHandlers = require("./ipc/configHandlers");
const MessageHandlers = require("./ipc/messageHandlers");
const CityHandlers = require("./ipc/cityHandlers");
const IndicadoresHandlers = require("./ipc/indicadoresHandlers");
const ModoDevHandlers = require("./ipc/modoDevHandlers");
const DataBaseHandlers = require("./ipc/dataBaseHandlers");
const DroneHandlers = require("./ipc/droneHandlers");
const InstanceHandlers = require("./ipc/instanceHandlers");
const CacheHandlers = require("./ipc/cacheHandlers");
const DeeJayHandlers = require("./ipc/deeJayHandlers");
const UpdateHandlers = require("./ipc/updateHandlers");
const CRMHandlers = require("./ipc/crmHandlers");
const GoatHandlers = require("./ipc/goatHandlers");
const SentinelaHandlers = require("./ipc/sentinelaHandlers");

class IPCManager {
  constructor() {
    this.handlers = {
      whatsapp: null,
      config: null,
      message: null,
      city: null,
      indicadores: null,
      modoDev: null,
      dataBase: null,
      drone: null,
      instance: null,
      cache: null,
      deeJay: null,
      update: null,
      crm: null,
      goat: null,
      sentinela: null,
    };
  }

  registerAllHandlers(modules) {
    try {
      // Cria instâncias dos handlers com os módulos necessários
      this.handlers.whatsapp = new WhatsAppHandlers(modules);
      this.handlers.config = new ConfigHandlers();
      this.handlers.message = new MessageHandlers();
      this.handlers.city = new CityHandlers();
      this.handlers.indicadores = new IndicadoresHandlers();
      this.handlers.modoDev = new ModoDevHandlers();
      this.handlers.dataBase = new DataBaseHandlers();
      this.handlers.drone = new DroneHandlers(modules.windowManager);
      this.handlers.instance = new InstanceHandlers(modules);
      this.handlers.cache = new CacheHandlers();
      this.handlers.deeJay = new DeeJayHandlers(modules.windowManager);
      this.handlers.update = new UpdateHandlers();
      this.handlers.crm = new CRMHandlers(modules.windowManager);
      this.handlers.goat = new GoatHandlers(modules.windowManager);
      this.handlers.sentinela = new SentinelaHandlers(modules.windowManager);

      // Delega o registro de IPC para cada handler correspondente
      Object.values(this.handlers).forEach(handler => {
        if (handler && typeof handler.register === 'function') {
          handler.register(ipcMain);
        }
      });

      // Registra handler para obter a versão do aplicativo
      ipcMain.handle("get-app-version", () => {
        const { app } = require("electron");
        return app.getVersion();
      });

      console.log("Todos os handlers IPC registrados");
    } catch (error) {
      console.error("Erro ao registrar handlers IPC:", error);
      throw error;
    }
  }

  // ========================================
  // Getter para InstanceHandlers (útil para inicialização)
  // ========================================
  getInstanceHandler() {
    return this.handlers.instance;
  }

  removeAllHandlers() {
    // Remove o handler da versão
    ipcMain.removeHandler("get-app-version");

    // Delega a remoção de IPC para cada handler correspondente
    Object.values(this.handlers).forEach(handler => {
      if (handler && typeof handler.unregister === 'function') {
        handler.unregister(ipcMain);
      }
    });
    console.log("Todos os eventos IPC foram removidos.");
  }

  getHandler(type) {
    return this.handlers[type];
  }
}

module.exports = IPCManager;
