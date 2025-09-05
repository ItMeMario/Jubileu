const { BrowserWindow } = require("electron");
const path = require("path");
const pathHelper = require("../utils/pathHelper");
const {
  createConfigWindow,
  closeConfigWindow,
  getConfigWindow,
} = require("../renderer/guiConfig/configWindow");


class WindowManager {
  constructor() {
    this.mainWindow = null;
  }

  createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        preload: path.join(__dirname, "../renderer/preload/preload.js"),
        nodeIntegration: false,
        contextIsolation: true,
      },

      icon: path.join(__dirname, "../assets/icon.png"),
    });

    // Caminho para o HTML
    const htmlPath = pathHelper.isPackaged
      ? path.join(__dirname, "../renderer/html/index.html")
      : path.join(__dirname, "../renderer/html/index.html");

    this.mainWindow.loadFile(htmlPath);

    // Remove menu bar em produção
    if (pathHelper.isPackaged) {
      this.mainWindow.setMenuBarVisibility(false);
    }

    return this.mainWindow;
  }

  getMainWindow() {
    return this.mainWindow;
  }

  // Métodos para janela de configuração
  openConfigWindow() {
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

  closeConfigWindow() {
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

  // Método para recriar janela principal (macOS)
  recreateMainWindow() {
    if (BrowserWindow.getAllWindows().length === 0) {
      this.createMainWindow();
    }
  }
}

module.exports = WindowManager;
