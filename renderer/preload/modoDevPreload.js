// renderer/preload/modoDevPreload.js
const { contextBridge, ipcRenderer } = require("electron");

// Expõe APIs específicas para o CRUD de modo dev
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

  // REMOVIDO: getDetailedStatus - não será mais usado
});
