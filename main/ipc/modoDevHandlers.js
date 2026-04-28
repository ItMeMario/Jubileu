const modoDevControllerGui = require("../../controllers/modoDevControllerGui");

class ModoDevHandlers {
  constructor() {
    console.log("ModoDevHandlers inicializado");
  }

  register(ipcMain) {
    ipcMain.handle("modo-dev-toggle-dev-mode", this.toggleDevMode.bind(this));
    ipcMain.handle("modo-dev-toggle-debug-mode", this.toggleDebugMode.bind(this));
    ipcMain.handle("modo-dev-set-scout-time", this.setScoutTime.bind(this));
    ipcMain.handle("modo-dev-get-scout-config", this.getScoutConfig.bind(this));
    ipcMain.handle("modo-dev-get-current-mode", this.getCurrentMode.bind(this));
    ipcMain.handle("modo-dev-get-current-locale", this.getCurrentLocale.bind(this));
    ipcMain.handle("modo-dev-get-available-locales", this.getAvailableLocales.bind(this));
    ipcMain.handle("modo-dev-set-locale", this.setLocale.bind(this));
  }

  unregister(ipcMain) {
    ipcMain.removeHandler("modo-dev-toggle-dev-mode");
    ipcMain.removeHandler("modo-dev-toggle-debug-mode");
    ipcMain.removeHandler("modo-dev-set-scout-time");
    ipcMain.removeHandler("modo-dev-get-scout-config");
    ipcMain.removeHandler("modo-dev-get-current-mode");
    ipcMain.removeHandler("modo-dev-get-current-locale");
    ipcMain.removeHandler("modo-dev-get-available-locales");
    ipcMain.removeHandler("modo-dev-set-locale");
  }

  // Alternar modo Dev/Produção
  async toggleDevMode() {
    try {
      console.log("Alternando modo Dev/Produção...");
      return await modoDevControllerGui.toggleDevMode();
    } catch (error) {
      console.error("Erro ao alternar modo Dev:", error);
      return { success: false, error: error.message };
    }
  }

  // Alternar debug
  async toggleDebugMode() {
    try {
      console.log("Alternando modo debug...");
      return await modoDevControllerGui.toggleDebugMode();
    } catch (error) {
      console.error("Erro ao alternar debug:", error);
      return { success: false, error: error.message };
    }
  }

  // Configurar tempo do Scout
  async setScoutTime(event, timeInput) {
    try {
      console.log("Configurando tempo do Scout:", timeInput);
      // Validação básica antes de enviar para o controller
      if (
        !timeInput ||
        typeof timeInput !== "string" ||
        timeInput.trim() === ""
      ) {
        return { success: false, error: "Tempo é obrigatório" };
      }
      return await modoDevControllerGui.setScoutTime(timeInput.trim());
    } catch (error) {
      console.error("Erro ao configurar Scout:", error);
      return { success: false, error: error.message };
    }
  }

  // Obter configuração do Scout
  async getScoutConfig() {
    try {
      console.log("Obtendo configuração do Scout...");
      return await modoDevControllerGui.getScoutConfig();
    } catch (error) {
      console.error("Erro ao obter configuração do Scout:", error);
      return { success: false, error: error.message };
    }
  }

  // Obter modo atual (DEV/PRODUÇÃO) - ✅ RESTAURADO
  async getCurrentMode() {
    try {
      console.log("Obtendo modo atual...");
      return await modoDevControllerGui.getCurrentMode();
    } catch (error) {
      console.error("Erro ao obter modo atual:", error);
      return { success: false, error: error.message };
    }
  }

  // ========== MÉTODOS PARA LOCALE ==========

  // Obter locale atual
  async getCurrentLocale() {
    try {
      console.log("Obtendo locale atual...");
      return await modoDevControllerGui.getCurrentLocale();
    } catch (error) {
      console.error("Erro ao obter locale atual:", error);
      return { success: false, error: error.message };
    }
  }

  // Obter locales disponíveis
  async getAvailableLocales() {
    try {
      console.log("Obtendo locales disponíveis...");
      return await modoDevControllerGui.getAvailableLocales();
    } catch (error) {
      console.error("Erro ao obter locales disponíveis:", error);
      return { success: false, error: error.message };
    }
  }

  // Alterar locale
  async setLocale(event, selectedIndex) {
    try {
      console.log("Alterando locale:", selectedIndex);
      // Validação básica antes de enviar para o controller
      if (
        !selectedIndex ||
        typeof selectedIndex !== "string" ||
        selectedIndex.trim() === ""
      ) {
        return { success: false, error: "Seleção é obrigatória" };
      }
      return await modoDevControllerGui.setLocale(selectedIndex.trim());
    } catch (error) {
      console.error("Erro ao alterar locale:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = ModoDevHandlers;
