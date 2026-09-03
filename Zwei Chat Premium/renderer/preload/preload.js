// renderer/preload/preload.js
// Context Bridge seguro entre o processo de Renderização (UI) e o processo Principal (Node.js/Electron)

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("zweiPremiumApi", {
  // 1. Diagnóstico e Configurações Meta
  getConfig: () => ipcRenderer.invoke("meta:get-config"),
  saveConfig: (config) => ipcRenderer.invoke("meta:save-config", config),
  testConnection: (config) => ipcRenderer.invoke("meta:test-connection", config),
  getAccountHealth: () => ipcRenderer.invoke("meta:get-account-health"),

  // 2. Message Templates
  syncTemplates: () => ipcRenderer.invoke("templates:sync"),
  getApprovedTemplates: (language) => ipcRenderer.invoke("templates:get-approved", language),
  getTemplates: (language) => ipcRenderer.invoke("templates:get-approved", language),
  renderTemplatePreview: (templateName, values) =>
    ipcRenderer.invoke("templates:render-preview", { templateName, values }),


  // 3. Disparador Oficial (Broadcast)
  startBroadcast: (params) => ipcRenderer.invoke("broadcast:start", params),
  pauseBroadcast: () => ipcRenderer.invoke("broadcast:pause"),
  resumeBroadcast: () => ipcRenderer.invoke("broadcast:resume"),
  stopBroadcast: () => ipcRenderer.invoke("broadcast:stop"),
  getBroadcastStats: () => ipcRenderer.invoke("broadcast:get-stats"),
  getRecipients: () => ipcRenderer.invoke("broadcast:get-recipients"),
  addRecipient: (contact) => ipcRenderer.invoke("broadcast:add-recipient", contact),
  addRecipientsBatch: (contacts) => ipcRenderer.invoke("broadcast:add-recipients-batch", contacts),
  removeRecipient: (id) => ipcRenderer.invoke("broadcast:remove-recipient", id),
  clearRecipients: (type) => ipcRenderer.invoke("broadcast:clear-recipients", type),
  getBroadcastConfig: () => ipcRenderer.invoke("broadcast:get-config"),
  saveBroadcastConfig: (config) => ipcRenderer.invoke("broadcast:save-config", config),
  getCampaignHistory: () => ipcRenderer.invoke("broadcast:get-history"),
  exportCampaignCsv: (campaignId) => ipcRenderer.invoke("broadcast:export-csv", campaignId),

  // 4. Fluxos Interativos e Chatbot
  getAllFlows: () => ipcRenderer.invoke("flows:get-all"),
  getActiveFlow: () => ipcRenderer.invoke("flows:get-active"),
  getFlowById: (flowId) => ipcRenderer.invoke("flows:get-by-id", flowId),
  createEmptyFlow: (name) => ipcRenderer.invoke("flows:create-empty", name),
  saveFlow: (flow) => ipcRenderer.invoke("flows:save", flow),
  deleteFlow: (flowId) => ipcRenderer.invoke("flows:delete", flowId),
  duplicateFlow: (flowId) => ipcRenderer.invoke("flows:duplicate", flowId),
  setActiveFlow: (flowId) => ipcRenderer.invoke("flows:set-active", flowId),
  getBotStatus: () => ipcRenderer.invoke("bot:get-status"),
  toggleBot: (enabled) => ipcRenderer.invoke("bot:toggle", enabled),

  // 5. Janela de 24 Horas e Conversas
  check24hWindow: (phone) => ipcRenderer.invoke("window24h:check", phone),
  getConversations: () => ipcRenderer.invoke("sync:get-conversations"),

  // 6. Listeners de Eventos em Tempo Real
  onBroadcastLog: (callback) => {
    const subscription = (_event, logEntry) => callback(logEntry);
    ipcRenderer.on("broadcast:log", subscription);
    return () => ipcRenderer.removeListener("broadcast:log", subscription);
  },
  onBroadcastProgress: (callback) => {
    const subscription = (_event, stats) => callback(stats);
    ipcRenderer.on("broadcast:progress", subscription);
    return () => ipcRenderer.removeListener("broadcast:progress", subscription);
  },
  onBroadcastCompleted: (callback) => {
    const subscription = (_event, stats) => callback(stats);
    ipcRenderer.on("broadcast:completed", subscription);
    return () => ipcRenderer.removeListener("broadcast:completed", subscription);
  },
  onRecipientUpdated: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on("broadcast:recipient_updated", subscription);
    return () => ipcRenderer.removeListener("broadcast:recipient_updated", subscription);
  },
  onMessageInbound: (callback) => {
    const subscription = (_event, message) => callback(message);
    ipcRenderer.on("message:inbound", subscription);
    return () => ipcRenderer.removeListener("message:inbound", subscription);
  },
  onStatusUpdated: (callback) => {
    const subscription = (_event, statusData) => callback(statusData);
    ipcRenderer.on("message:status_updated", subscription);
    return () => ipcRenderer.removeListener("message:status_updated", subscription);
  },
  onConversationsUpdated: (callback) => {
    const subscription = (_event, conversations) => callback(conversations);
    ipcRenderer.on("conversations:updated", subscription);
    return () => ipcRenderer.removeListener("conversations:updated", subscription);
  },
});
