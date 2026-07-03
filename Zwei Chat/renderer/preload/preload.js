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

contextBridge.exposeInMainWorld("deeJayAPI", {
    getInstances: () => ipcRenderer.invoke('dee-jay-get-instances'),
    createInstance: (name) => ipcRenderer.invoke('dee-jay-create-instance', name),
    removeInstance: (instanceId) => ipcRenderer.invoke('dee-jay-remove-instance', instanceId),
    startInstance: (instanceId) => ipcRenderer.invoke('dee-jay-start-instance', instanceId),
    stopInstance: (instanceId) => ipcRenderer.invoke('dee-jay-stop-instance', instanceId),
    
    startLoop: () => ipcRenderer.invoke('dee-jay-start-loop'),
    stopLoop: () => ipcRenderer.invoke('dee-jay-stop-loop'),
    
    getConfig: () => ipcRenderer.invoke('dee-jay-get-config'),
    setConfig: (config) => ipcRenderer.invoke('dee-jay-set-config', config),

    getMessages: () => ipcRenderer.invoke('dee-jay-get-messages'),
    addMessage: (content) => ipcRenderer.invoke('dee-jay-add-message', content),
    deleteMessage: (id) => ipcRenderer.invoke('dee-jay-delete-message', id),

    onInstanceUpdate: (callback) => {
        ipcRenderer.on('dee-jay-instance-update', (event, data) => callback(data));
    },
    onLog: (callback) => {
        ipcRenderer.on('dee-jay-log', (event, data) => callback(data));
    },
    onLoopStatus: (callback) => {
        ipcRenderer.on('dee-jay-loop-status', (event, data) => callback(data));
    },
    removeListeners: () => {
        ipcRenderer.removeAllListeners('dee-jay-instance-update');
        ipcRenderer.removeAllListeners('dee-jay-log');
        ipcRenderer.removeAllListeners('dee-jay-loop-status');
    }
});

console.log("🔧 Preload do Zwei Chat carregado com sucesso!");
