// controllers/droneControllerGuiModules/numbersRemovalDCGM.js
const droneService = require("../../services/droneService");

class NumbersRemovalDCGM {
  constructor() {
    console.log("NumbersRemovalDCGM inicializado");
  }

  /**
   * Remove um número específico da lista de uma instância
   * @param {string} instanceId - ID da instância
   * @param {number|string} identificador - ID do número ou índice da lista
   * @returns {Promise<Object>} - Resultado da remoção
   */
  async removerNumero(instanceId, identificador) {
    try {
      // Valida instanceId
      if (!instanceId) {
        return {
          success: false,
          error:
            "Nenhuma instância selecionada. Selecione uma instância antes de remover.",
        };
      }

      console.log(`[${instanceId}] Removendo número: ${identificador}`);

      const resultado = await droneService.removerNumero(
        instanceId,
        identificador
      );

      if (resultado.success) {
        return {
          success: true,
          message: "Número removido com sucesso",
          totalRestante: resultado.totalNumbers,
          instanceId: instanceId,
        };
      } else {
        return {
          success: false,
          error: resultado.error,
          instanceId: instanceId,
        };
      }
    } catch (error) {
      console.error(`[${instanceId}] Erro ao remover número:`, error);
      return {
        success: false,
        error: error.message,
        instanceId: instanceId,
      };
    }
  }

  /**
   * Limpa toda a lista de números de uma instância
   * @param {string} instanceId - ID da instância
   * @returns {Promise<Object>} - Resultado da operação
   */
  async limparListaCompleta(instanceId) {
    try {
      // Valida instanceId
      if (!instanceId) {
        return {
          success: false,
          error:
            "Nenhuma instância selecionada. Selecione uma instância antes de limpar.",
        };
      }

      console.log(`[${instanceId}] Limpando lista completa de números...`);

      const resultado = await droneService.limparListaNumeros(instanceId);

      if (resultado.success) {
        return {
          success: true,
          message: resultado.message,
          totalRemovidos: resultado.totalRemoved,
          instanceId: instanceId,
        };
      } else {
        return {
          success: false,
          error: resultado.error,
          instanceId: instanceId,
        };
      }
    } catch (error) {
      console.error(`[${instanceId}] Erro ao limpar lista:`, error);
      return {
        success: false,
        error: error.message,
        instanceId: instanceId,
      };
    }
  }

  /**
   * Limpa apenas números com status 'sent' de uma instância
   * @param {string} instanceId - ID da instância
   * @returns {Promise<Object>} - Resultado da operação
   */
  async limparEnviados(instanceId) {
    try {
      // Valida instanceId
      if (!instanceId) {
        return {
          success: false,
          error:
            "Nenhuma instância selecionada. Selecione uma instância antes de limpar.",
        };
      }

      console.log(`[${instanceId}] Limpando números enviados...`);

      const resultado = await droneService.limparNumerosPorStatus(
        instanceId,
        "sent"
      );

      if (resultado.success) {
        return {
          success: true,
          message: `${resultado.totalRemoved} número(s) enviado(s) removido(s)`,
          totalRemovidos: resultado.totalRemoved,
          instanceId: instanceId,
        };
      } else {
        return {
          success: false,
          error: resultado.error,
          instanceId: instanceId,
        };
      }
    } catch (error) {
      console.error(`[${instanceId}] Erro ao limpar enviados:`, error);
      return {
        success: false,
        error: error.message,
        instanceId: instanceId,
      };
    }
  }

  /**
   * Limpa apenas números com status 'failed' de uma instância
   * @param {string} instanceId - ID da instância
   * @returns {Promise<Object>} - Resultado da operação
   */
  async limparFalhas(instanceId) {
    try {
      // Valida instanceId
      if (!instanceId) {
        return {
          success: false,
          error:
            "Nenhuma instância selecionada. Selecione uma instância antes de limpar.",
        };
      }

      console.log(`[${instanceId}] Limpando números com falha...`);

      const resultado = await droneService.limparNumerosPorStatus(
        instanceId,
        "failed"
      );

      if (resultado.success) {
        return {
          success: true,
          message: `${resultado.totalRemoved} número(s) com falha removido(s)`,
          totalRemovidos: resultado.totalRemoved,
          instanceId: instanceId,
        };
      } else {
        return {
          success: false,
          error: resultado.error,
          instanceId: instanceId,
        };
      }
    } catch (error) {
      console.error(`[${instanceId}] Erro ao limpar falhas:`, error);
      return {
        success: false,
        error: error.message,
        instanceId: instanceId,
      };
    }
  }
}

module.exports = new NumbersRemovalDCGM();
