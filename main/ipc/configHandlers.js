const {
  createConfigWindow,
  closeConfigWindow,
  getConfigWindow,
} = require("../../renderer/guiConfig/configWindow");

class ConfigHandlers {
  constructor() {
    // Pode armazenar estado específico dos handlers de config se necessário
    this.systemConfig = {
      // Configurações padrão do sistema
      autoStart: false,
      minimizeToTray: true,
      notifications: true,
      language: "pt-BR",
      updateCheck: true,
    };

    this.themeSettings = {
      theme: "dark",
      primaryColor: "#007bff",
      fontSize: "medium",
      animations: true,
    };
  }

  register(ipcMain) {
    ipcMain.handle("open-config", this.openConfig.bind(this));
    ipcMain.handle("config-close-window", this.closeWindow.bind(this));
    ipcMain.handle("config-get-system-config", this.getSystemConfig.bind(this));
    ipcMain.handle("config-update-system-config", this.updateSystemConfig.bind(this));
    ipcMain.handle("config-get-available-options", this.getAvailableOptions.bind(this));
    ipcMain.handle("config-get-theme-settings", this.getThemeSettings.bind(this));
    ipcMain.handle("config-update-theme-settings", this.updateThemeSettings.bind(this));
    ipcMain.handle("config-export-settings", this.exportSettings.bind(this));
    ipcMain.handle("config-import-settings", this.importSettings.bind(this));
  }

  unregister(ipcMain) {
    ipcMain.removeHandler("open-config");
    ipcMain.removeHandler("config-close-window");
    ipcMain.removeHandler("config-get-system-config");
    ipcMain.removeHandler("config-update-system-config");
    ipcMain.removeHandler("config-get-available-options");
    ipcMain.removeHandler("config-get-theme-settings");
    ipcMain.removeHandler("config-update-theme-settings");
    ipcMain.removeHandler("config-export-settings");
    ipcMain.removeHandler("config-import-settings");
  }

  async openConfig() {
    try {
      console.log("Abrindo configurações...");
      let win = getConfigWindow();
      if (!win) {
        win = createConfigWindow();
      } else {
        win.focus();
      }
      return { success: true, message: "Janela de configurações aberta" };
    } catch (error) {
      console.error("Erro ao abrir configurações:", error);
      return {
        success: false,
        message: "Erro ao abrir configurações: " + error.message,
      };
    }
  }

  async closeWindow() {
    try {
      closeConfigWindow();
      return { success: true, message: "Janela de configurações fechada" };
    } catch (error) {
      console.error("Erro ao fechar configurações:", error);
      return {
        success: false,
        message: "Erro ao fechar configurações: " + error.message,
      };
    }
  }

  // Novos métodos para configurações do sistema
  async getSystemConfig() {
    try {
      // Aqui você pode carregar de um arquivo JSON, banco de dados, etc.
      // Por enquanto retorno o objeto padrão
      return {
        success: true,
        data: this.systemConfig,
      };
    } catch (error) {
      console.error("Erro ao obter configurações do sistema:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async updateSystemConfig(_, configData) {
    try {
      // Aqui você salvaria as configurações em um arquivo ou banco
      this.systemConfig = { ...this.systemConfig, ...configData };

      return {
        success: true,
        message: "Configurações do sistema atualizadas",
        data: this.systemConfig,
      };
    } catch (error) {
      console.error("Erro ao atualizar configurações do sistema:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getAvailableOptions() {
    try {
      // Retorna opções gerais do sistema (não específicas de mensagens)
      return {
        success: true,
        data: {
          languages: [
            { code: "pt-BR", name: "Português (Brasil)" },
            { code: "en-US", name: "English (US)" },
            { code: "es-ES", name: "Español" },
          ],
          themes: [
            { id: "light", name: "Claro" },
            { id: "dark", name: "Escuro" },
            { id: "auto", name: "Automático" },
          ],
          fontSizes: [
            { id: "small", name: "Pequeno" },
            { id: "medium", name: "Médio" },
            { id: "large", name: "Grande" },
          ],
        },
      };
    } catch (error) {
      console.error("Erro ao obter opções disponíveis:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getThemeSettings() {
    try {
      return {
        success: true,
        data: this.themeSettings,
      };
    } catch (error) {
      console.error("Erro ao obter configurações de tema:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async updateThemeSettings(_, themeData) {
    try {
      this.themeSettings = { ...this.themeSettings, ...themeData };

      // Aqui você pode aplicar o tema na janela atual
      this.sendToConfigWindow("theme-updated", this.themeSettings);

      return {
        success: true,
        message: "Configurações de tema atualizadas",
        data: this.themeSettings,
      };
    } catch (error) {
      console.error("Erro ao atualizar configurações de tema:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async exportSettings() {
    try {
      const settings = {
        system: this.systemConfig,
        theme: this.themeSettings,
        exportDate: new Date().toISOString(),
      };

      return {
        success: true,
        data: settings,
        message: "Configurações exportadas com sucesso",
      };
    } catch (error) {
      console.error("Erro ao exportar configurações:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async importSettings(_, settingsData) {
    try {
      if (settingsData.system) {
        this.systemConfig = { ...this.systemConfig, ...settingsData.system };
      }

      if (settingsData.theme) {
        this.themeSettings = { ...this.themeSettings, ...settingsData.theme };
      }

      return {
        success: true,
        message: "Configurações importadas com sucesso",
      };
    } catch (error) {
      console.error("Erro ao importar configurações:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Métodos existentes
  isConfigWindowOpen() {
    const window = getConfigWindow();
    return window && !window.isDestroyed();
  }

  focusConfigWindow() {
    const window = getConfigWindow();
    if (window && !window.isDestroyed()) {
      window.focus();
      return true;
    }
    return false;
  }

  sendToConfigWindow(channel, data) {
    const window = getConfigWindow();
    if (window && !window.isDestroyed()) {
      window.webContents.send(channel, data);
      return true;
    }
    return false;
  }
}

module.exports = ConfigHandlers;
