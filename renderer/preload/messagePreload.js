// renderer/preload/messagePreload.js
const { contextBridge, ipcRenderer } = require("electron");

// Expõe APIs específicas para o CRUD de mensagens
contextBridge.exposeInMainWorld("messageAPI", {
  // Operações CRUD de mensagens
  getMessages: () => ipcRenderer.invoke("message-get-messages"),
  addMessage: (messageData) =>
    ipcRenderer.invoke("message-add-message", messageData),
  updateMessage: (id, messageData) =>
    ipcRenderer.invoke("message-update-message", id, messageData),
  deleteMessage: (id) => ipcRenderer.invoke("message-delete-message", id),
  getLastMessage: () => ipcRenderer.invoke("message-get-last-message"),

  // Opções específicas para mensagens (se houver)
  getMessageTypes: () => ipcRenderer.invoke("message-get-types"),
  getMessageLocales: () => ipcRenderer.invoke("message-get-locales"),

  // Nova função: verificar completude das mensagens
  checkMessageCompleteness: (specificLocale = null) =>
    ipcRenderer.invoke("message-check-completeness", specificLocale),

  // Método de compatibilidade (fallback)
  getAvailableOptions: () =>
    ipcRenderer.invoke("message-get-available-options"),
});
