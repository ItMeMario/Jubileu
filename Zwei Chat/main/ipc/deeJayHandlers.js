// main/ipc/deeJayHandlers.js
const deeJayService = require("../../services/deeJayService");

class DeeJayHandlers {
  constructor(windowManager) {
      this.windowManager = windowManager;
      this.bindEvents();
  }

  bindEvents() {
      // Repassa eventos do serviço para a janela principal do Electron
      deeJayService.on('instance-update', (data) => {
          this.sendToWindow('dee-jay-instance-update', data);
      });

      deeJayService.on('log', (data) => {
          this.sendToWindow('dee-jay-log', data);
      });

      deeJayService.on('loop-status', (data) => {
          this.sendToWindow('dee-jay-loop-status', data);
      });
  }

  sendToWindow(channel, data) {
      const win = this.windowManager.getMainWindow();
      if (win && !win.isDestroyed()) {
          win.webContents.send(channel, data);
      }
  }

  register(ipcMain) {
    ipcMain.handle("dee-jay-get-instances", this.getInstances.bind(this));
    ipcMain.handle("dee-jay-create-instance", this.createInstance.bind(this));
    ipcMain.handle("dee-jay-remove-instance", this.removeInstance.bind(this));
    ipcMain.handle("dee-jay-start-instance", this.startInstance.bind(this));
    ipcMain.handle("dee-jay-stop-instance", this.stopInstance.bind(this));
    ipcMain.handle("dee-jay-start-loop", this.startLoop.bind(this));
    ipcMain.handle("dee-jay-stop-loop", this.stopLoop.bind(this));
    ipcMain.handle("dee-jay-get-config", this.getConfig.bind(this));
    ipcMain.handle("dee-jay-set-config", this.setConfig.bind(this));
    ipcMain.handle("dee-jay-get-connected-count", this.getConnectedCount.bind(this));
    
    // Rotas de CRUD de mensagens
    ipcMain.handle("dee-jay-get-messages", this.getMessages.bind(this));
    ipcMain.handle("dee-jay-add-message", this.addMessage.bind(this));
    ipcMain.handle("dee-jay-delete-message", this.deleteMessage.bind(this));
  }

  unregister(ipcMain) {
    ipcMain.removeHandler("dee-jay-get-instances");
    ipcMain.removeHandler("dee-jay-create-instance");
    ipcMain.removeHandler("dee-jay-remove-instance");
    ipcMain.removeHandler("dee-jay-start-instance");
    ipcMain.removeHandler("dee-jay-stop-instance");
    ipcMain.removeHandler("dee-jay-start-loop");
    ipcMain.removeHandler("dee-jay-stop-loop");
    ipcMain.removeHandler("dee-jay-get-config");
    ipcMain.removeHandler("dee-jay-set-config");
    ipcMain.removeHandler("dee-jay-get-connected-count");
    ipcMain.removeHandler("dee-jay-get-messages");
    ipcMain.removeHandler("dee-jay-add-message");
    ipcMain.removeHandler("dee-jay-delete-message");
  }

  async getInstances() {
    return deeJayService.getInstances();
  }

  async getConnectedCount() {
    return deeJayService.getConnectedCount();
  }

  async createInstance(event, name) {
    return await deeJayService.createInstance(name);
  }

  async removeInstance(event, instanceId) {
    return await deeJayService.removeInstance(instanceId);
  }

  async startInstance(event, instanceId) {
    return await deeJayService.startInstance(instanceId);
  }

  async stopInstance(event, instanceId) {
    return await deeJayService.stopInstance(instanceId);
  }

  async startLoop() {
    try {
        await deeJayService.startLoop();
        return { success: true };
    } catch (e) {
        return { success: false, message: e.message };
    }
  }

  async stopLoop() {
    await deeJayService.stopLoop();
    return { success: true };
  }

  async getConfig() {
      return deeJayService.getConfig();
  }

  async setConfig(event, config) {
      await deeJayService.setConfig(config);
      return { success: true };
  }

  async getMessages() {
      return await deeJayService.dbGetDeeJayMessages();
  }

  async addMessage(event, content) {
      return await deeJayService.dbAddDeeJayMessage(content);
  }

  async deleteMessage(event, id) {
      return await deeJayService.dbDeleteDeeJayMessage(id);
  }
}

module.exports = DeeJayHandlers;
