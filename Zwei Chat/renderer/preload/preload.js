// renderer/preload/preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  startWhatsApp: (instanceId) => ipcRenderer.invoke("start-whatsapp", instanceId),
  stopWhatsApp: (instanceId) => ipcRenderer.invoke("stop-whatsapp", instanceId),
  getWhatsAppStatus: (instanceId) => ipcRenderer.invoke("get-whatsapp-status", instanceId),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  getFlows: () => ipcRenderer.invoke("get-flows"),
  saveFlow: (flow) => ipcRenderer.invoke("save-flow", flow),
  deleteFlow: (id) => ipcRenderer.invoke("delete-flow", id),
  toggleFlow: (id, active) => ipcRenderer.invoke("toggle-flow", { id, active }),

  // Rotas de instâncias
  getInstances: () => ipcRenderer.invoke("get-instances"),
  createInstance: (name) => ipcRenderer.invoke("create-instance", name),
  deleteInstance: (id) => ipcRenderer.invoke("delete-instance", id),
  renameInstance: (id, name) => ipcRenderer.invoke("rename-instance", { id, name }),

  // Listeners de eventos
  onQRGenerated: (callback) => {
    ipcRenderer.on("qr-generated", (event, data) => callback(data));
  },

  onWhatsAppReady: (callback) => {
    ipcRenderer.on("whatsapp-ready", (event, data) => callback(data));
  },

  onWhatsAppAuthenticated: (callback) => {
    ipcRenderer.on("whatsapp-authenticated", (event, data) => callback(data));
  },

  onWhatsAppDisconnected: (callback) => {
    ipcRenderer.on("whatsapp-disconnected", (event, data) => callback(data));
  },

  onWhatsAppLoading: (callback) => {
    ipcRenderer.on("whatsapp-loading", (event, data) => callback(data));
  },

  onError: (callback) => {
    ipcRenderer.on("error", (event, data) => callback(data));
  },

  onConsoleMessage: (callback) => {
    ipcRenderer.on("console-message", (event, data) => callback(data));
  },

  removeAllListeners: () => {
    ipcRenderer.removeAllListeners("qr-generated");
    ipcRenderer.removeAllListeners("whatsapp-ready");
    ipcRenderer.removeAllListeners("whatsapp-authenticated");
    ipcRenderer.removeAllListeners("whatsapp-disconnected");
    ipcRenderer.removeAllListeners("whatsapp-loading");
    ipcRenderer.removeAllListeners("error");
    ipcRenderer.removeAllListeners("console-message");
  }
});

console.log("🔧 Preload do Zwei Chat carregado com sucesso!");
