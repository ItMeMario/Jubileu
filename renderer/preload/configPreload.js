// renderer/configPreload.js
const { contextBridge, ipcRenderer } = require("electron");

/**
 * Função auxiliar para criar handlers de API com tratamento de erro consistente
 * @param {string} channel - Nome do canal IPC
 * @param {string} errorPrefix - Prefixo da mensagem de erro
 */
const createIPCHandler = (channel, errorPrefix) => {
  return async (...args) => {
    try {
      return await ipcRenderer.invoke(channel, ...args);
    } catch (error) {
      console.error(`${errorPrefix}:`, error);
      return { success: false, error: error.message };
    }
  };
};

// ========================================
// API de Cidades
// ========================================
contextBridge.exposeInMainWorld("cityAPI", {
  getCities: () => ipcRenderer.invoke("city-get-cities"),
  addCity: (cityData) => ipcRenderer.invoke("city-add-city", cityData),
  updateCity: (id, cityData) =>
    ipcRenderer.invoke("city-update-city", id, cityData),
  deleteCity: (id) => ipcRenderer.invoke("city-delete-city", id),
  setPrimaryCity: (id) => ipcRenderer.invoke("city-set-primary", id),
  getPrimaryCity: () => ipcRenderer.invoke("city-get-primary"),
  getCityById: (id) => ipcRenderer.invoke("city-get-by-id", id),
});

// ========================================
// API de Indicadores
// ========================================
contextBridge.exposeInMainWorld("indicadoresAPI", {
  getStatistics: createIPCHandler(
    "indicadores-get-statistics",
    "Erro ao obter estatísticas"
  ),
  getHourlyStatistics: createIPCHandler(
    "indicadores-get-hourly-statistics",
    "Erro ao obter estatísticas de horários"
  ),
  getSummaryStatistics: createIPCHandler(
    "indicadores-get-summary-statistics",
    "Erro ao obter estatísticas resumidas"
  ),
  clearStatistics: createIPCHandler(
    "indicadores-clear-statistics",
    "Erro ao limpar estatísticas"
  ),
  exportToTxt: createIPCHandler(
    "indicadores-export-to-txt",
    "Erro ao exportar para TXT"
  ),
});

// ========================================
// API de Modo Dev
// ========================================
contextBridge.exposeInMainWorld("modoDevAPI", {
  // Toggle modes
  toggleDevMode: createIPCHandler(
    "modo-dev-toggle-dev-mode",
    "Erro ao alternar modo dev"
  ),
  toggleDebugMode: createIPCHandler(
    "modo-dev-toggle-debug-mode",
    "Erro ao alternar modo debug"
  ),
  toggleGroupMode: createIPCHandler(
    "modo-dev-toggle-group-mode",
    "Erro ao alternar modo de grupo"
  ),

  // Scout configuration
  setScoutTime: createIPCHandler(
    "modo-dev-set-scout-time",
    "Erro ao configurar scout"
  ),
  getScoutConfig: createIPCHandler(
    "modo-dev-get-scout-config",
    "Erro ao obter config do scout"
  ),

  // Status information
  getCurrentMode: createIPCHandler(
    "modo-dev-get-current-mode",
    "Erro ao obter modo atual"
  ),
  getDetailedStatus: createIPCHandler(
    "modo-dev-get-detailed-status",
    "Erro ao obter status detalhado"
  ),

  // Locale configuration
  getCurrentLocale: createIPCHandler(
    "modo-dev-get-current-locale",
    "Erro ao obter locale atual"
  ),
  getAvailableLocales: createIPCHandler(
    "modo-dev-get-available-locales",
    "Erro ao obter locales disponíveis"
  ),
  setLocale: createIPCHandler("modo-dev-set-locale", "Erro ao alterar locale"),
});

// ========================================
// API de Banco de Dados
// ========================================
contextBridge.exposeInMainWorld("databaseAPI", {
  getAllTables: createIPCHandler(
    "database-get-all-tables",
    "Erro ao obter tabelas"
  ),
  getTableInfo: createIPCHandler(
    "database-get-table-info",
    "Erro ao obter informações da tabela"
  ),
  getTableCounts: createIPCHandler(
    "database-get-table-counts",
    "Erro ao obter contagens"
  ),
  getDatabaseInfo: createIPCHandler(
    "database-get-database-info",
    "Erro ao obter informações do banco"
  ),
  getPrimaryCity: createIPCHandler(
    "database-get-primary-city",
    "Erro ao obter cidade primária"
  ),
  getDatabaseOverview: createIPCHandler(
    "database-get-overview",
    "Erro ao obter visão geral"
  ),
});

// ========================================
// API de Configuração
// ========================================
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

  // Importação/Exportação
  exportSettings: () => ipcRenderer.invoke("config-export-settings"),
  importSettings: (settingsData) =>
    ipcRenderer.invoke("config-import-settings", settingsData),
});

// ========================================
// API de Mensagens (UNIFICADA)
// ========================================
contextBridge.exposeInMainWorld("messageAPI", {
  // Operações CRUD básicas
  getMessages: () => ipcRenderer.invoke("message-get-messages"),
  addMessage: (messageData) =>
    ipcRenderer.invoke("message-add-message", messageData),
  updateMessage: (id, messageData) =>
    ipcRenderer.invoke("message-update-message", id, messageData),
  deleteMessage: (id) => ipcRenderer.invoke("message-delete-message", id),
  getLastMessage: () => ipcRenderer.invoke("message-get-last-message"),

  // Verificação de completude
  checkMessageCompleteness: (specificLocale = null) =>
    ipcRenderer.invoke("message-check-completeness", specificLocale),

  // Opções específicas para mensagens
  getMessageTypes: () => ipcRenderer.invoke("message-get-types"),
  getMessageLocales: () => ipcRenderer.invoke("message-get-locales"),
  getAvailableOptions: () =>
    ipcRenderer.invoke("message-get-available-options"),

  // APIs para áudio
  addMessageWithAudio: (messageData, audioFileData) =>
    ipcRenderer.invoke(
      "message-add-message-with-audio",
      messageData,
      audioFileData
    ),
  updateMessageWithAudio: (id, messageData, audioFileData) =>
    ipcRenderer.invoke(
      "message-update-message-with-audio",
      id,
      messageData,
      audioFileData
    ),
  getExistingAudioFiles: () => ipcRenderer.invoke("message-get-audio-files"),
  validateAudioFile: (filename) =>
    ipcRenderer.invoke("message-validate-audio-file", filename),
});

// ========================================
// API de Debug
// ========================================
contextBridge.exposeInMainWorld("debugAPI", {
  log: (message) => console.log("[ConfigPreload]", message),
  checkAPIs: () => {
    const apis = {
      cityAPI: window.cityAPI,
      configAPI: window.configAPI,
      messageAPI: window.messageAPI,
      indicadoresAPI: window.indicadoresAPI,
      modoDevAPI: window.modoDevAPI,
      databaseAPI: window.databaseAPI,
    };

    console.log("📋 APIs disponíveis na janela de configurações:");
    Object.entries(apis).forEach(([name, api]) => {
      console.log(`- window.${name}:`, typeof api);
      if (api) {
        console.log(`  Métodos:`, Object.keys(api));
      }
    });
  },
});
