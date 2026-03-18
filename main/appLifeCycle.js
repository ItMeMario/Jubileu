const { app } = require("electron");
const { instanceManager } = require("../services/instanceManager");
const deeJayService = require("../services/deeJayService");

class AppLifecycle {
  constructor() {
    this.windowManager = null;
    this.client = null; // Mantido para compatibilidade legada
    this.isCleaningUp = false;
    this.isCleanedUp = false;
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
    app.on("window-all-closed", () => {
      if (process.platform !== "darwin") {
        app.quit(); // This triggers before-quit instead of manual cleanup
      }
    });
  }

  setupBeforeQuitHandler() {
    app.on("before-quit", async (event) => {
      // If we are already cleaned up, let Electron naturally exit
      if (this.isCleanedUp) {
        return;
      }

      if (this.isCleaningUp) {
         event.preventDefault();
         return; // Already triggered cleanup
      }

      // Prevent immediate exit to allow cleanup
      event.preventDefault();

      await this.cleanup();
      this.isCleanedUp = true;
      app.quit(); // Retry quit now that cleanup is done
    });
  }

  async cleanup() {
    // Prevent multiple simultaneous cleanups
    if (this.isCleaningUp) {
      console.log("⏳ Cleanup já em andamento...");
      return;
    }

    this.isCleaningUp = true;

    try {
      console.log("🧹 Iniciando cleanup da aplicação...");

      const cleanupTasks = [];

      // 1. Para todas as instâncias do novo sistema
      cleanupTasks.push(
        instanceManager.stopAll()
          .then(() => console.log("✅ Todas as instâncias paradas"))
          .catch(err => console.error("⚠️ Erro ao parar instâncias:", err.message))
      );

      // 2. Para todas as instâncias Dee Jay
      cleanupTasks.push(
        deeJayService.stopAll()
          .then(() => console.log("✅ Todas as instâncias Dee Jay paradas"))
          .catch(err => console.error("⚠️ Erro ao parar instâncias Dee Jay:", err.message))
      );

      // 3. Cleanup do cliente legado (se existir)
      if (this.client && this.client.pupPage) {
         cleanupTasks.push(
           this.client.destroy()
             .then(() => console.log("✅ Cliente legado destruído"))
             .catch(err => console.error("⚠️ Erro ao destruir cliente legado:", err.message))
         );
      }

      // Race against a strict timeout (e.g. 5 seconds) to prevent frozen Puppeteer processes
      // from hanging the application forever and breaking NSIS installers.
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
          console.warn("⚠️ Cleanup atingiu tempo limite (5s). Forçando encerramento dos filhos.");
          resolve(); 
        }, 5000);
      });

      await Promise.race([Promise.allSettled(cleanupTasks), timeoutPromise]);

      console.log("✅ Cleanup concluído");
    } catch (error) {
      console.error("❌ Erro durante cleanup:", error.message);
    } finally {
      this.isCleaningUp = false;
    }
  }

  // Método para forçar saída da aplicação
  async forceQuit() {
    app.quit(); // Re-reroutes through before-quit
  }

  // Método para reiniciar aplicação
  async restart() {
    app.relaunch();
    app.quit();
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
