class SentinelaHandlers {
  constructor(windowManager) {
    this.windowManager = windowManager;
  }

  async openSentinela() {
    try {
      if (this.windowManager) {
        return this.windowManager.openSentinelaWindow();
      } else {
        throw new Error("windowManager não disponível");
      }
    } catch (error) {
      console.error("Erro ao abrir Sentinela:", error);
      return { success: false, message: error.message };
    }
  }
}

module.exports = SentinelaHandlers;
