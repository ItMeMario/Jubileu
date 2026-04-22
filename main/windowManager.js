const { BrowserWindow } = require("electron");
const path = require("path");
const pathHelper = require("../utils/pathHelper");
const {
  createConfigWindow,
  closeConfigWindow,
  getConfigWindow,
} = require("../renderer/guiConfig/configWindow");
const {
  createDroneWindow,
  closeDroneWindow,
  getDroneWindow,
} = require("../renderer/guiConfig/droneWindow");
const {
  createDeeJayWindow,
  getDeeJayWindow,
} = require("../renderer/guiConfig/deeJayWindow");
const {
  createCRMWindow,
  closeCRMWindow,
  getCRMWindow,
} = require("../renderer/guiConfig/crmWindow");
const {
  createGoatWindow,
  getGoatWindow,
  closeGoatWindow,
} = require("../renderer/guiConfig/goatWindow");
const {
  createSentinelaWindow,
  getSentinelaWindow,
  closeSentinelaWindow,
} = require("../renderer/guiConfig/sentinelaWindow");

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

  // Métodos para janela de Drone
  openDroneWindow() {
    try {
      console.log("Abrindo Drone...");
      let win = getDroneWindow();
      if (!win) {
        win = createDroneWindow();
      } else {
        win.focus();
      }
      return { success: true, message: "Janela Drone aberta" };
    } catch (error) {
      console.error("Erro ao abrir Drone:", error);
      return {
        success: false,
        message: "Erro ao abrir Drone: " + error.message,
      };
    }
  }

  closeDroneWindow() {
    try {
      closeDroneWindow();
      return { success: true, message: "Janela Drone fechada" };
    } catch (error) {
      console.error("Erro ao fechar Drone:", error);
      return {
        success: false,
        message: "Erro ao fechar Drone: " + error.message,
      };
    }
  }

  // Métodos para janela Dee Jay
  openDeeJayWindow() {
      try {
          console.log("Abrindo Dee Jay...");
          let win = getDeeJayWindow();
          if (!win) {
              win = createDeeJayWindow();
          } else {
              win.focus();
          }
          return { success: true, message: "Janela Dee Jay aberta" };
      } catch (error) {
          console.error("Erro ao abrir Dee Jay:", error);
          return { success: false, message: "Erro ao abrir Dee Jay: " + error.message };
      }
  }
  
  closeDeeJayWindow() {
      try {
          closeDeeJayWindow();
          return { success: true, message: "Janela Dee Jay fechada" };
      } catch (error) {
           return { success: false, message: "Erro ao fechar: " + error.message };
      }
  }
  
  getDeeJayWindow() {
      return getDeeJayWindow();
  }

  // Métodos para janela CRM
  openCRMWindow() {
      try {
          console.log("Abrindo CRM...");
          let win = getCRMWindow();
          if (!win) {
              win = createCRMWindow();
          } else {
              win.focus();
          }
          return { success: true, message: "Janela CRM aberta" };
      } catch (error) {
          console.error("Erro ao abrir CRM:", error);
          return { success: false, message: "Erro ao abrir CRM: " + error.message };
      }
  }
  
  closeCRMWindow() {
      try {
          closeCRMWindow();
          return { success: true, message: "Janela CRM fechada" };
      } catch (error) {
           return { success: false, message: "Erro ao fechar: " + error.message };
      }
  }

  getCRMWindow() {
      return getCRMWindow();
  }

  // Métodos para janela Goat
  openGoatWindow() {
      try {
          console.log("Abrindo Goat...");
          let win = getGoatWindow();
          if (!win) {
              win = createGoatWindow();
          } else {
              win.focus();
          }
          return { success: true, message: "Janela Goat aberta" };
      } catch (error) {
          console.error("Erro ao abrir Goat:", error);
          return { success: false, message: "Erro ao abrir Goat: " + error.message };
      }
  }

  closeGoatWindow() {
      try {
          closeGoatWindow();
          return { success: true, message: "Janela Goat fechada" };
      } catch (error) {
           return { success: false, message: "Erro ao fechar: " + error.message };
      }
  }

  getGoatWindow() {
      return getGoatWindow();
  }

  // Métodos para janela Sentinela
  openSentinelaWindow() {
      try {
          console.log("Abrindo Sentinela...");
          let win = getSentinelaWindow();
          if (!win) {
              win = createSentinelaWindow();
          } else {
              win.focus();
          }
          return { success: true, message: "Janela Sentinela aberta" };
      } catch (error) {
          console.error("Erro ao abrir Sentinela:", error);
          return { success: false, message: "Erro ao abrir Sentinela: " + error.message };
      }
  }

  closeSentinelaWindow() {
      try {
          closeSentinelaWindow();
          return { success: true, message: "Janela Sentinela fechada" };
      } catch (error) {
           return { success: false, message: "Erro ao fechar: " + error.message };
      }
  }

  getSentinelaWindow() {
      return getSentinelaWindow();
  }

  // Método para recriar janela principal (macOS)
  recreateMainWindow() {
    if (BrowserWindow.getAllWindows().length === 0) {
      this.createMainWindow();
    }
  }
}

module.exports = WindowManager;
