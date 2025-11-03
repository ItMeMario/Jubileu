// controllers/droneControllerGuiModules/statisticsDCGM.js
const droneService = require("../../services/droneService");

class StatisticsDCGM {
  constructor() {
    console.log("StatisticsDCGM inicializado");
  }

  /**
   * Obtém estatísticas dos números cadastrados
   * @returns {Promise<Object>} - Estatísticas formatadas
   */
  async obterEstatisticasNumeros() {
    try {
      console.log("Obtendo estatísticas dos números...");
      const resultado = await droneService.obterEstatisticas();

      if (!resultado.success) {
        return {
          success: false,
          error: resultado.error,
        };
      }

      const stats = resultado.stats;

      // Calcula percentuais
      const total = stats.total;
      const pending = stats.porStatus?.pending || 0;
      const sent = stats.porStatus?.sent || 0;
      const failed = stats.porStatus?.failed || 0;

      return {
        success: true,
        estatisticas: {
          total: total,
          porStatus: {
            pending: pending,
            sent: sent,
            failed: failed,
          },
          percentuais: {
            pending: total > 0 ? ((pending / total) * 100).toFixed(1) : 0,
            sent: total > 0 ? ((sent / total) * 100).toFixed(1) : 0,
            failed: total > 0 ? ((failed / total) * 100).toFixed(1) : 0,
          },
          comNomePersonalizado: stats.comNomePersonalizado || 0,
          semNomePersonalizado: stats.semNomePersonalizado || 0,
          percentualComNome:
            total > 0
              ? ((stats.comNomePersonalizado / total) * 100).toFixed(1)
              : 0,
          // Status formatados para exibição
          statusFormatados: {
            pending: {
              quantidade: pending,
              texto: "Pendente",
              icon: "⏳",
              class: "status-pending",
            },
            sent: {
              quantidade: sent,
              texto: "Enviado",
              icon: "✅",
              class: "status-sent",
            },
            failed: {
              quantidade: failed,
              texto: "Falhou",
              icon: "❌",
              class: "status-failed",
            },
          },
        },
      };
    } catch (error) {
      console.error("Erro ao obter estatísticas:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Gera relatório de números com nomes personalizados
   * @returns {Promise<Object>} - Relatório formatado
   */
  async gerarRelatorioNomes() {
    try {
      const lista = await droneService.listarNumeros();

      if (!lista.success) {
        return {
          success: false,
          error: lista.error,
        };
      }

      const comNome = lista.numbers.filter((n) => n.customName);
      const semNome = lista.numbers.filter((n) => !n.customName);

      return {
        success: true,
        total: lista.numbers.length,
        comNome: {
          quantidade: comNome.length,
          lista: comNome.map((n) => ({
            numero: n.whatsappFormat,
            nome: n.customName,
          })),
        },
        semNome: {
          quantidade: semNome.length,
          lista: semNome.map((n) => ({
            numero: n.whatsappFormat,
          })),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new StatisticsDCGM();
