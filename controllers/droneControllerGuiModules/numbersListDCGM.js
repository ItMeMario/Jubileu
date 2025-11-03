// controllers/droneControllerGuiModules/numbersListDCGM.js
const droneService = require("../../services/droneService");
const statusFormatHelpers = require("./statusFormatHelpersDCGM");

class NumbersListDCGM {
  constructor() {
    console.log("NumbersListDCGM inicializado");
  }

  /**
   * Lista os números atualmente no banco
   * @param {string} filtroStatus - Status para filtrar (pending/sent/failed/all)
   * @returns {Promise<Object>} - Lista formatada
   */
  async listarNumerosAtuais(filtroStatus = "all") {
    try {
      console.log(`Listando números com filtro: ${filtroStatus}`);
      const resultado = await droneService.listarNumeros();

      if (!resultado.success) {
        return {
          success: false,
          error: resultado.error,
          numeros: [],
          total: 0,
        };
      }

      if (resultado.numbers.length === 0) {
        return {
          success: true,
          numeros: [],
          total: 0,
        };
      }

      // Aplica filtro de status se necessário
      let numerosFiltrados = resultado.numbers;
      if (filtroStatus !== "all") {
        numerosFiltrados = resultado.numbers.filter(
          (num) => num.status === filtroStatus
        );
      }

      // Formata números para exibição na GUI
      const numerosFormatados = numerosFiltrados.map((num, index) => ({
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
      }));

      return {
        success: true,
        numeros: numerosFormatados,
        total: numerosFiltrados.length,
        totalGeral: resultado.total,
        filtroAplicado: filtroStatus,
      };
    } catch (error) {
      console.error("Erro ao listar números:", error);
      return {
        success: false,
        error: error.message,
        numeros: [],
        total: 0,
      };
    }
  }
}

module.exports = new NumbersListDCGM();
