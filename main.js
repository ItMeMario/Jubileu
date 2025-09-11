const { app } = require("electron");
const WindowManager = require("./main/WindowManager");
const ModuleLoader = require("./main/ModuleLoader");
const IPCManager = require("./main/ipcManager");
const AppLifecycle = require("./main/AppLifecycle");
const { initializeAllConfigs } = require("./utils/initialize");
require("./services/reminderService");
const { reminderSystem } = require("./services/reminderService");

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

      console.log("🔧 Inicializando estruturas básicas...");
      // 🔑 CRÍTICO: Cria pastas, arquivos e banco ANTES de qualquer coisa
      await initializeAllConfigs();

      console.log("📦 Carregando módulos...");
      // Carrega todos os módulos necessários
      await this.moduleLoader.loadAll();

      console.log("⚙️ Inicializando configurações...");
      // Inicializa configurações
      await this.moduleLoader.initializeConfigs();

      console.log("🔗 Registrando handlers IPC...");
      // Registra todos os handlers IPC
      this.ipcManager.registerAllHandlers(this.moduleLoader.getModules());

      console.log("🪟 Criando janela principal...");
      // Cria janela principal
      this.windowManager.createMainWindow();

      console.log("🔄 Configurando ciclo de vida...");
      // Configura eventos do ciclo de vida da aplicação
      this.appLifecycle.setup(
        this.windowManager,
        this.moduleLoader.getModule("client")
      );

      console.log("✅ Aplicação inicializada com sucesso!");
    } catch (error) {
      console.error("❌ Erro na inicialização da aplicação:", error);

      // Em caso de erro crítico, mostra mensagem e fecha
      const { dialog } = require("electron");
      if (this.windowManager && this.windowManager.mainWindow) {
        dialog.showErrorBox(
          "Erro de Inicialização",
          `Falha ao inicializar a aplicação:\n\n${error.message}\n\nA aplicação será fechada.`
        );
      }
      client.on("ready", () => {
        reminderSystem.startAutomaticReminders(client); // Inicia agendamento automático
      });
      // Força saída em caso de erro crítico
      process.exit(1);
    }
  }
}

// Inicia a aplicação
const jubileuApp = new Application();
jubileuApp.initialize();
