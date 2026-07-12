// main/windowManager.js
const { BrowserWindow } = require("electron");
const path = require("path");
const pathHelper = require("../utils/pathHelper");

class WindowManager {
  constructor() {
    this.mainWindow = null;
  }

  createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        preload: path.join(__dirname, "../renderer/preload/preload.js"),
        nodeIntegration: false,
        contextIsolation: true,
      },
      icon: path.join(__dirname, "../build/Zwei-chat-_Arte-Gimp_.ico"), // mantendo compatibilidade de ícone se houver pasta build
    });

    // Caminho para o HTML da UI lite
    const htmlPath = path.join(__dirname, "../renderer/html/index.html");
    this.mainWindow.loadFile(htmlPath);

    // Remove barra de menu em produção
    if (pathHelper.isPackaged) {
      this.mainWindow.setMenuBarVisibility(false);
    }

    return this.mainWindow;
  }

  getMainWindow() {
    return this.mainWindow;
  }

  // Método para recriar janela principal (macOS)
  recreateMainWindow() {
    if (BrowserWindow.getAllWindows().length === 0) {
      this.createMainWindow();
    }
  }
}

module.exports = WindowManager;
