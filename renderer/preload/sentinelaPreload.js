// renderer/preload/sentinelaPreload.js
const { contextBridge, ipcRenderer } = require("electron");

// ==========================================
// API do Sentinela para o renderer
// ==========================================
contextBridge.exposeInMainWorld("sentinelaAPI", {
  // Importar arquivo CSV
  importCSV: async (csvContent) => {
    try {
      return await ipcRenderer.invoke("sentinela-import-csv", csvContent);
    } catch (error) {
      console.error("[Sentinela] Erro ao importar CSV:", error);
      return { success: false, error: error.message };
    }
  },

  // Listar registros com filtros
  getAreaCodes: async (filters = {}) => {
    try {
      return await ipcRenderer.invoke("sentinela-get-area-codes", filters);
    } catch (error) {
      console.error("[Sentinela] Erro ao listar area_codes:", error);
      return { success: false, error: error.message, data: [], total: 0 };
    }
  },

  // Limpar todos os registros (com suporte a filtros)
  clearAreaCodes: async (filters = {}) => {
    try {
      return await ipcRenderer.invoke("sentinela-clear-area-codes", filters);
    } catch (error) {
      console.error("[Sentinela] Erro ao limpar area_codes:", error);
      return { success: false, error: error.message };
    }
  },

  // Obter estatísticas
  getImportStats: async () => {
    try {
      return await ipcRenderer.invoke("sentinela-get-import-stats");
    } catch (error) {
      console.error("[Sentinela] Erro ao obter stats:", error);
      return { success: false, error: error.message };
    }
  },

  // Criar evento no calendário
  createEvent: async (eventData) => {
    try {
      return await ipcRenderer.invoke("sentinela-create-event", eventData);
    } catch (error) {
      console.error("[Sentinela] Erro ao criar evento:", error);
      return { success: false, error: error.message };
    }
  },

  // Buscar eventos
  getEvents: async () => {
    try {
      return await ipcRenderer.invoke("sentinela-get-events");
    } catch (error) {
      console.error("[Sentinela] Erro ao buscar eventos:", error);
      return { success: false, error: error.message, data: [] };
    }
  },

  // Excluir evento
  deleteEvent: async (id) => {
    try {
      return await ipcRenderer.invoke("sentinela-delete-event", id);
    } catch (error) {
      console.error("[Sentinela] Erro ao excluir evento:", error);
      return { success: false, error: error.message };
    }
  },
});

// ==========================================
// API de leitura de arquivos (CSV)
// ==========================================
contextBridge.exposeInMainWorld("fileAPI", {
  readFile: async (file) => {
    try {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
          resolve({
            success: true,
            content: e.target.result,
            name: file.name,
            size: file.size,
            type: file.type,
          });
        };

        reader.onerror = (e) => {
          reject({
            success: false,
            error: "Erro ao ler arquivo",
          });
        };

        reader.readAsText(file);
      });
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      return { success: false, error: error.message };
    }
  },
});

// Debug helper
contextBridge.exposeInMainWorld("debugAPI", {
  log: (message) => console.log("[SentinelaPreload]", message),
  checkAPIs: () => {
    console.log("APIs disponíveis na janela do Sentinela:");
    console.log("- window.sentinelaAPI:", typeof window.sentinelaAPI);
    console.log("- window.fileAPI:", typeof window.fileAPI);
  },
});

console.log("👁️ SentinelaPreload carregado!");
