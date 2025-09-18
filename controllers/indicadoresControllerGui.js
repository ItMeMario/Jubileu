const indicadoresService = require("../services/indicadoresService");

// ===============================
// MÉTODOS PARA GUI
// ===============================

async function getStatistics() {
  try {
    const stats = await indicadoresService.getStatistics();
    return { success: true, data: stats };
  } catch (error) {
    console.error("Erro ao obter estatísticas:", error);
    return { success: false, error: error.message };
  }
}

async function getHourlyStatistics() {
  try {
    const hourlyStats = await indicadoresService.getHourlyStatistics();
    return { success: true, data: hourlyStats };
  } catch (error) {
    console.error("Erro ao obter estatísticas de horários:", error);
    return { success: false, error: error.message };
  }
}

async function getSummaryStatistics() {
  try {
    const summaryStats = await indicadoresService.getSummaryStatistics();
    return { success: true, data: summaryStats };
  } catch (error) {
    console.error("Erro ao obter estatísticas resumidas:", error);
    return { success: false, error: error.message };
  }
}

async function clearStatistics() {
  try {
    const clearedStats = await indicadoresService.clearStatistics();
    return {
      success: true,
      data: clearedStats,
      message: "Estatísticas limpas com sucesso!",
    };
  } catch (error) {
    console.error("Erro ao limpar estatísticas:", error);
    return { success: false, error: error.message };
  }
}

async function exportToTxt() {
  try {
    const filePath = await indicadoresService.exportToTxt();
    return {
      success: true,
      data: { filePath },
      message: `Arquivo exportado com sucesso para: ${filePath}`,
    };
  } catch (error) {
    console.error("Erro ao exportar para TXT:", error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  getStatistics,
  getHourlyStatistics,
  getSummaryStatistics,
  clearStatistics,
  exportToTxt,
};
