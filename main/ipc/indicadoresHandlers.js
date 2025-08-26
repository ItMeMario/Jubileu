const indicadoresController = require("../../controllers/indicadoresController");

class IndicadoresHandlers {
  constructor() {
    console.log("IndicadoresHandlers inicializado");
  }

  // Obter estatísticas completas
  async getStatistics() {
    try {
      console.log("Obtendo estatísticas completas...");
      return await indicadoresController.getStatistics();
    } catch (error) {
      console.error("Erro ao obter estatísticas:", error);
      return { success: false, error: error.message };
    }
  }

  // Obter estatísticas de horários
  async getHourlyStatistics() {
    try {
      console.log("Obtendo estatísticas de horários...");
      return await indicadoresController.getHourlyStatistics();
    } catch (error) {
      console.error("Erro ao obter estatísticas de horários:", error);
      return { success: false, error: error.message };
    }
  }

  // Obter estatísticas resumidas
  async getSummaryStatistics() {
    try {
      console.log("Obtendo estatísticas resumidas...");
      return await indicadoresController.getSummaryStatistics();
    } catch (error) {
      console.error("Erro ao obter estatísticas resumidas:", error);
      return { success: false, error: error.message };
    }
  }

  // Limpar estatísticas
  async clearStatistics() {
    try {
      console.log("Limpando estatísticas...");
      return await indicadoresController.clearStatistics();
    } catch (error) {
      console.error("Erro ao limpar estatísticas:", error);
      return { success: false, error: error.message };
    }
  }

  // Exportar para TXT
  async exportToTxt() {
    try {
      console.log("Exportando estatísticas para TXT...");
      return await indicadoresController.exportToTxt();
    } catch (error) {
      console.error("Erro ao exportar para TXT:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = IndicadoresHandlers;
