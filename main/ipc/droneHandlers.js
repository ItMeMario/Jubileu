// main/ipc/droneHandlers.js
const droneControllerGui = require("../../controllers/droneControllerGui");

class DroneHandlers {
  constructor(windowManager) {
    this.windowManager = windowManager;
    console.log("DroneHandlers inicializado");
  }

  /**
   * Abre a janela do Drone
   */
  async openDrone() {
    try {
      console.log("Abrindo janela Drone...");
      return this.windowManager.openDroneWindow();
    } catch (error) {
      console.error("Erro ao abrir janela Drone:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Lista todas as mensagens disponíveis para disparo
   */
  async listarMensagens() {
    try {
      console.log("Listando mensagens disponíveis...");
      return await droneControllerGui.listarMensagens();
    } catch (error) {
      console.error("Erro ao listar mensagens:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Adiciona número(s) de telefone à lista
   * @param {Object} event - Evento IPC
   * @param {string|Array<string>} input - Número único ou array de números
   */
  async adicionarNumeros(event, input) {
    try {
      console.log("Adicionando números...");
      return await droneControllerGui.adicionarNumeros(input);
    } catch (error) {
      console.error("Erro ao adicionar números:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Lista os números atualmente em memória
   */
  async listarNumerosAtuais() {
    try {
      console.log("Listando números atuais...");
      return await droneControllerGui.listarNumerosAtuais();
    } catch (error) {
      console.error("Erro ao listar números atuais:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove um número específico da lista
   * @param {Object} event - Evento IPC
   * @param {number|string} identificador - ID do número ou índice da lista
   */
  async removerNumero(event, identificador) {
    try {
      console.log(`Removendo número: ${identificador}`);
      return await droneControllerGui.removerNumero(identificador);
    } catch (error) {
      console.error("Erro ao remover número:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Limpa toda a lista de números
   */
  async limparListaCompleta() {
    try {
      console.log("Limpando lista completa...");
      return await droneControllerGui.limparListaCompleta();
    } catch (error) {
      console.error("Erro ao limpar lista completa:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtém estatísticas dos números cadastrados
   */
  async obterEstatisticasNumeros() {
    try {
      console.log("Obtendo estatísticas dos números...");
      return await droneControllerGui.obterEstatisticasNumeros();
    } catch (error) {
      console.error("Erro ao obter estatísticas:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtém status de conexão do WhatsApp
   */
  async obterStatusCliente() {
    try {
      console.log("Obtendo status do cliente WhatsApp...");
      return await droneControllerGui.obterStatusCliente();
    } catch (error) {
      console.error("Erro ao obter status do cliente:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Executa disparo de drone com mensagem selecionada
   * @param {Object} event - Evento IPC
   * @param {number} mensagemIndex - Índice da mensagem (baseado em 1)
   * @param {number} batchSize - Tamanho do batch (padrão: 200)
   */
  async executarDisparoDrone(event, mensagemIndex, batchSize = 200) {
    try {
      console.log(
        `Executando disparo - Mensagem: ${mensagemIndex}, Batch: ${batchSize}`
      );
      return await droneControllerGui.executarDisparoDrone(
        mensagemIndex,
        batchSize
      );
    } catch (error) {
      console.error("Erro ao executar disparo:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = DroneHandlers;
