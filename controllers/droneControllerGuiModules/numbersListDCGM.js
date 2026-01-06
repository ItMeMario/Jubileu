// controllers/droneControllerGuiModules/numbersListDCGM.js
const droneService = require("../../services/droneService");
const statusFormatHelpers = require("./statusFormatHelpersDCGM");

class NumbersListDCGM {
  constructor() {
    console.log("NumbersListDCGM inicializado");
  }

  /**
   * Lista os números atualmente no banco de uma instância
   * @param {string} instanceId - ID da instância
   * @param {string} filtroStatus - Status para filtrar (pending/sent/failed/all)
   * @returns {Promise<Object>} - Lista formatada
   */
  async listarNumerosAtuais(instanceId, filtroStatus = "all") {
    try {
      // Valida instanceId
      if (!instanceId) {
        return {
          success: false,
          error:
            "Nenhuma instância selecionada. Selecione uma instância para ver os números.",
          numeros: [],
          total: 0,
        };
      }

      console.log(
        `[${instanceId}] Listando números com filtro: ${filtroStatus}`
      );

      // Passa instanceId e filtro para o service
      // Se filtroStatus é 'all', passa null para buscar todos
      const statusParaBusca = filtroStatus === "all" ? null : filtroStatus;
      const resultado = await droneService.listarNumeros(
        instanceId,
        statusParaBusca
      );

      if (!resultado.success) {
        return {
          success: false,
          error: resultado.error,
          numeros: [],
          total: 0,
          instanceId: instanceId,
        };
      }

      if (resultado.numbers.length === 0) {
        return {
          success: true,
          numeros: [],
          total: 0,
          totalGeral: 0,
          filtroAplicado: filtroStatus,
          instanceId: instanceId,
        };
      }

      // Formata números para exibição na GUI
      const numerosFormatados = resultado.numbers.map((num, index) => ({
        indice: index + 1,
        id: num.id,
        numeroOriginal: num.originalNumber,
        numeroWhatsapp: num.whatsappFormat,
        nome: num.customName || "-",
        temNomePersonalizado: !!num.customName,
        status: num.status || "pending",
        statusTexto: statusFormatHelpers.getStatusTexto(num.status),
        statusIcon: statusFormatHelpers.getStatusIcon(num.status),
        statusClass: statusFormatHelpers.getStatusClass(num.status),
        createdAt: num.createdAt,
        updatedAt: num.updatedAt,
      }));

      // Se filtrou, busca o total geral para referência
      let totalGeral = resultado.total;
      if (statusParaBusca !== null) {
        const resultadoGeral = await droneService.listarNumeros(
          instanceId,
          null
        );
        totalGeral = resultadoGeral.success
          ? resultadoGeral.total
          : resultado.total;
      }

      return {
        success: true,
        numeros: numerosFormatados,
        total: numerosFormatados.length,
        totalGeral: totalGeral,
        filtroAplicado: filtroStatus,
        instanceId: instanceId,
      };
    } catch (error) {
      console.error(`[${instanceId}] Erro ao listar números:`, error);
      return {
        success: false,
        error: error.message,
        numeros: [],
        total: 0,
        instanceId: instanceId,
      };
    }
  }
}

module.exports = new NumbersListDCGM();
