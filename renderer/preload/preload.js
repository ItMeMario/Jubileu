const { contextBridge, ipcRenderer } = require("electron");

// Expõe APIs seguras para o renderer
contextBridge.exposeInMainWorld("electronAPI", {
  // Métodos para comunicação com o processo principal
  startWhatsApp: () => ipcRenderer.invoke("start-whatsapp"),
  openConfig: () => ipcRenderer.invoke("open-config"),
  stopWhatsApp: () => ipcRenderer.invoke("stop-whatsapp"),

  // Listeners para eventos do processo principal
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

  // 🆕 NOVO MÉTODO PARA LOGS DO PROCESSO PRINCIPAL
  onConsoleMessage: (callback) => {
    ipcRenderer.on("console-message", (event, data) => {
      callback(data);
    });
  },

  // Método para remover listeners (cleanup)
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners("qr-generated");
    ipcRenderer.removeAllListeners("whatsapp-ready");
    ipcRenderer.removeAllListeners("whatsapp-authenticated");
    ipcRenderer.removeAllListeners("whatsapp-disconnected");
    ipcRenderer.removeAllListeners("error");
    // 🆕 ADICIONA REMOÇÃO DO NOVO LISTENER
    ipcRenderer.removeAllListeners("console-message");
  },
});

// Debug simples sem acessar arguments
console.log("🔧 Preload carregado - console redirect disponível!");
