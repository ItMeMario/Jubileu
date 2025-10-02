// renderer/guiConfig/droneWindow.js
const { BrowserWindow } = require("electron");
const path = require("path");

let droneWindow = null;

function createDroneWindow() {
  if (droneWindow) {
    droneWindow.focus();
    return droneWindow;
  }

  droneWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    parent: require("electron").BrowserWindow.getFocusedWindow(),
    modal: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/dronePreload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: "Drone - Disparo de Mensagens",
    resizable: true,
    minimizable: false,
    maximizable: true,
  });

  const htmlPath = path.join(__dirname, "../html/drone.html");
  droneWindow.loadFile(htmlPath);

  droneWindow.on("closed", () => {
    droneWindow = null;
  });

  return droneWindow;
}

function getDroneWindow() {
  return droneWindow;
}

function closeDroneWindow() {
  if (droneWindow) {
    droneWindow.close();
  }
}

module.exports = {
  createDroneWindow,
  getDroneWindow,
  closeDroneWindow,
};
