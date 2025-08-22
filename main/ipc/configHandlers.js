const {
  createConfigWindow,
  closeConfigWindow,
  getConfigWindow,
} = require("../../renderer/guiConfig/configWindow");

class ConfigHandlers {
  constructor() {
    // Pode armazenar estado específico dos handlers de config se necessário
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

  // Método para verificar se a janela de config está aberta
  isConfigWindowOpen() {
    const window = getConfigWindow();
    return window && !window.isDestroyed();
  }

  // Método para focar na janela de config se ela existir
  focusConfigWindow() {
    const window = getConfigWindow();
    if (window && !window.isDestroyed()) {
      window.focus();
      return true;
    }
    return false;
  }

  // Método para enviar dados para a janela de config
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
