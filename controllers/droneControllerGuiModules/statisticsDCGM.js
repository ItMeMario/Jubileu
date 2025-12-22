// controllers/droneControllerGuiModules/statisticsDCGM.js
const droneService = require("../../services/droneService");

class StatisticsDCGM {
  constructor() {
    console.log("StatisticsDCGM inicializado");
  }

  /**
   * Obtém estatísticas dos números cadastrados de uma instância
   * @param {string} instanceId - ID da instância
   * @returns {Promise<Object>} - Estatísticas formatadas
   */
  async obterEstatisticasNumeros(instanceId) {
    try {
      // Valida instanceId
      if (!instanceId) {
        return {
          success: false,
          error:
            "Nenhuma instância selecionada. Selecione uma instância para ver as estatísticas.",
        };
      }

      console.log(`[${instanceId}] Obtendo estatísticas dos números...`);

      const resultado = await droneService.obterEstatisticas(instanceId);

      if (!resultado.success) {
        return {
          success: false,
          error: resultado.error,
          instanceId: instanceId,
        };
      }

      const stats = resultado.stats;

      // Valores
      const total = stats.total || 0;
      const pending = stats.porStatus?.pending || 0;
      const sent = stats.porStatus?.sent || 0;
      const failed = stats.porStatus?.failed || 0;

      // Percentuais (já vem calculado do service, mas recalcula para garantir)
      const percentuais = stats.percentuais || {
        pending: total > 0 ? ((pending / total) * 100).toFixed(1) : 0,
        sent: total > 0 ? ((sent / total) * 100).toFixed(1) : 0,
        failed: total > 0 ? ((failed / total) * 100).toFixed(1) : 0,
      };

      return {
        success: true,
        estatisticas: {
          total: total,
          porStatus: {
            pending: pending,
            sent: sent,
            failed: failed,
          },
          percentuais: percentuais,
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
        instanceId: instanceId,
      };
    } catch (error) {
      console.error(`[${instanceId}] Erro ao obter estatísticas:`, error);
      return {
        success: false,
        error: error.message,
        instanceId: instanceId,
      };
    }
  }

  /**
   * Gera relatório de números com nomes personalizados de uma instância
   * @param {string} instanceId - ID da instância
   * @returns {Promise<Object>} - Relatório formatado
   */
  async gerarRelatorioNomes(instanceId) {
    try {
      // Valida instanceId
      if (!instanceId) {
        return {
          success: false,
          error:
            "Nenhuma instância selecionada. Selecione uma instância para gerar o relatório.",
        };
      }

      console.log(`[${instanceId}] Gerando relatório de nomes...`);

      const lista = await droneService.listarNumeros(instanceId, null);

      if (!lista.success) {
        return {
          success: false,
          error: lista.error,
          instanceId: instanceId,
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
        instanceId: instanceId,
      };
    } catch (error) {
      console.error(`[${instanceId}] Erro ao gerar relatório:`, error);
      return {
        success: false,
        error: error.message,
        instanceId: instanceId,
      };
    }
  }
}

module.exports = new StatisticsDCGM();
