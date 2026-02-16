const crmService = require("../../services/crmService");

class CRMHandlers {
  constructor(windowManager) {
    this.windowManager = windowManager;
    console.log("CRMHandlers inicializado");
    this.bindEvents();
  }

  bindEvents() {
      crmService.on('instance-update', (data) => {
          this.sendToWindow('crm-instance-update', data);
      });
  }

  sendToWindow(channel, data) {
      const win = this.windowManager.getCRMWindow();
      if (win && !win.isDestroyed()) {
          win.webContents.send(channel, data);
      }
  }

  /**
   * Abre a janela do CRM
   */
  async openCRM() {
    try {
      console.log("Abrindo janela CRM...");
      // Initialize service on first open if needed, or just let it be dynamic
      // crmService.initialize() is redundant if called repeatedly, but safe if idempotent.
      // Better to init at app startup, but lazy load is fine too.
      await crmService.initialize();
      return this.windowManager.openCRMWindow();
    } catch (error) {
      console.error("Erro ao abrir janela CRM:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cria uma nova instância CRM
   */
  async createCRMInstance(event, name) {
    try {
      console.log(`Criando instância CRM: ${name}`);
      const instance = await crmService.createInstance(name);
      return { success: true, instance };
    } catch (error) {
      console.error("Erro ao criar instância CRM:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Lista instâncias CRM
   */
  async getCRMInstances() {
    try {
      console.log("Listando instâncias CRM...");
      const instances = crmService.getInstances();
      return { success: true, instances };
    } catch (error) {
      console.error("Erro ao listar instâncias CRM:", error);
      return { success: false, error: error.message };
    }
  }

  async startInstance(event, instanceId) {
      try {
          await crmService.startInstance(instanceId);
          return { success: true };
      } catch (error) {
           return { success: false, error: error.message };
      }
  }

  async stopInstance(event, instanceId) {
       try {
          await crmService.stopInstance(instanceId);
          return { success: true };
      } catch (error) {
           return { success: false, error: error.message };
      }
  }

  async removeInstance(event, instanceId) {
      try {
          await crmService.removeInstance(instanceId);
          return { success: true };
      } catch (error) {
           return { success: false, error: error.message };
      }
  }
}

module.exports = CRMHandlers;
