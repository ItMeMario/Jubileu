const { app } = require("electron");
const WindowManager = require("./main/windowManager");
const ModuleLoader = require("./main/moduleLoader");
const IPCManager = require("./main/ipcManager");
const AppLifecycle = require("./main/appLifeCycle");
const { initializeAllConfigs } = require("./config/initialize");
const ConsoleRedirect = require("./main/consoleRedirect");

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
      // Carrega todos os módulos necessários
      await this.moduleLoader.loadAll();

      console.log("⚙️ Inicializando configurações...");
      // Inicializa configurações
      await this.moduleLoader.initializeConfigs();

      console.log("🔗 Registrando handlers IPC...");
      // 🆕 MUDANÇA: Adiciona windowManager aos módulos
      const modules = {
        ...this.moduleLoader.getModules(),
        windowManager: this.windowManager,
      };
      this.ipcManager.registerAllHandlers(modules);

      // Inicializa o serviço Dee Jay
      console.log("🎧 Inicializando Dee Jay Service...");
      const deeJayService = require("./services/deeJayService");
      await deeJayService.initialize();

      console.log("🪟 Criando janela principal...");
      // Cria janela principal
      this.windowManager.createMainWindow();

      console.log("🔄 Configurando ciclo de vida...");
      // Configura eventos do ciclo de vida da aplicação
      this.appLifecycle.setup(
        this.windowManager,
        this.moduleLoader.getModule("client")
      );

      // Configura handlers de sinal para terminação abrupta
      this.setupSignalHandlers();

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

      // Força saída em caso de erro crítico
      process.exit(1);
    }
  }

  /**
   * Configura handlers para sinais de terminação (SIGINT, SIGTERM)
   * Garante cleanup adequado do Dee Jay em casos de fechamento abrupto
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

    // Captura Ctrl+C
    process.on("SIGINT", () => cleanup("SIGINT"));

    // Captura kill/terminate
    process.on("SIGTERM", () => cleanup("SIGTERM"));

    // Windows: Captura fechamento do console
    if (process.platform === "win32") {
      process.on("SIGHUP", () => cleanup("SIGHUP"));
    }
  }
}

// Inicia a aplicação
const jubileuApp = new Application();
jubileuApp.initialize();
