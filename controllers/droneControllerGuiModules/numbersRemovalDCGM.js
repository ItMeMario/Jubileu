// controllers/droneControllerGuiModules/numbersRemovalDCGM.js
const droneService = require("../../services/droneService");

class NumbersRemovalDCGM {
  constructor() {
    console.log("NumbersRemovalDCGM inicializado");
  }

  /**
   * Remove um número específico da lista
   * @param {number|string} identificador - ID do número ou índice da lista
   * @returns {Promise<Object>} - Resultado da remoção
   */
  async removerNumero(identificador) {
    try {
      console.log(`Removendo número: ${identificador}`);

      const resultado = await droneService.removerNumero(identificador);

      if (resultado.success) {
        return {
          success: true,
          message: "Número removido com sucesso",
          totalRestante: resultado.totalNumbers,
        };
      } else {
        return {
          success: false,
          error: resultado.error,
        };
      }
    } catch (error) {
      console.error("Erro ao remover número:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Limpa toda a lista de números
   * @returns {Promise<Object>} - Resultado da operação
   */
  async limparListaCompleta() {
    try {
      console.log("Limpando lista completa de números...");
      const resultado = await droneService.limparListaNumeros();

      if (resultado.success) {
        return {
          success: true,
          message: resultado.message,
          totalRemovidos: resultado.totalRemoved,
        };
      } else {
        return {
          success: false,
          error: resultado.error,
        };
      }
    } catch (error) {
      console.error("Erro ao limpar lista:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Limpa apenas números com status 'sent'
   * @returns {Promise<Object>} - Resultado da operação
   */
  async limparEnviados() {
    try {
      console.log("Limpando números enviados...");
      const resultado = await droneService.limparClientesPorStatus("sent");

      if (resultado.success) {
        return {
          success: true,
          message: `${resultado.totalRemoved} número(s) enviado(s) removido(s)`,
          totalRemovidos: resultado.totalRemoved,
        };
      } else {
        return {
          success: false,
          error: resultado.error,
        };
      }
    } catch (error) {
      console.error("Erro ao limpar enviados:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Limpa apenas números com status 'failed'
   * @returns {Promise<Object>} - Resultado da operação
   */
  async limparFalhas() {
    try {
      console.log("Limpando números com falha...");
      const resultado = await droneService.limparClientesPorStatus("failed");

      if (resultado.success) {
        return {
          success: true,
          message: `${resultado.totalRemoved} número(s) com falha removido(s)`,
          totalRemovidos: resultado.totalRemoved,
        };
      } else {
        return {
          success: false,
          error: resultado.error,
        };
      }
    } catch (error) {
      console.error("Erro ao limpar falhas:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new NumbersRemovalDCGM();
