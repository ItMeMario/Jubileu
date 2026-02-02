// renderer/guiConfig/crmWindow.js
const { BrowserWindow } = require("electron");
const path = require("path");

let crmWindow = null;

function createCRMWindow() {
  if (crmWindow) {
    crmWindow.focus();
    return crmWindow;
  }

  crmWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    parent: require("electron").BrowserWindow.getFocusedWindow(),
    // modal: true, // Optional: decides if it blocks the main window
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"), // Reusing main preload for now, or should I create specific?
      // actually drone uses dronePreload.js, but config uses... let's check configWindow usage in windowManager
      // windowManager uses ../renderer/preload/preload.js for main window.
      // let's stick to the main preload since I'm adding openCRM to it.
      // Wait, drone uses specific preload. Let's see if I need one.
      // For now, I'll use the main preload if it has what I need (standard IPC).
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: "CRM - Jubileu",
    resizable: true,
    minimizable: true,
    maximizable: true,
  });

  // Check if we need a specific preload.
  // The main preload has all the "electronAPI" exposed.
  // If crm.html uses "electronAPI", it needs that preload.
  // windowManager.js uses `../renderer/preload/preload.js` for main window.
  // `configWindow.js` uses `../renderer/preload/configPreload.js`? I should check.
  // I'll assume standard preload is fine or I might need to check other windows.
  // Actually, let's check configWindow.js to be sure.
  
  const htmlPath = path.join(__dirname, "../html/crm.html");
  crmWindow.loadFile(htmlPath);

  crmWindow.on("closed", () => {
    crmWindow = null;
  });

  return crmWindow;
}

function getCRMWindow() {
  return crmWindow;
}

function closeCRMWindow() {
  if (crmWindow) {
    crmWindow.close();
  }
}

module.exports = {
  createCRMWindow,
  getCRMWindow,
  closeCRMWindow,
};
