const { contextBridge, ipcRenderer } = require("electron");

// Expõe APIs seguras para o renderer
contextBridge.exposeInMainWorld("electronAPI", {
  // ========================================
  // APIs legadas (WhatsApp single instance)
  // ========================================
  startWhatsApp: () => ipcRenderer.invoke("start-whatsapp"),
  stopWhatsApp: () => ipcRenderer.invoke("stop-whatsapp"),
  openConfig: () => ipcRenderer.invoke("open-config"),
  openDrone: () => ipcRenderer.invoke("open-drone"),
  openCRM: () => ipcRenderer.invoke("open-crm"),
  openDeeJayWindow: () => ipcRenderer.invoke("open-dee-jay-window"),
  openGoat: () => ipcRenderer.invoke("open-goat"),
  openSentinela: () => ipcRenderer.invoke("open-sentinela"),
  
  crm: {
      createInstance: (name) => ipcRenderer.invoke("crm-create-instance", name),
      getInstances: () => ipcRenderer.invoke("crm-get-instances"),
  },

  clearCache: () => ipcRenderer.invoke("clear-cache"),
  checkUpdate: () => ipcRenderer.invoke("check-update"),
  triggerUpdate: () => ipcRenderer.invoke("trigger-update"),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),

  // Listeners legados
  onQRGenerated: (callback) => {
    ipcRenderer.on("qr-generated", (event, data) => callback(data));
  },

  onWhatsAppReady: (callback) => {
    ipcRenderer.on("whatsapp-ready", (event, message) => callback(message));
  },

  onWhatsAppAuthenticated: (callback) => {
    ipcRenderer.on("whatsapp-authenticated", (event, message) =>
      callback(message)
    );
  },

  onWhatsAppDisconnected: (callback) => {
    ipcRenderer.on("whatsapp-disconnected", (event, message) =>
      callback(message)
    );
  },

  onError: (callback) => {
    ipcRenderer.on("error", (event, message) => callback(message));
  },

  // Console redirect
  onConsoleMessage: (callback) => {
    ipcRenderer.on("console-message", (event, data) => {
      callback(data);
    });
  },

  // ========================================
  // APIs de Instâncias (Multi-instance)
  // ========================================
  instances: {
    // Inicialização
    initialize: () => ipcRenderer.invoke("instance-initialize"),

    // CRUD
    list: () => ipcRenderer.invoke("instance-list"),
    create: (name) => ipcRenderer.invoke("instance-create", { name }),
    remove: (instanceId) =>
      ipcRenderer.invoke("instance-remove", { instanceId }),
    rename: (instanceId, name) =>
      ipcRenderer.invoke("instance-rename", { instanceId, name }),

    // Controle de conexão
    start: (instanceId) => ipcRenderer.invoke("instance-start", { instanceId }),
    stop: (instanceId) => ipcRenderer.invoke("instance-stop", { instanceId }),
    reconnect: (instanceId) =>
      ipcRenderer.invoke("instance-reconnect", { instanceId }),
    stopAll: () => ipcRenderer.invoke("instance-stop-all"),

    // Status
    getStatus: (instanceId) =>
      ipcRenderer.invoke("instance-status", { instanceId }),
    getAllStatus: () => ipcRenderer.invoke("instance-status-all"),
    getClientInfo: (instanceId) =>
      ipcRenderer.invoke("instance-client-info", { instanceId }),

    // Mensagens
    sendMessage: (instanceId, to, message) =>
      ipcRenderer.invoke("instance-send-message", { instanceId, to, message }),

    // Configuração
    getConfig: () => ipcRenderer.invoke("instance-get-config"),

    // ========================================
    // Listeners de eventos de instâncias
    // ========================================
    onQR: (callback) => {
      ipcRenderer.on("instance-qr", (event, data) => callback(data));
    },

    onAuthenticated: (callback) => {
      ipcRenderer.on("instance-authenticated", (event, data) => callback(data));
    },

    onReady: (callback) => {
      ipcRenderer.on("instance-ready", (event, data) => callback(data));
    },

    onAuthFailure: (callback) => {
      ipcRenderer.on("instance-auth-failure", (event, data) => callback(data));
    },

    onDisconnected: (callback) => {
      ipcRenderer.on("instance-disconnected", (event, data) => callback(data));
    },

    onLoading: (callback) => {
      ipcRenderer.on("instance-loading", (event, data) => callback(data));
    },

    onStateChange: (callback) => {
      ipcRenderer.on("instance-state-change", (event, data) => callback(data));
    },

    onCreated: (callback) => {
      ipcRenderer.on("instance-created", (event, data) => callback(data));
    },

    onRemoved: (callback) => {
      ipcRenderer.on("instance-removed", (event, data) => callback(data));
    },

    onRenamed: (callback) => {
      ipcRenderer.on("instance-renamed", (event, data) => callback(data));
    },

    onStopped: (callback) => {
      ipcRenderer.on("instance-stopped", (event, data) => callback(data));
    },

    onReconnecting: (callback) => {
      ipcRenderer.on("instance-reconnecting", (event, data) => callback(data));
    },

    onAllStopped: (callback) => {
      ipcRenderer.on("all-instances-stopped", (event, data) => callback(data));
    },

    // Remove todos os listeners de instâncias
    removeAllListeners: () => {
      const instanceEvents = [
        "instance-qr",
        "instance-authenticated",
        "instance-ready",
        "instance-auth-failure",
        "instance-disconnected",
        "instance-loading",
        "instance-state-change",
        "instance-created",
        "instance-removed",
        "instance-renamed",
        "instance-stopped",
        "instance-reconnecting",
        "all-instances-stopped",
      ];

      instanceEvents.forEach((event) => {
        ipcRenderer.removeAllListeners(event);
      });
    },
  },

  // ========================================
  // Cleanup geral
  // ========================================
  removeAllListeners: () => {
    // Listeners legados
    ipcRenderer.removeAllListeners("qr-generated");
    ipcRenderer.removeAllListeners("whatsapp-ready");
    ipcRenderer.removeAllListeners("whatsapp-authenticated");
    ipcRenderer.removeAllListeners("whatsapp-disconnected");
    ipcRenderer.removeAllListeners("error");
    ipcRenderer.removeAllListeners("console-message");

    // Listeners de instâncias
    const instanceEvents = [
      "instance-qr",
      "instance-authenticated",
      "instance-ready",
      "instance-auth-failure",
      "instance-disconnected",
      "instance-loading",
      "instance-state-change",
      "instance-created",
      "instance-removed",
      "instance-renamed",
      "instance-stopped",
      "instance-reconnecting",
      "all-instances-stopped",
    ];

    instanceEvents.forEach((event) => {
      ipcRenderer.removeAllListeners(event);
    });

  },
});

// Debug
console.log("🔧 Preload carregado - APIs de instâncias disponíveis!");
