const { app } = require("electron");
const { instanceManager } = require("../services/instanceManager");
const deeJayService = require("../services/deeJayService");
const crmService = require("../services/crmService");
const { droneInstanceManager } = require("../services/droneServiceModules/droneInstanceManagerDSM");

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

      // 1. Para todas as instâncias do sistema principal (Jubileu)
      cleanupTasks.push(
        instanceManager.stopAll()
          .then(() => console.log("✅ Todas as instâncias Jubileu paradas"))
          .catch(err => console.error("⚠️ Erro ao parar instâncias Jubileu:", err.message))
      );

      // 2. Para todas as instâncias Dee Jay
      cleanupTasks.push(
        deeJayService.stopAll()
          .then(() => console.log("✅ Todas as instâncias Dee Jay paradas"))
          .catch(err => console.error("⚠️ Erro ao parar instâncias Dee Jay:", err.message))
      );

      // 3. Para todas as instâncias CRM
      cleanupTasks.push(
        crmService.stopAll()
          .then(() => console.log("✅ Todas as instâncias CRM paradas"))
          .catch(err => console.error("⚠️ Erro ao parar instâncias CRM:", err.message))
      );

      // 4. Para todas as instâncias Drone
      cleanupTasks.push(
        droneInstanceManager.stopAll()
          .then(() => console.log("✅ Todas as instâncias Drone paradas"))
          .catch(err => console.error("⚠️ Erro ao parar instâncias Drone:", err.message))
      );

      // 5. Cleanup do cliente legado (se existir)
      if (this.client && this.client.pupPage) {
        const { safeDestroyClient } = require("../utils/processCleanup");
        cleanupTasks.push(
           safeDestroyClient(this.client, "Cliente Legado")
             .then(() => console.log("✅ Cliente legado destruído"))
             .catch(err => console.error("⚠️ Erro ao destruir cliente legado:", err.message))
        );
      }

      // Race against a strict timeout (10s) to prevent frozen Puppeteer processes
      // from hanging the application forever and breaking NSIS installers.
      // Notebooks mais lentos podem precisar de mais tempo.
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
          console.warn("⚠️ Cleanup atingiu tempo limite (10s). Forçando encerramento.");
          resolve(); 
        }, 10000);
      });

      await Promise.race([Promise.allSettled(cleanupTasks), timeoutPromise]);

      // 6. Última linha de defesa: mata qualquer processo Chrome órfão
      // que possa ter sobrevivido ao cleanup gracioso
      try {
        const { killOrphanedChromiumProcesses } = require("../utils/processCleanup");
        killOrphanedChromiumProcesses();
      } catch (e) {
        // Ignora erros no force-kill final
      }

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
