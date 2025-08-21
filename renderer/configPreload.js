// renderer/configPreload.js
const { contextBridge, ipcRenderer } = require("electron");

// Expõe APIs seguras para o renderer de configurações
contextBridge.exposeInMainWorld("configAPI", {
  // Mensagens
  getMessages: () => ipcRenderer.invoke("config-get-messages"),
  addMessage: (messageData) =>
    ipcRenderer.invoke("config-add-message", messageData),
  updateMessage: (id, messageData) =>
    ipcRenderer.invoke("config-update-message", id, messageData),
  deleteMessage: (id) => ipcRenderer.invoke("config-delete-message", id),
  getLastMessage: () => ipcRenderer.invoke("config-get-last-message"),
  getMessageTypes: () => ipcRenderer.invoke("config-get-message-types"),
  getLocales: () => ipcRenderer.invoke("config-get-locales"),

  // Navegação
  closeWindow: () => ipcRenderer.invoke("config-close-window"),
});
