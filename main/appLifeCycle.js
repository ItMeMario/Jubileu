const { app } = require("electron");

class AppLifecycle {
  constructor() {
    this.windowManager = null;
    this.client = null;
  }

  setup(windowManager, client) {
    this.windowManager = windowManager;
    this.client = client;

    this.setupActivateHandler();
    this.setupWindowAllClosedHandler();
  }

  setupActivateHandler() {
    app.on("activate", () => {
      // macOS - recria janela quando clica no ícone do dock
      if (this.windowManager) {
        this.windowManager.recreateMainWindow();
      }
    });
  }

  setupWindowAllClosedHandler() {
    app.on("window-all-closed", async () => {
      if (process.platform !== "darwin") {
        await this.cleanup();
        app.quit();
      }
    });
  }

  async cleanup() {
    try {
      console.log("Iniciando cleanup da aplicação...");
      
      // Cleanup do cliente WhatsApp
      if (this.client && this.client.pupPage) {
        console.log("Destruindo cliente WhatsApp...");
        await this.client.destroy();
      }
      
      console.log("Cleanup concluído");
    } catch (error) {
      console.error("Erro durante cleanup:", error.message);
    }
  }

  // Método para forçar saída da aplicação
  async forceQuit() {
    await this.cleanup();
    app.quit();
  }

  // Método para reiniciar aplicação
  async restart() {
    await this.cleanup();
    app.relaunch();
    app.exit();
  }

  // Getters para debug/monitoramento
  isReady() {
    return app.isReady();
  }

  getVersion() {
    return app.getVersion();
  }

  getName() {
    return app.getName();
  }
}

module.exports = AppLifecycle;