const { autoUpdater } = require("electron-updater");
const { ipcMain } = require("electron");

class UpdateHandlers {
  constructor(windowManager) {
    this.windowManager = windowManager;
    this.configureAutoUpdater();
  }

  configureAutoUpdater() {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    // Forward events to renderer
    autoUpdater.on("checking-for-update", () => {
      this.sendToWindow("update-checking");
    });

    autoUpdater.on("update-available", (info) => {
      this.sendToWindow("update-available", info);
    });

    autoUpdater.on("update-not-available", (info) => {
      this.sendToWindow("update-not-available", info);
    });

    autoUpdater.on("error", (err) => {
      this.sendToWindow("update-error", err.message);
    });

    autoUpdater.on("download-progress", (progressObj) => {
      this.sendToWindow("update-download-progress", progressObj);
    });

    autoUpdater.on("update-downloaded", (info) => {
      this.sendToWindow("update-downloaded", info);
    });
  }

  sendToWindow(channel, ...args) {
    if (this.windowManager && this.windowManager.mainWindow) {
      this.windowManager.mainWindow.webContents.send(channel, ...args);
    }
  }

  async checkForUpdates() {
    try {
      // In dev mode, we might want to force check if configured, 
      // but usually we just let it fail or log.
      // autoUpdater.forceDevUpdateConfig = true; // Uncomment for dev testing if needed
      return await autoUpdater.checkForUpdates();
    } catch (error) {
      console.error("Error checking for updates:", error);
      throw error;
    }
  }

  async downloadUpdate() {
    return await autoUpdater.downloadUpdate();
  }

  quitAndInstall() {
    autoUpdater.quitAndInstall();
  }
}

module.exports = UpdateHandlers;
