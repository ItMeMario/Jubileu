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
   * Processa arquivo CSV com opções de transformação
   * @param {Object} event - Evento IPC
   * @param {string} csvContent - Conteúdo do arquivo CSV
   * @param {Object} opcoes - Opções de processamento
   */
  async processarArquivoCSV(event, csvContent, opcoes = {}) {
    try {
      console.log("Processando arquivo CSV...");
      return await droneControllerGui.processarArquivoCSV(csvContent, opcoes);
    } catch (error) {
      console.error("Erro ao processar CSV:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Preview do CSV antes de processar
   * @param {Object} event - Evento IPC
   * @param {string} csvContent - Conteúdo do CSV
   * @param {number} linhas - Quantidade de linhas para preview
   */
  async previewCSV(event, csvContent, linhas = 5) {
    try {
      console.log("Gerando preview do CSV...");
      return droneControllerGui.previewCSV(csvContent, linhas);
    } catch (error) {
      console.error("Erro ao gerar preview:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Valida opções antes do processamento
   * @param {Object} event - Evento IPC
   * @param {Object} opcoes - Opções a validar
   */
  async validarOpcoes(event, opcoes) {
    try {
      console.log("Validando opções...");
      return droneControllerGui.validarOpcoes(opcoes);
    } catch (error) {
      console.error("Erro ao validar opções:", error);
      return { valido: false, erros: [error.message], avisos: [] };
    }
  }

  /**
   * Lista os números atualmente no banco
   * @param {Object} event - Evento IPC
   * @param {string} filtroStatus - Filtro de status (pending/sent/failed/all)
   */
  async listarNumerosAtuais(event, filtroStatus = "all") {
    try {
      console.log(`Listando números atuais com filtro: ${filtroStatus}`);
      return await droneControllerGui.listarNumerosAtuais(filtroStatus);
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
   * Limpa apenas números com status 'sent'
   */
  async limparEnviados() {
    try {
      console.log("Limpando números enviados...");
      return await droneControllerGui.limparEnviados();
    } catch (error) {
      console.error("Erro ao limpar enviados:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Limpa apenas números com status 'failed'
   */
  async limparFalhas() {
    try {
      console.log("Limpando números com falha...");
      return await droneControllerGui.limparFalhas();
    } catch (error) {
      console.error("Erro ao limpar falhas:", error);
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

  /**
   * Gera relatório de números com nomes personalizados
   */
  async gerarRelatorioNomes() {
    try {
      console.log("Gerando relatório de nomes...");
      return await droneControllerGui.gerarRelatorioNomes();
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = DroneHandlers;
