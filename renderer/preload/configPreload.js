// renderer/configPreload.js
const { contextBridge, ipcRenderer } = require("electron");

// ✅ ADICIONADO: APIs de cidade
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

// ✅ ADICIONADO: APIs de indicadores
contextBridge.exposeInMainWorld("indicadoresAPI", {
  // Obter estatísticas completas
  getStatistics: async () => {
    try {
      return await ipcRenderer.invoke("indicadores-get-statistics");
    } catch (error) {
      console.error("Erro ao obter estatísticas:", error);
      return { success: false, error: error.message };
    }
  },

  // Obter estatísticas de horários
  getHourlyStatistics: async () => {
    try {
      return await ipcRenderer.invoke("indicadores-get-hourly-statistics");
    } catch (error) {
      console.error("Erro ao obter estatísticas de horários:", error);
      return { success: false, error: error.message };
    }
  },

  // Obter estatísticas resumidas
  getSummaryStatistics: async () => {
    try {
      return await ipcRenderer.invoke("indicadores-get-summary-statistics");
    } catch (error) {
      console.error("Erro ao obter estatísticas resumidas:", error);
      return { success: false, error: error.message };
    }
  },

  // Limpar estatísticas
  clearStatistics: async () => {
    try {
      return await ipcRenderer.invoke("indicadores-clear-statistics");
    } catch (error) {
      console.error("Erro ao limpar estatísticas:", error);
      return { success: false, error: error.message };
    }
  },

  // Exportar para TXT
  exportToTxt: async () => {
    try {
      return await ipcRenderer.invoke("indicadores-export-to-txt");
    } catch (error) {
      console.error("Erro ao exportar para TXT:", error);
      return { success: false, error: error.message };
    }
  },
});

// ✅ ATUALIZADO: APIs de modo dev - COM LOCALE
contextBridge.exposeInMainWorld("modoDevAPI", {
  // Toggle modes
  toggleDevMode: async () => {
    try {
      return await ipcRenderer.invoke("modo-dev-toggle-dev-mode");
    } catch (error) {
      console.error("Erro ao alternar modo dev:", error);
      return { success: false, error: error.message };
    }
  },

  toggleDebugMode: async () => {
    try {
      return await ipcRenderer.invoke("modo-dev-toggle-debug-mode");
    } catch (error) {
      console.error("Erro ao alternar modo debug:", error);
      return { success: false, error: error.message };
    }
  },

  toggleGroupMode: async () => {
    try {
      return await ipcRenderer.invoke("modo-dev-toggle-group-mode");
    } catch (error) {
      console.error("Erro ao alternar modo de grupo:", error);
      return { success: false, error: error.message };
    }
  },

  // Scout configuration
  setScoutTime: async (timeInput) => {
    try {
      return await ipcRenderer.invoke("modo-dev-set-scout-time", timeInput);
    } catch (error) {
      console.error("Erro ao configurar scout:", error);
      return { success: false, error: error.message };
    }
  },

  getScoutConfig: async () => {
    try {
      return await ipcRenderer.invoke("modo-dev-get-scout-config");
    } catch (error) {
      console.error("Erro ao obter config do scout:", error);
      return { success: false, error: error.message };
    }
  },

  // Status information
  getCurrentMode: async () => {
    try {
      return await ipcRenderer.invoke("modo-dev-get-current-mode");
    } catch (error) {
      console.error("Erro ao obter modo atual:", error);
      return { success: false, error: error.message };
    }
  },

  getDetailedStatus: async () => {
    try {
      return await ipcRenderer.invoke("modo-dev-get-detailed-status");
    } catch (error) {
      console.error("Erro ao obter status detalhado:", error);
      return { success: false, error: error.message };
    }
  },

  // ========== NOVAS APIs PARA LOCALE ==========

  // Obter locale atual
  getCurrentLocale: async () => {
    try {
      return await ipcRenderer.invoke("modo-dev-get-current-locale");
    } catch (error) {
      console.error("Erro ao obter locale atual:", error);
      return { success: false, error: error.message };
    }
  },

  // Obter locales disponíveis
  getAvailableLocales: async () => {
    try {
      return await ipcRenderer.invoke("modo-dev-get-available-locales");
    } catch (error) {
      console.error("Erro ao obter locales disponíveis:", error);
      return { success: false, error: error.message };
    }
  },

  // Alterar locale
  setLocale: async (selectedIndex) => {
    try {
      return await ipcRenderer.invoke("modo-dev-set-locale", selectedIndex);
    } catch (error) {
      console.error("Erro ao alterar locale:", error);
      return { success: false, error: error.message };
    }
  },
});

// ✅ NOVO: APIs de banco de dados
contextBridge.exposeInMainWorld("databaseAPI", {
  // Obter todas as tabelas do banco
  getAllTables: async () => {
    try {
      return await ipcRenderer.invoke("database-get-all-tables");
    } catch (error) {
      console.error("Erro ao obter tabelas:", error);
      return { success: false, error: error.message };
    }
  },

  // Obter informações de uma tabela específica
  getTableInfo: async (tableName) => {
    try {
      return await ipcRenderer.invoke("database-get-table-info", tableName);
    } catch (error) {
      console.error("Erro ao obter informações da tabela:", error);
      return { success: false, error: error.message };
    }
  },

  // Obter contagem de registros de todas as tabelas
  getTableCounts: async () => {
    try {
      return await ipcRenderer.invoke("database-get-table-counts");
    } catch (error) {
      console.error("Erro ao obter contagens:", error);
      return { success: false, error: error.message };
    }
  },

  // Obter informações gerais do banco
  getDatabaseInfo: async () => {
    try {
      return await ipcRenderer.invoke("database-get-database-info");
    } catch (error) {
      console.error("Erro ao obter informações do banco:", error);
      return { success: false, error: error.message };
    }
  },

  // Obter cidade primária
  getPrimaryCity: async () => {
    try {
      return await ipcRenderer.invoke("database-get-primary-city");
    } catch (error) {
      console.error("Erro ao obter cidade primária:", error);
      return { success: false, error: error.message };
    }
  },

  // Obter visão geral do banco (combinando várias informações)
  getDatabaseOverview: async () => {
    try {
      return await ipcRenderer.invoke("database-get-overview");
    } catch (error) {
      console.error("Erro ao obter visão geral:", error);
      return { success: false, error: error.message };
    }
  },
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

// ✅ MANTIDO: APIs de mensagem existentes + NOVA FUNÇÃO ADICIONADA
contextBridge.exposeInMainWorld("messageAPI", {
  // Operações CRUD de mensagens
  getMessages: () => ipcRenderer.invoke("message-get-messages"),
  addMessage: (messageData) =>
    ipcRenderer.invoke("message-add-message", messageData),
  updateMessage: (id, messageData) =>
    ipcRenderer.invoke("message-update-message", id, messageData),
  deleteMessage: (id) => ipcRenderer.invoke("message-delete-message", id),
  getLastMessage: () => ipcRenderer.invoke("message-get-last-message"),

  // ✅ MOVIDO DO preload.js: Verificação de completude de mensagens
  checkMessageCompleteness: (specificLocale) =>
    ipcRenderer.invoke("message-check-completeness", specificLocale),

  // Opções específicas para mensagens
  getMessageTypes: () => ipcRenderer.invoke("message-get-types"),
  getMessageLocales: () => ipcRenderer.invoke("message-get-locales"),
  getAvailableOptions: () =>
    ipcRenderer.invoke("message-get-available-options"),
});

// ✅ ATUALIZADO: Debug helper para verificar se está funcionando
contextBridge.exposeInMainWorld("debugAPI", {
  log: (message) => console.log("[ConfigPreload]", message),
  checkAPIs: () => {
    console.log("🔋 APIs disponíveis na janela de configurações:");
    console.log("- window.cityAPI:", typeof window.cityAPI);
    console.log("- window.configAPI:", typeof window.configAPI);
    console.log("- window.messageAPI:", typeof window.messageAPI);
    console.log("- window.indicadoresAPI:", typeof window.indicadoresAPI);
    console.log("- window.modoDevAPI:", typeof window.modoDevAPI);
    console.log("- window.databaseAPI:", typeof window.databaseAPI);

    if (window.cityAPI) {
      console.log("🏙️ Métodos cityAPI:", Object.keys(window.cityAPI));
    }
    if (window.indicadoresAPI) {
      console.log(
        "📊 Métodos indicadoresAPI:",
        Object.keys(window.indicadoresAPI)
      );
    }
    if (window.modoDevAPI) {
      console.log("🔧 Métodos modoDevAPI:", Object.keys(window.modoDevAPI));
    }
    if (window.databaseAPI) {
      console.log("🗄️ Métodos databaseAPI:", Object.keys(window.databaseAPI));
    }
    if (window.messageAPI) {
      console.log("💬 Métodos messageAPI:", Object.keys(window.messageAPI));
    }
  },
});
