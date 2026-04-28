// controllers/droneControllerGuiModules/droneDispatchDCGM.js
const droneService = require("../../services/droneService");

class DroneDispatchDCGM {
  constructor() {
    console.log("DroneDispatchDCGM inicializado");
  }

  /**
   * Executa disparo de drone distribuído (Round-Robin entre instâncias conectadas)
   * @param {string} instanceId - Ignorado (agora é global via 'drone_global')
   * @param {number} mensagemIndex - Índice da mensagem (baseado em 1), ou null para aleatória
   * @param {number} batchSize - Tamanho do batch
   * @returns {Promise<Object>} - Resultado do disparo
   */
  async executarDisparoDrone(instanceId, mensagemIndex, batchSize = 200) {
    try {
      console.log(
        `[drone_global] Executando disparo distribuído - Batch: ${batchSize}`
      );

      // Verifica se há números cadastrados na lista GLOBAL
      const listaNumeros = await droneService.listarNumeros("drone_global", null);
      if (!listaNumeros.success || listaNumeros.numbers.length === 0) {
        return {
          success: false,
          error:
            "Nenhum número cadastrado para disparo. Adicione números primeiro.",
          instanceId: "drone_global",
        };
      }

      console.log(
        `[drone_global] Números encontrados para disparo: ${listaNumeros.numbers.length}`
      );

      // Busca mensagens disponíveis
      const mensagens = await droneService.listarMensagensDisponiveis();
      if (!mensagens || mensagens.length === 0) {
        return {
          success: false,
          error: "Nenhuma mensagem disponível para disparo.",
          instanceId: "drone_global",
        };
      }

      // O backend (messageDispatchDSM) cuidará do Round-Robin e seleção aleatória de mensagens
      const resultado = await droneService.executarDisparoCompleto(
        "drone_global",
        null,
        batchSize
      );

      return {
        success: resultado.success,
        message: resultado.message || "Disparo finalizado",
        detalhes: {
          instanceId: "drone_global",
          mensagemUsada: {
            id: "aleatoria",
            conteudo: "Múltiplas mensagens (Round-Robin)",
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
        instanceId: "drone_global",
      };
    } catch (error) {
      console.error(`[drone_global] Erro ao executar disparo:`, error);
      return {
        success: false,
        error: error.message,
        instanceId: "drone_global",
      };
    }
  }
}

module.exports = new DroneDispatchDCGM();
