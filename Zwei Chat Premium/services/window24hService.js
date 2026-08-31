// services/window24hService.js
// Gerenciador e Validador da Janela de Atendimento de 24 Horas (Meta WhatsApp Policy)

const { normalizePhoneNumber } = require("../client/metaApiClient");

// Duração de 24 horas em milissegundos
const WINDOW_DURATION_MS = 24 * 60 * 60 * 1000;

class Window24hService {
  constructor() {
    // Mapa em memória: contactPhone => { lastInboundTimestamp, expiresAt }
    this.windows = new Map();
  }

  /**
   * Registra a última interação de entrada (mensagem do cliente) para abrir/renovar a janela de 24h
   * @param {string} contactPhone - Número do contato
   * @param {number|Date} [timestamp=Date.now()] - Timestamp do evento
   */
  recordInboundInteraction(contactPhone, timestamp = Date.now()) {
    const phone = normalizePhoneNumber(contactPhone);
    if (!phone) return;

    const time = typeof timestamp === "number" ? timestamp : new Date(timestamp).getTime();
    const expiresAt = time + WINDOW_DURATION_MS;

    this.windows.set(phone, {
      lastInboundTimestamp: time,
      expiresAt: expiresAt,
    });
  }

  /**
   * Verifica o estado da janela de atendimento de 24h para um contato
   * @param {string} contactPhone - Número do contato
   * @returns {{
   *   isOpen: boolean,
   *   isExpired: boolean,
   *   lastInboundTimestamp: number|null,
   *   expiresAt: number|null,
   *   remainingMs: number,
   *   formattedStatus: string
   * }}
   */
  checkWindow(contactPhone) {
    const phone = normalizePhoneNumber(contactPhone);
    const windowData = this.windows.get(phone);

    if (!windowData || !windowData.lastInboundTimestamp) {
      return {
        isOpen: false,
        isExpired: true,
        lastInboundTimestamp: null,
        expiresAt: null,
        remainingMs: 0,
        formattedStatus: "Sem histórico de mensagens do cliente (Janela fechada)",
      };
    }

    const now = Date.now();
    const remainingMs = windowData.expiresAt - now;
    const isOpen = remainingMs > 0;

    return {
      isOpen,
      isExpired: !isOpen,
      lastInboundTimestamp: windowData.lastInboundTimestamp,
      expiresAt: windowData.expiresAt,
      remainingMs: Math.max(0, remainingMs),
      formattedStatus: isOpen
        ? `Janela aberta (${this._formatDuration(remainingMs)} restantes)`
        : `Janela expirada há ${this._formatDuration(Math.abs(remainingMs))}`,
    };
  }

  /**
   * Valida se uma mensagem de formato livre (texto, mídia, botões) pode ser enviada
   * @param {string} contactPhone
   * @returns {{ allowed: boolean, reason?: string }}
   */
  canSendFreeForm(contactPhone) {
    const status = this.checkWindow(contactPhone);
    if (status.isOpen) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason:
        "Janela de 24 horas expirada. A política da Meta exige o envio de um Message Template aprovado para reabrir o canal de atendimento.",
    };
  }

  /**
   * Formata milissegundos em horas e minutos legíveis
   * @private
   */
  _formatDuration(ms) {
    const totalMinutes = Math.floor(ms / (60 * 1000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Limpa a memória de janelas (útil para testes)
   */
  clear() {
    this.windows.clear();
  }
}

// Exporta instância singleton
const window24hService = new Window24hService();
module.exports = {
  Window24hService,
  window24hService,
  WINDOW_DURATION_MS,
};
