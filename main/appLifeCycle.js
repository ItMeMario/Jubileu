const { app } = require("electron");
const { instanceManager } = require("../services/instanceManager");
const deeJayService = require("../services/deeJayService");

class AppLifecycle {
  constructor() {
    this.windowManager = null;
    this.client = null; // Mantido para compatibilidade legada
    this.isCleaningUp = false;
  }

  setup(windowManager, client = null) {
    this.windowManager = windowManager;
    this.client = client;

    this.setupActivateHandler();
    this.setupWindowAllClosedHandler();
    this.setupBeforeQuitHandler();
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

  setupBeforeQuitHandler() {
    app.on("before-quit", async (event) => {
      if (this.isCleaningUp) {
        return; // Já está fazendo cleanup, deixa sair
      }

      // Previne saída imediata para fazer cleanup
      event.preventDefault();

      await this.cleanup();

      // Agora permite sair
      app.exit(0);
    });
  }

  async cleanup() {
    // Previne múltiplos cleanups simultâneos
    if (this.isCleaningUp) {
      console.log("⏳ Cleanup já em andamento...");
      return;
    }

    this.isCleaningUp = true;

    try {
      console.log("🧹 Iniciando cleanup da aplicação...");

      // 1. Para todas as instâncias do novo sistema
      try {
        console.log("🛑 Parando todas as instâncias WhatsApp...");
        await instanceManager.stopAll();
        console.log("✅ Todas as instâncias paradas");
      } catch (error) {
        console.error("⚠️ Erro ao parar instâncias:", error.message);
      }

      // 2. Para todas as instâncias Dee Jay
      try {
        console.log("🛑 Parando todas as instâncias Dee Jay...");
        await deeJayService.stopAll();
        console.log("✅ Todas as instâncias Dee Jay paradas");
      } catch (error) {
        console.error("⚠️ Erro ao parar instâncias Dee Jay:", error.message);
      }

      // 3. Cleanup do cliente legado (se existir)
      if (this.client && this.client.pupPage) {
        try {
          console.log("🛑 Destruindo cliente WhatsApp legado...");
          await this.client.destroy();
          console.log("✅ Cliente legado destruído");
        } catch (error) {
          console.error("⚠️ Erro ao destruir cliente legado:", error.message);
        }
      }

      // 3. Aguarda um pouco para garantir que tudo fechou
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log("✅ Cleanup concluído");
    } catch (error) {
      console.error("❌ Erro durante cleanup:", error.message);
    } finally {
      this.isCleaningUp = false;
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

  // Novo: Verifica se está em processo de cleanup
  isInCleanup() {
    return this.isCleaningUp;
  }
}

module.exports = AppLifecycle;
