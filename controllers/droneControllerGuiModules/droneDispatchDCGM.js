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

      // Verifica se há números cadastrados
      const listaNumeros = await droneService.listarNumeros();
      if (!listaNumeros.success || listaNumeros.numbers.length === 0) {
        return {
          success: false,
          error:
            "Nenhum número cadastrado para disparo. Adicione números primeiro.",
          instanceId: instanceId,
        };
      }

      // Busca mensagens disponíveis
      const mensagens = await droneService.listarMensagensDisponiveis();
      if (!mensagens || mensagens.length === 0) {
        return {
          success: false,
          error: "Nenhuma mensagem disponível para disparo.",
          instanceId: instanceId,
        };
      }

      // Valida índice da mensagem
      const mensagemIndex0 = mensagemIndex - 1; // Converte para índice base 0
      if (mensagemIndex0 < 0 || mensagemIndex0 >= mensagens.length) {
        return {
          success: false,
          error: "Mensagem selecionada inválida.",
          instanceId: instanceId,
        };
      }

      const mensagemSelecionada = mensagens[mensagemIndex0];

      // Executa disparo completo passando instanceId
      const resultado = await droneService.executarDisparoCompleto(
        instanceId,
        mensagemSelecionada.id,
        batchSize
      );

      return {
        success: resultado.success,
        message: resultado.message || "Disparo finalizado",
        detalhes: {
          instanceId: instanceId,
          mensagemUsada: {
            id: mensagemSelecionada.id,
            conteudo: mensagemSelecionada.message_content,
            locale: mensagemSelecionada.locale,
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
