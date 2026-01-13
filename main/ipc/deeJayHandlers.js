// main/ipc/deeJayHandlers.js
const deeJayService = require("../../services/deeJayService");

class DeeJayHandlers {
  constructor(windowManager) {
      this.windowManager = windowManager;
      this.bindEvents();
  }

  bindEvents() {
      // Forward service events to window
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
        // Assuming windowManager has a method or property to get Dee Jay window
        // But windowManager might not expose it directly or it might be in a different file.
        // Let's rely on broadcasting or checking if window is open.
        // We will implement getDeeJayWindow in WindowManager later.
        const win = this.windowManager.getDeeJayWindow();
        if (win && !win.isDestroyed()) {
            win.webContents.send(channel, data);
        }
  }

  async getInstances() {
    return deeJayService.getInstances();
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
    deeJayService.stopLoop();
    return { success: true };
  }

  async getConfig() {
      return deeJayService.getConfig();
  }

  async setConfig(event, config) {
      deeJayService.setConfig(config);
      return { success: true };
  }
  
  async openDeeJayWindow() {
      return this.windowManager.openDeeJayWindow();
  }
}

module.exports = DeeJayHandlers;
