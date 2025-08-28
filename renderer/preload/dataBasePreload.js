// renderer/preload/dataBasePreload.js
const { contextBridge, ipcRenderer } = require("electron");

// ✅ APIs específicas do banco de dados
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
      if (!tableName) {
        throw new Error("Nome da tabela é obrigatório");
      }
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

// ✅ Utilitários para debug e helpers
contextBridge.exposeInMainWorld("databaseUtils", {
  // Helper para logs
  log: (message, ...args) => {
    console.log("[DatabasePreload]", message, ...args);
  },

  // Helper para formatação de dados
  formatBytes: (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  },

  // Helper para formatação de números
  formatNumber: (num) => {
    return new Intl.NumberFormat("pt-BR").format(num);
  },

  // Helper para formatação de datas
  formatDate: (dateString) => {
    try {
      return new Date(dateString).toLocaleString("pt-BR");
    } catch (error) {
      return dateString;
    }
  },

  // Verificar se API está funcionando
  checkAPI: () => {
    console.log("🗄️ DatabaseAPI disponível:", typeof window.databaseAPI);
    if (window.databaseAPI) {
      console.log("🔧 Métodos disponíveis:", Object.keys(window.databaseAPI));
    }
    if (window.databaseUtils) {
      console.log("🛠️ Utils disponíveis:", Object.keys(window.databaseUtils));
    }
  },

  // Validar nome de tabela
  isValidTableName: (tableName) => {
    if (!tableName || typeof tableName !== "string") return false;
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName);
  },
});
