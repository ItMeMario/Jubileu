// renderer/configWindow.js
const { BrowserWindow } = require("electron");
const path = require("path");

let configWindow = null;

function createConfigWindow() {
  if (configWindow) {
    configWindow.focus();
    return configWindow;
  }

  configWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    parent: require("electron").BrowserWindow.getFocusedWindow(),
    modal: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/configPreload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: "Configurações - Jubileu",
    resizable: true,
    minimizable: false,
    maximizable: true,
  });

const htmlPath = path.join(__dirname, "../html/config.html");
configWindow.loadFile(htmlPath);


  configWindow.on("closed", () => {
    configWindow = null;
  });

  return configWindow;
}

function getConfigWindow() {
  return configWindow;
}

function closeConfigWindow() {
  if (configWindow) {
    configWindow.close();
  }
}

module.exports = {
  createConfigWindow,
  getConfigWindow,
  closeConfigWindow,
};
