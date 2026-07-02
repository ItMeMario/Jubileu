// main/appLifeCycle.js
const { app } = require("electron");

class AppLifecycle {
  constructor() {
    this.windowManager = null;
    this.client = null;
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
      if (this.windowManager) {
        this.windowManager.recreateMainWindow();
      }
    });
  }

  setupWindowAllClosedHandler() {
    app.on("window-all-closed", () => {
      if (process.platform !== "darwin") {
        app.quit();
      }
    });
  }

  setupBeforeQuitHandler() {
    app.on("before-quit", async (event) => {
      if (this.isCleanedUp) {
        return;
      }

      if (this.isCleaningUp) {
        event.preventDefault();
        return;
      }

      event.preventDefault();

      await this.cleanup();
      this.isCleanedUp = true;
      app.quit();
    });
  }

  async cleanup() {
    if (this.isCleaningUp) {
      console.log("⏳ Cleanup já em andamento...");
      return;
    }

    this.isCleaningUp = true;

    try {
      console.log("🧹 Iniciando cleanup da aplicação Zwei Chat...");

      const cleanupTasks = [];

      // Destrói cliente whatsapp
      if (this.client) {
        const { safeDestroyClient } = require("../utils/processCleanup");
        cleanupTasks.push(
          safeDestroyClient(this.client, "Cliente WhatsApp")
            .then(() => console.log("✅ Cliente WhatsApp destruído"))
            .catch(err => console.error("⚠️ Erro ao destruir cliente WhatsApp:", err.message))
        );
      }

      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
          console.warn("⚠️ Cleanup atingiu tempo limite (10s). Forçando encerramento.");
          resolve(); 
        }, 10000);
      });

      await Promise.race([Promise.allSettled(cleanupTasks), timeoutPromise]);

      // Mata processos filhos órfãos (Chromium)
      try {
        const { killOrphanedChromiumProcesses } = require("../utils/processCleanup");
        killOrphanedChromiumProcesses();
      } catch (e) {
        // Silêncio
      }

      console.log("✅ Cleanup do Zwei Chat concluído");
    } catch (error) {
      console.error("❌ Erro durante cleanup:", error.message);
    } finally {
      this.isCleaningUp = false;
    }
  }

  async forceQuit() {
    app.quit();
  }

  async restart() {
    app.relaunch();
    app.quit();
  }
}

module.exports = AppLifecycle;
