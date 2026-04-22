// main/ipc/sentinelaHandlers.js
const sentinelaService = require("../../services/sentinelaService");

class SentinelaHandlers {
  constructor(windowManager) {
    this.windowManager = windowManager;
    console.log("SentinelaHandlers inicializado");
  }

  /**
   * Abre a janela do Sentinela
   */
  async openSentinela() {
    try {
      if (this.windowManager) {
        return this.windowManager.openSentinelaWindow();
      } else {
        throw new Error("windowManager não disponível");
      }
    } catch (error) {
      console.error("Erro ao abrir Sentinela:", error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Importa arquivo CSV e processa para a tabela area_codes
   * @param {Object} event - Evento IPC
   * @param {string} csvContent - Conteúdo do arquivo CSV
   */
  async importCSV(event, csvContent) {
    try {
      console.log("[Sentinela] Processando importação CSV...");
      return await sentinelaService.processImport(csvContent);
    } catch (error) {
      console.error("[Sentinela] Erro ao importar CSV:", error);
      return {
        success: false,
        error: error.message,
        adicionados: 0,
        atualizados: 0,
        ignorados: 0,
        erros: [],
      };
    }
  }

  /**
   * Lista registros da tabela area_codes com filtros
   * @param {Object} event - Evento IPC
   * @param {Object} filters - Filtros opcionais
   */
  async getAreaCodes(event, filters = {}) {
    try {
      return await sentinelaService.getAreaCodes(filters);
    } catch (error) {
      console.error("[Sentinela] Erro ao listar area_codes:", error);
      return { success: false, error: error.message, data: [], total: 0 };
    }
  }

  /**
   * Limpa todos os registros da tabela area_codes, com suporte a filtros
   */
  async clearAreaCodes(event, filters = {}) {
    try {
      console.log("[Sentinela] Limpando tabela area_codes com filtros:", filters);
      return await sentinelaService.clearAreaCodes(filters);
    } catch (error) {
      console.error("[Sentinela] Erro ao limpar area_codes:", error);
      return { success: false, error: error.message, removidos: 0 };
    }
  }

  /**
   * Obtém estatísticas da tabela area_codes
   */
  async getImportStats() {
    try {
      return await sentinelaService.getImportStats();
    } catch (error) {
      console.error("[Sentinela] Erro ao obter stats:", error);
      return {
        success: false,
        error: error.message,
        total: 0,
        porDDD: [],
        porPrioridade: [],
      };
    }
  }

  /**
   * Cria um evento no calendário
   */
  async createCalendarEvent(event, eventData) {
    try {
      return await sentinelaService.createCalendarEvent(eventData);
    } catch (error) {
      console.error("[Sentinela] Erro ao criar evento:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Busca eventos do calendário
   */
  async getCalendarEvents(event) {
    try {
      return await sentinelaService.getCalendarEvents();
    } catch (error) {
      console.error("[Sentinela] Erro ao buscar eventos:", error);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Exclui um evento do calendário
   */
  async deleteCalendarEvent(event, id) {
    try {
      return await sentinelaService.deleteCalendarEvent(id);
    } catch (error) {
      console.error("[Sentinela] Erro ao excluir evento:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = SentinelaHandlers;
