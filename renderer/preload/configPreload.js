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

// ✅ NOVO: APIs de modo dev
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

// ✅ ATUALIZADO: Debug helper para verificar se está funcionando
contextBridge.exposeInMainWorld("debugAPI", {
  log: (message) => console.log("[ConfigPreload]", message),
  checkAPIs: () => {
    console.log("📋 APIs disponíveis na janela de configurações:");
    console.log("- window.cityAPI:", typeof window.cityAPI);
    console.log("- window.configAPI:", typeof window.configAPI);
    console.log("- window.messageAPI:", typeof window.messageAPI);
    console.log("- window.indicadoresAPI:", typeof window.indicadoresAPI);
    console.log("- window.modoDevAPI:", typeof window.modoDevAPI); // ADICIONADO

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
      console.log("🔧 Métodos modoDevAPI:", Object.keys(window.modoDevAPI)); // ADICIONADO
    }
  },
});
