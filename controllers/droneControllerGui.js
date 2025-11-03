// controllers/droneControllerGui.js
const messagesDCGM = require("./droneControllerGuiModules/messagesDCGM");
const csvProcessorDCGM = require("./droneControllerGuiModules/csvProcessorDCGM");
const numbersListDCGM = require("./droneControllerGuiModules/numbersListDCGM");
const numbersRemovalDCGM = require("./droneControllerGuiModules/numbersRemovalDCGM");
const statisticsDCGM = require("./droneControllerGuiModules/statisticsDCGM");
const clientStatusDCGM = require("./droneControllerGuiModules/clientStatusDCGM");
const droneDispatchDCGM = require("./droneControllerGuiModules/droneDispatchDCGM");
const statusFormatHelpersDCGM = require("./droneControllerGuiModules/statusFormatHelpersDCGM");

class DroneControllerGui {
  constructor() {
    console.log("DroneControllerGui inicializado");
  }

  // ==================== MENSAGENS ====================
  /**
   * Lista todas as mensagens disponíveis
   * @returns {Promise<Object>} - Lista de mensagens formatadas
   */
  async listarMensagens() {
    return await messagesDCGM.listarMensagens();
  }

  // ==================== CSV PROCESSOR ====================
  /**
   * Processa arquivo CSV e adiciona números com opções de transformação
   * @param {string} csvContent - Conteúdo do arquivo CSV
   * @param {Object} opcoes - Opções de processamento
   * @returns {Promise<Object>} - Resultado formatado
   */
  async processarArquivoCSV(csvContent, opcoes = {}) {
    return await csvProcessorDCGM.processarArquivoCSV(csvContent, opcoes);
  }

  /**
   * Valida opções antes do processamento (útil para preview)
   * @param {Object} opcoes - Opções a validar
   * @returns {Object} - Resultado da validação
   */
  validarOpcoes(opcoes) {
    return csvProcessorDCGM.validarOpcoes(opcoes);
  }

  /**
   * Preview do CSV antes de processar (mostra primeiras linhas)
   * @param {string} csvContent - Conteúdo do CSV
   * @param {number} linhas - Quantidade de linhas para preview (padrão 5)
   * @returns {Object} - Preview formatado
   */
  previewCSV(csvContent, linhas = 5) {
    return csvProcessorDCGM.previewCSV(csvContent, linhas);
  }

  // ==================== LISTAGEM DE NÚMEROS ====================
  /**
   * Lista os números atualmente no banco
   * @param {string} filtroStatus - Status para filtrar (pending/sent/failed/all)
   * @returns {Promise<Object>} - Lista formatada
   */
  async listarNumerosAtuais(filtroStatus = "all") {
    return await numbersListDCGM.listarNumerosAtuais(filtroStatus);
  }

  // ==================== REMOÇÃO DE NÚMEROS ====================
  /**
   * Remove um número específico da lista
   * @param {number|string} identificador - ID do número ou índice da lista
   * @returns {Promise<Object>} - Resultado da remoção
   */
  async removerNumero(identificador) {
    return await numbersRemovalDCGM.removerNumero(identificador);
  }

  /**
   * Limpa toda a lista de números
   * @returns {Promise<Object>} - Resultado da operação
   */
  async limparListaCompleta() {
    return await numbersRemovalDCGM.limparListaCompleta();
  }

  /**
   * Limpa apenas números com status 'sent'
   * @returns {Promise<Object>} - Resultado da operação
   */
  async limparEnviados() {
    return await numbersRemovalDCGM.limparEnviados();
  }

  /**
   * Limpa apenas números com status 'failed'
   * @returns {Promise<Object>} - Resultado da operação
   */
  async limparFalhas() {
    return await numbersRemovalDCGM.limparFalhas();
  }

  // ==================== ESTATÍSTICAS ====================
  /**
   * Obtém estatísticas dos números cadastrados
   * @returns {Promise<Object>} - Estatísticas formatadas
   */
  async obterEstatisticasNumeros() {
    return await statisticsDCGM.obterEstatisticasNumeros();
  }

  /**
   * Gera relatório de números com nomes personalizados
   * @returns {Promise<Object>} - Relatório formatado
   */
  async gerarRelatorioNomes() {
    return await statisticsDCGM.gerarRelatorioNomes();
  }

  // ==================== STATUS DO CLIENTE ====================
  /**
   * Obtém status de conexão do WhatsApp
   * @returns {Promise<Object>} - Status formatado
   */
  async obterStatusCliente() {
    return await clientStatusDCGM.obterStatusCliente();
  }

  // ==================== DISPARO DE DRONE ====================
  /**
   * Executa disparo de drone com mensagem selecionada
   * @param {number} mensagemIndex - Índice da mensagem (baseado em 1)
   * @param {number} batchSize - Tamanho do batch
   * @returns {Promise<Object>} - Resultado do disparo
   */
  async executarDisparoDrone(mensagemIndex, batchSize = 200) {
    return await droneDispatchDCGM.executarDisparoDrone(
      mensagemIndex,
      batchSize
    );
  }

  // ==================== HELPERS ====================
  /**
   * Retorna texto legível para o status
   * @param {string} status - Status do cliente
   * @returns {string} - Texto formatado
   */
  getStatusTexto(status) {
    return statusFormatHelpersDCGM.getStatusTexto(status);
  }

  /**
   * Retorna ícone para o status
   * @param {string} status - Status do cliente
   * @returns {string} - Emoji/ícone
   */
  getStatusIcon(status) {
    return statusFormatHelpersDCGM.getStatusIcon(status);
  }

  /**
   * Retorna classe CSS para o status
   * @param {string} status - Status do cliente
   * @returns {string} - Nome da classe
   */
  getStatusClass(status) {
    return statusFormatHelpersDCGM.getStatusClass(status);
  }
}

module.exports = new DroneControllerGui();
