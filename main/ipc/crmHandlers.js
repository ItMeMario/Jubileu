// main/ipc/crmHandlers.js
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
}

module.exports = CRMHandlers;
