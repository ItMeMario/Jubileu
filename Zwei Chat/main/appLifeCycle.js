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

      // Destrói clientes whatsapp
      if (this.client) {
        const { safeDestroyClient } = require("../utils/processCleanup");
        for (const [instanceId, clientInstance] of this.client.entries()) {
          cleanupTasks.push(
            safeDestroyClient(clientInstance, `Cliente WhatsApp ${instanceId}`)
              .then(() => console.log(`✅ Cliente WhatsApp ${instanceId} destruído`))
              .catch(err => console.error(`⚠️ Erro ao destruir cliente WhatsApp ${instanceId}:`, err.message))
          );
        }
      }

      // Destrói clientes do Dee Jay
      try {
        const deeJayService = require("../services/deeJayService");
        cleanupTasks.push(
          deeJayService.stopAll()
            .then(() => console.log("✅ Dee Jay Service parado"))
            .catch(err => console.error("⚠️ Erro ao parar Dee Jay Service:", err.message))
        );
      } catch (err) {
        console.error("⚠️ Erro ao carregar Dee Jay para cleanup:", err.message);
      }

      // Destrói clientes do Drone
      try {
        const droneService = require("../services/droneService");
        cleanupTasks.push(
          droneService.stopAll()
            .then(() => console.log("✅ Drone Service parado"))
            .catch(err => console.error("⚠️ Erro ao parar Drone Service:", err.message))
        );
      } catch (err) {
        console.error("⚠️ Erro ao carregar Drone para cleanup:", err.message);
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
