// renderer/configPreload.js
const { contextBridge, ipcRenderer } = require("electron");

// ✅ ADICIONADO: APIs de cidade (a correção principal)
contextBridge.exposeInMainWorld("cityAPI", {
  getCities: () => ipcRenderer.invoke("get-cities"),
  addCity: (cityData) => ipcRenderer.invoke("add-city", cityData),
  updateCity: (id, cityData) => ipcRenderer.invoke("update-city", id, cityData),
  deleteCity: (id) => ipcRenderer.invoke("delete-city", id),
});

// ✅ MANTIDO: APIs de configuração existentes
contextBridge.exposeInMainWorld("configAPI", {
  // Configurações gerais do sistema
  getSystemConfig: () => ipcRenderer.invoke("config-get-system-config"),
  updateSystemConfig: (configData) =>
    ipcRenderer.invoke("config-update-system-config", configData),

  // Opções disponíveis para configurações
  getAvailableOptions: () => ipcRenderer.invoke("config-get-available-options"),

  // Configurações de tema/interface
  getThemeSettings: () => ipcRenderer.invoke("config-get-theme-settings"),
  updateThemeSettings: (themeData) =>
    ipcRenderer.invoke("config-update-theme-settings", themeData),

  // Navegação
  closeWindow: () => ipcRenderer.invoke("config-close-window"),

  // Outras configurações
  exportSettings: () => ipcRenderer.invoke("config-export-settings"),
  importSettings: (settingsData) =>
    ipcRenderer.invoke("config-import-settings", settingsData),
});

// ✅ MANTIDO: APIs de mensagem existentes
contextBridge.exposeInMainWorld("messageAPI", {
  // Operações CRUD de mensagens
  getMessages: () => ipcRenderer.invoke("message-get-messages"),
  addMessage: (messageData) =>
    ipcRenderer.invoke("message-add-message", messageData),
  updateMessage: (id, messageData) =>
    ipcRenderer.invoke("message-update-message", id, messageData),
  deleteMessage: (id) => ipcRenderer.invoke("message-delete-message", id),
  getLastMessage: () => ipcRenderer.invoke("message-get-last-message"),

  // Opções específicas para mensagens
  getMessageTypes: () => ipcRenderer.invoke("message-get-types"),
  getMessageLocales: () => ipcRenderer.invoke("message-get-locales"),
  getAvailableOptions: () =>
    ipcRenderer.invoke("message-get-available-options"),
});

// ✅ ADICIONADO: Debug helper para verificar se está funcionando
contextBridge.exposeInMainWorld("debugAPI", {
  log: (message) => console.log("[ConfigPreload]", message),
  checkAPIs: () => {
    console.log("📋 APIs disponíveis na janela de configurações:");
    console.log("- window.cityAPI:", typeof window.cityAPI);
    console.log("- window.configAPI:", typeof window.configAPI);
    console.log("- window.messageAPI:", typeof window.messageAPI);

    if (window.cityAPI) {
      console.log("🏙️ Métodos cityAPI:", Object.keys(window.cityAPI));
    }
  },
});
