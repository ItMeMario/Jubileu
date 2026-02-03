const { 
  createCrmInstance, 
  getAllCrmInstances 
} = require("../../config/initializeModules/crmIM");

class CRMHandlers {
  constructor(windowManager) {
    this.windowManager = windowManager;
    console.log("CRMHandlers inicializado");
  }

  /**
   * Abre a janela do CRM
   */
  async openCRM() {
    try {
      console.log("Abrindo janela CRM...");
      return this.windowManager.openCRMWindow();
    } catch (error) {
      console.error("Erro ao abrir janela CRM:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cria uma nova instância CRM
   * @param {Object} event - Evento IPC
   * @param {string} name - Nome da instância
   */
  async createCRMInstance(event, name) {
    try {
      console.log(`Criando instância CRM: ${name}`);
      const instance = await createCrmInstance(name);
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
      const crmInstances = await getAllCrmInstances();
      return { success: true, instances: crmInstances };
    } catch (error) {
      console.error("Erro ao listar instâncias CRM:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = CRMHandlers;
