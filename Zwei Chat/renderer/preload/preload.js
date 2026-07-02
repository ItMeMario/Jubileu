// renderer/preload/preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  startWhatsApp: () => ipcRenderer.invoke("start-whatsapp"),
  stopWhatsApp: () => ipcRenderer.invoke("stop-whatsapp"),
  getWhatsAppStatus: () => ipcRenderer.invoke("get-whatsapp-status"),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  getFlows: () => ipcRenderer.invoke("get-flows"),
  saveFlow: (flow) => ipcRenderer.invoke("save-flow", flow),
  deleteFlow: (id) => ipcRenderer.invoke("delete-flow", id),
  toggleFlow: (id, active) => ipcRenderer.invoke("toggle-flow", { id, active }),

  // Listeners de eventos
  onQRGenerated: (callback) => {
    ipcRenderer.on("qr-generated", (event, data) => callback(data));
  },

  onWhatsAppReady: (callback) => {
    ipcRenderer.on("whatsapp-ready", (event, message) => callback(message));
  },

  onWhatsAppAuthenticated: (callback) => {
    ipcRenderer.on("whatsapp-authenticated", (event, message) => callback(message));
  },

  onWhatsAppDisconnected: (callback) => {
    ipcRenderer.on("whatsapp-disconnected", (event, reason) => callback(reason));
  },

  onWhatsAppLoading: (callback) => {
    ipcRenderer.on("whatsapp-loading", (event, data) => callback(data));
  },

  onError: (callback) => {
    ipcRenderer.on("error", (event, message) => callback(message));
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
