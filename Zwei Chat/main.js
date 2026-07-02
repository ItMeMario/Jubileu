// main.js
const { app } = require("electron");
const WindowManager = require("./main/windowManager");
const ModuleLoader = require("./main/moduleLoader");
const IPCManager = require("./main/ipcManager");
const AppLifecycle = require("./main/appLifeCycle");
const { initializeAllConfigs } = require("./config/initialize");
const ConsoleRedirect = require("./main/consoleRedirect");

// Previne múltiplas instâncias do Electron rodando simultaneamente.
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log("⚠️ Outra instância do Zwei Chat já está em execução. Encerrando esta.");
  app.quit();
} else {
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

        // Configura redirecionamento de console
        ConsoleRedirect.setup();

        console.log("🔧 Inicializando estruturas básicas...");
        // Cria pastas, arquivos e banco ANTES de qualquer coisa
        await initializeAllConfigs();

        console.log("📦 Carregando módulos...");
        // Carrega os módulos lite
        await this.moduleLoader.loadAll();

        console.log("🔗 Registrando handlers IPC...");
        const modules = {
          ...this.moduleLoader.getModules(),
          windowManager: this.windowManager,
        };
        this.ipcManager.registerAllHandlers(modules);

        console.log("🪟 Criando janela principal...");
        this.windowManager.createMainWindow();

        console.log("🔄 Configurando ciclo de vida...");
        this.appLifecycle.setup(
          this.windowManager,
          this.moduleLoader.getModule("client")
        );

        // Configura handlers de sinal para terminação abrupta
        this.setupSignalHandlers();

        console.log("✅ Aplicação Zwei Chat inicializada com sucesso!");
      } catch (error) {
        console.error("❌ Erro na inicialização da aplicação:", error);

        const { dialog } = require("electron");
        if (this.windowManager && this.windowManager.mainWindow) {
          dialog.showErrorBox(
            "Erro de Inicialização",
            `Falha ao inicializar o Zwei Chat:\n\n${error.message}\n\nA aplicação será fechada.`
          );
        }

        process.exit(1);
      }
    }

    /**
     * Configura handlers para sinais de terminação (SIGINT, SIGTERM)
     */
    setupSignalHandlers() {
      const cleanup = async (signal) => {
        console.log(`\n🛑 Recebido sinal ${signal}, iniciando cleanup...`);
        try {
          await this.appLifecycle.cleanup();
        } catch (error) {
          console.error("Erro durante cleanup:", error);
        }
        process.exit(0);
      };

      process.on("SIGINT", () => cleanup("SIGINT"));
      process.on("SIGTERM", () => cleanup("SIGTERM"));

      if (process.platform === "win32") {
        process.on("SIGHUP", () => cleanup("SIGHUP"));
      }
    }
  }

  // Inicia a aplicação
  const zweiApp = new Application();
  zweiApp.initialize();

  // Quando uma segunda instância tenta abrir, foca a janela existente
  app.on("second-instance", () => {
    const mainWindow = zweiApp.windowManager?.getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
