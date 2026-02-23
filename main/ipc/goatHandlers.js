class GoatHandlers {
  constructor(windowManager) {
    this.windowManager = windowManager;
    console.log("GoatHandlers inicializado");
  }

  async openGoat() {
    try {
      console.log("Abrindo janela Goat...");
      return this.windowManager.openGoatWindow();
    } catch (error) {
      console.error("Erro ao abrir janela Goat:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = GoatHandlers;
