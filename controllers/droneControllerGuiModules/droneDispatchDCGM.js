// controllers/droneControllerGuiModules/droneDispatchDCGM.js
const droneService = require("../../services/droneService");

class DroneDispatchDCGM {
  constructor() {
    console.log("DroneDispatchDCGM inicializado");
  }

  /**
   * Executa disparo de drone com mensagem selecionada
   * @param {string} instanceId - ID da instância a ser usada
   * @param {number} mensagemIndex - Índice da mensagem (baseado em 1)
   * @param {number} batchSize - Tamanho do batch
   * @returns {Promise<Object>} - Resultado do disparo
   */
  async executarDisparoDrone(instanceId, mensagemIndex, batchSize = 200) {
    try {
      // Valida instanceId
      if (!instanceId) {
        return {
          success: false,
          error:
            "Nenhuma instância selecionada. Selecione uma instância conectada.",
        };
      }

      console.log(
        `[${instanceId}] Executando disparo - Mensagem: ${mensagemIndex}, Batch: ${batchSize}`
      );

      // Verifica se há números cadastrados PARA ESTA INSTÂNCIA
      const listaNumeros = await droneService.listarNumeros(instanceId, null);
      if (!listaNumeros.success || listaNumeros.numbers.length === 0) {
        return {
          success: false,
          error:
            "Nenhum número cadastrado para disparo nesta instância. Adicione números primeiro.",
          instanceId: instanceId,
        };
      }

      console.log(
        `[${instanceId}] Números encontrados para disparo: ${listaNumeros.numbers.length}`
      );

      // Busca mensagens disponíveis
      const mensagens = await droneService.listarMensagensDisponiveis();
      if (!mensagens || mensagens.length === 0) {
        return {
          success: false,
          error: "Nenhuma mensagem disponível para disparo.",
          instanceId: instanceId,
        };
      }

      // O backend cuidará de selecionar as mensagens aleatoriamente
      const resultado = await droneService.executarDisparoCompleto(
        instanceId,
        null,
        batchSize
      );

      return {
        success: resultado.success,
        message: resultado.message || "Disparo finalizado",
        detalhes: {
          instanceId: instanceId,
          mensagemUsada: {
            id: "aleatoria",
            conteudo: "Múltiplas mensagens",
            locale: "variado",
          },
          totalNumeros: resultado.totalNumeros,
          totalBatches: resultado.totalBatches,
          batchesProcessados: resultado.batchesProcessados,
          totalEnviados: resultado.totalEnviados,
          totalFalhas: resultado.totalFalhas,
          batches: resultado.batches,
        },
        error: resultado.error,
        instanceId: instanceId,
      };
    } catch (error) {
      console.error(`[${instanceId}] Erro ao executar disparo:`, error);
      return {
        success: false,
        error: error.message,
        instanceId: instanceId,
      };
    }
  }
}

module.exports = new DroneDispatchDCGM();
