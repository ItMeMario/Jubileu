const { app } = require("electron");
const WindowManager = require("./main/WindowManager");
const ModuleLoader = require("./main/ModuleLoader");
const IPCManager = require("./main/ipcManager");
const AppLifecycle = require("./main/AppLifecycle");

class Application {
  constructor() {
    this.windowManager = new WindowManager();
    this.moduleLoader = new ModuleLoader();
    this.ipcManager = new IPCManager();
    this.appLifecycle = new AppLifecycle();
  }

  async initialize() {
    try {
      // Aguarda o app estar pronto
      await app.whenReady();

      // Carrega todos os módulos necessários
      await this.moduleLoader.loadAll();

      // Inicializa configurações
      await this.moduleLoader.initializeConfigs();

      // Registra todos os handlers IPC
      this.ipcManager.registerAllHandlers(this.moduleLoader.getModules());

      // Cria janela principal
      this.windowManager.createMainWindow();

      // Configura eventos do ciclo de vida da aplicação
      this.appLifecycle.setup(
        this.windowManager,
        this.moduleLoader.getModule("client")
      );

      console.log("Aplicação inicializada com sucesso!");
    } catch (error) {
      console.error("Erro na inicialização da aplicação:", error);
    }
  }
}

// Inicia a aplicação
const jubileuApp = new Application();
jubileuApp.initialize();
