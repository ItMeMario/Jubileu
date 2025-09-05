const { contextBridge, ipcRenderer } = require("electron");

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
