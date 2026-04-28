const indicadoresControllerGui = require("../../controllers/indicadoresControllerGui");

class IndicadoresHandlers {
  constructor() {
    console.log("IndicadoresHandlers inicializado");
  }

  register(ipcMain) {
    ipcMain.handle("indicadores-get-statistics", this.getStatistics.bind(this));
    ipcMain.handle("indicadores-get-hourly-statistics", this.getHourlyStatistics.bind(this));
    ipcMain.handle("indicadores-get-summary-statistics", this.getSummaryStatistics.bind(this));
    ipcMain.handle("indicadores-clear-statistics", this.clearStatistics.bind(this));
    ipcMain.handle("indicadores-export-to-txt", this.exportToTxt.bind(this));
  }

  unregister(ipcMain) {
    ipcMain.removeHandler("indicadores-get-statistics");
    ipcMain.removeHandler("indicadores-get-hourly-statistics");
    ipcMain.removeHandler("indicadores-get-summary-statistics");
    ipcMain.removeHandler("indicadores-clear-statistics");
    ipcMain.removeHandler("indicadores-export-to-txt");
  }

  // Obter estatísticas completas
  async getStatistics() {
    try {
      console.log("Obtendo estatísticas completas...");
      return await indicadoresControllerGui.getStatistics();
    } catch (error) {
      console.error("Erro ao obter estatísticas:", error);
      return { success: false, error: error.message };
    }
  }

  // Obter estatísticas de horários
  async getHourlyStatistics() {
    try {
      console.log("Obtendo estatísticas de horários...");
      return await indicadoresControllerGui.getHourlyStatistics();
    } catch (error) {
      console.error("Erro ao obter estatísticas de horários:", error);
      return { success: false, error: error.message };
    }
  }

  // Obter estatísticas resumidas
  async getSummaryStatistics() {
    try {
      console.log("Obtendo estatísticas resumidas...");
      return await indicadoresControllerGui.getSummaryStatistics();
    } catch (error) {
      console.error("Erro ao obter estatísticas resumidas:", error);
      return { success: false, error: error.message };
    }
  }

  // Limpar estatísticas
  async clearStatistics() {
    try {
      console.log("Limpando estatísticas...");
      return await indicadoresControllerGui.clearStatistics();
    } catch (error) {
      console.error("Erro ao limpar estatísticas:", error);
      return { success: false, error: error.message };
    }
  }

  // Exportar para TXT
  async exportToTxt() {
    try {
      console.log("Exportando estatísticas para TXT...");
      return await indicadoresControllerGui.exportToTxt();
    } catch (error) {
      console.error("Erro ao exportar para TXT:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = IndicadoresHandlers;
