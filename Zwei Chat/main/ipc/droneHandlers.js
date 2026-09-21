// main/ipc/droneHandlers.js
const droneService = require("../../services/droneService");

class DroneHandlers {
  constructor(windowManager) {
      this.windowManager = windowManager;
      this.bindEvents();
  }

  bindEvents() {
      // Repassa eventos do serviço para a janela principal do Electron
      droneService.on('instance-update', (data) => {
          this.sendToWindow('drone-instance-update', data);
      });

      droneService.on('log', (data) => {
          this.sendToWindow('drone-log', data);
      });

      droneService.on('dispatch-status', (data) => {
          this.sendToWindow('drone-dispatch-status', data);
      });

      droneService.on('dispatch-progress', (data) => {
          this.sendToWindow('drone-dispatch-progress', data);
      });

      droneService.on('dispatch-complete', (data) => {
          this.sendToWindow('drone-dispatch-complete', data);
      });
  }

  sendToWindow(channel, data) {
      const win = this.windowManager.getMainWindow();
      if (win && !win.isDestroyed()) {
          win.webContents.send(channel, data);
      }
  }

  register(ipcMain) {
    ipcMain.handle("drone-get-instances", this.getInstances.bind(this));
    ipcMain.handle("drone-create-instance", this.createInstance.bind(this));
    ipcMain.handle("drone-remove-instance", this.removeInstance.bind(this));
    ipcMain.handle("drone-start-instance", this.startInstance.bind(this));
    ipcMain.handle("drone-stop-instance", this.stopInstance.bind(this));
    
    ipcMain.handle("drone-get-config", this.getConfig.bind(this));
    ipcMain.handle("drone-set-config", this.setConfig.bind(this));
    
    // Rotas de CRUD de mensagens
    ipcMain.handle("drone-get-messages", this.getMessages.bind(this));
    ipcMain.handle("drone-add-message", this.addMessage.bind(this));
    ipcMain.handle("drone-delete-message", this.deleteMessage.bind(this));

    // Rotas de Clientes Destinatários
    ipcMain.handle("drone-get-clients", this.getClients.bind(this));
    ipcMain.handle("drone-add-client", this.addClient.bind(this));
    ipcMain.handle("drone-add-clients-batch", this.addClientsBatch.bind(this));
    ipcMain.handle("drone-remove-client", this.removeClient.bind(this));
    ipcMain.handle("drone-clear-clients", this.clearClients.bind(this));
    ipcMain.handle("drone-get-stats", this.getStats.bind(this));

    // Controle de Disparo
    ipcMain.handle("drone-start-dispatch", this.startDispatch.bind(this));
    ipcMain.handle("drone-stop-dispatch", this.stopDispatch.bind(this));
  }

  unregister(ipcMain) {
    ipcMain.removeHandler("drone-get-instances");
    ipcMain.removeHandler("drone-create-instance");
    ipcMain.removeHandler("drone-remove-instance");
    ipcMain.removeHandler("drone-start-instance");
    ipcMain.removeHandler("drone-stop-instance");
    ipcMain.removeHandler("drone-get-config");
    ipcMain.removeHandler("drone-set-config");
    ipcMain.removeHandler("drone-get-messages");
    ipcMain.removeHandler("drone-add-message");
    ipcMain.removeHandler("drone-delete-message");
    ipcMain.removeHandler("drone-get-clients");
    ipcMain.removeHandler("drone-add-client");
    ipcMain.removeHandler("drone-add-clients-batch");
    ipcMain.removeHandler("drone-remove-client");
    ipcMain.removeHandler("drone-clear-clients");
    ipcMain.removeHandler("drone-get-stats");
    ipcMain.removeHandler("drone-start-dispatch");
    ipcMain.removeHandler("drone-stop-dispatch");
  }

  async getInstances() {
    return droneService.getInstances();
  }

  async createInstance(event, name) {
    return await droneService.createInstance(name);
  }

  async removeInstance(event, instanceId) {
    return await droneService.removeInstance(instanceId);
  }

  async startInstance(event, instanceId) {
    return await droneService.startInstance(instanceId);
  }

  async stopInstance(event, instanceId) {
    return await droneService.stopInstance(instanceId);
  }

  async getConfig() {
    return droneService.getConfig();
  }

  async setConfig(event, config) {
    await droneService.setConfig(config);
    return { success: true };
  }

  async getMessages() {
    return await droneService.dbGetDroneMessages();
  }

  async addMessage(event, content) {
    return await droneService.dbAddDroneMessage(content);
  }

  async deleteMessage(event, id) {
    return await droneService.dbDeleteDroneMessage(id);
  }

  async getClients() {
    return await droneService.dbGetDroneClients();
  }

  async addClient(event, { name, tel }) {
    return await droneService.dbAddDroneClient(name, tel);
  }

  async addClientsBatch(event, clients) {
    return await droneService.dbAddDroneClientsBatch(clients);
  }

  async removeClient(event, id) {
    return await droneService.dbRemoveDroneClient(id);
  }

  async clearClients(event, type) {
    return await droneService.dbClearDroneClients(type);
  }

  async getStats() {
    return await droneService.dbGetDroneStats();
  }

  async startDispatch() {
    try {
      return await droneService.startDispatch();
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  async stopDispatch() {
    return await droneService.stopDispatch();
  }
}

module.exports = DroneHandlers;
