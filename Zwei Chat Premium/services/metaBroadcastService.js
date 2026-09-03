// services/metaBroadcastService.js
// Disparador Oficial em Lote (Broadcast) com Templates da Meta e Gestão de Cadência

const EventEmitter = require("events");
const { metaApiClient, normalizePhoneNumber } = require("../client/metaApiClient");
const { metaTemplateService } = require("./metaTemplateService");
const { broadcastRecipientsService } = require("./broadcastRecipientsService");
const { aplicarTransformacoes } = require("./numberTransformer");

/**
 * Calcula o tempo de espera em milissegundos com base no formato de intervalo configurado
 * @param {object|number} intervalConfig - Configuração de intervalo
 * @returns {number} Milissegundos
 */
function calculateDelayMs(intervalConfig) {
  if (typeof intervalConfig === "number") {
    return Math.max(intervalConfig, 0);
  }

  if (!intervalConfig || typeof intervalConfig !== "object") {
    return 1500; // Padrão: 1.5s
  }

  const unitMultiplier = intervalConfig.unit === "minutes" ? 60000 : 1000;

  if (intervalConfig.type === "range") {
    const minMs = (Number(intervalConfig.min) || 1) * unitMultiplier;
    const maxMs = (Number(intervalConfig.max) || 3) * unitMultiplier;
    if (maxMs <= minMs) return minMs;
    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  }

  const val = Number(intervalConfig.value !== undefined ? intervalConfig.value : intervalConfig.min) || 2;
  return Math.max(val * unitMultiplier, 0);
}

class MetaBroadcastService extends EventEmitter {
  constructor() {
    super();
    this.isRunning = false;
    this.isPaused = false;
    this.shouldStop = false;

    this.stats = {
      campaignId: null,
      templateName: null,
      total: 0,
      processed: 0,
      sent: 0,
      failed: 0,
      startedAt: null,
      finishedAt: null,
      progressPercent: 0,
      logs: [],
    };
  }

  /**
   * Obtém as estatísticas da campanha atual ou última executada
   * @returns {object}
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Inicia o disparo em lote de uma campanha utilizando um Message Template aprovado
   * @param {object} params
   * @param {string} [params.campaignId] - Identificador único da campanha
   * @param {string} params.templateName - Nome do template cadastrado na Meta
   * @param {string} [params.languageCode='pt_BR'] - Idioma do template
   * @param {Array<object>} [params.recipients] - Lista opcional de destinatários (se vazio, busca os pendentes do serviço)
   * @param {number|object} [params.dispatchInterval] - Cadência de envio configurada
   * @param {number} [params.delayBetweenMessagesMs] - Alias legado para delay fixo em ms
   */
  async startBroadcast({
    campaignId = `campaign_${Date.now()}`,
    templateName,
    languageCode = "pt_BR",
    recipients = null,
    dispatchInterval = null,
    delayBetweenMessagesMs = null,
  }) {
    if (this.isRunning) {
      throw new Error("Uma campanha de disparo já está em execução.");
    }

    if (!templateName) {
      throw new Error("Nome do template é obrigatório para disparos oficiais.");
    }

    const config = broadcastRecipientsService.getConfig();

    // 1. Obtém lista de contatos para envio (pendentes e com falha)
    let targetList = [];
    if (Array.isArray(recipients) && recipients.length > 0) {
      targetList = recipients;
    } else {
      targetList = broadcastRecipientsService.getPendingAndFailedRecipients();
    }

    if (!Array.isArray(targetList) || targetList.length === 0) {
      throw new Error("Nenhum destinatário pendente encontrado para disparo.");
    }

    // Configura a cadência de envio
    const intervalSettings = dispatchInterval || delayBetweenMessagesMs || config.dispatchInterval || 1500;

    this.isRunning = true;
    this.isPaused = false;
    this.shouldStop = false;

    this.stats = {
      campaignId,
      templateName,
      total: targetList.length,
      processed: 0,
      sent: 0,
      failed: 0,
      startedAt: Date.now(),
      finishedAt: null,
      progressPercent: 0,
      logs: [],
    };

    this.emit("broadcast:started", this.getStats());

    // Busca o template normalizado para validar estrutura
    const template = metaTemplateService.getTemplateByName(templateName, languageCode);

    for (let i = 0; i < targetList.length; i++) {
      if (this.shouldStop) {
        const stopLog = {
          timestamp: Date.now(),
          phone: "-",
          name: "Sistema",
          status: "info",
          message: "🛑 Campanha interrompida pelo usuário.",
        };
        this.emit("broadcast:log", stopLog);
        break;
      }

      // Controle de pausa
      while (this.isPaused && !this.shouldStop) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      const item = targetList[i];
      const rawPhone = item.phone || item.numero || item.telefone;
      const cleanPhone = aplicarTransformacoes(rawPhone, config) || normalizePhoneNumber(rawPhone);

      if (!cleanPhone) {
        this._recordResult(item, false, "Número de telefone inválido ou ausente", null);
        continue;
      }

      try {
        // Monta os componentes com as variáveis do destinatário
        const variables = item.variables || item.variaveis || [item.name || item.nome || ""];
        const headerMedia = item.headerMedia || null;
        const components = metaTemplateService.buildTemplateComponents(template, variables, headerMedia);

        const response = await metaApiClient.sendTemplateMessage(
          cleanPhone,
          templateName,
          languageCode,
          components
        );

        if (response.success) {
          this._recordResult(item, true, null, response.messageId);
        } else {
          this._recordResult(item, false, response.error || "Falha no envio da Meta", null);
        }
      } catch (error) {
        this._recordResult(item, false, error.message, null);
      }

      // Emite atualização de progresso
      this.emit("broadcast:progress", this.getStats());

      // Intervalo entre requisições (se não for o último item)
      if (i < targetList.length - 1 && !this.shouldStop) {
        const delayMs = calculateDelayMs(intervalSettings);
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    this.isRunning = false;
    this.stats.finishedAt = Date.now();
    this.stats.progressPercent = 100;

    this.emit("broadcast:completed", this.getStats());
    return this.getStats();
  }

  /**
   * Pausa o envio da campanha atual
   */
  pause() {
    if (this.isRunning && !this.isPaused) {
      this.isPaused = true;
      this.emit("broadcast:paused", this.getStats());
      this.emit("broadcast:log", {
        timestamp: Date.now(),
        phone: "-",
        name: "Sistema",
        status: "warning",
        message: "⏸️ Campanha pausada.",
      });
    }
  }

  /**
   * Retoma uma campanha pausada
   */
  resume() {
    if (this.isRunning && this.isPaused) {
      this.isPaused = false;
      this.emit("broadcast:resumed", this.getStats());
      this.emit("broadcast:log", {
        timestamp: Date.now(),
        phone: "-",
        name: "Sistema",
        status: "info",
        message: "▶️ Campanha retomada.",
      });
    }
  }

  /**
   * Cancela/Interrompe a campanha atual
   */
  stop() {
    if (this.isRunning) {
      this.shouldStop = true;
      this.isPaused = false;
      this.emit("broadcast:stopped", this.getStats());
    }
  }

  /**
   * Registra o resultado individual de cada envio e emite evento de log em tempo real
   * @private
   */
  _recordResult(item, success, errorMessage, messageId) {
    this.stats.processed++;
    if (success) {
      this.stats.sent++;
    } else {
      this.stats.failed++;
    }

    this.stats.progressPercent = Math.round((this.stats.processed / this.stats.total) * 100);

    const contactPhone = item.phone || item.numero || item.telefone || "";
    const contactName = item.name || item.nome || "";

    const logEntry = {
      timestamp: Date.now(),
      phone: contactPhone,
      name: contactName,
      status: success ? "success" : "failed",
      messageId: messageId || null,
      error: errorMessage || null,
      message: success
        ? `✅ Enviado com sucesso para ${contactName ? `${contactName} (${contactPhone})` : contactPhone} ${messageId ? `[ID: ${messageId}]` : ""}`
        : `❌ Falha no envio para ${contactName ? `${contactName} (${contactPhone})` : contactPhone}: ${errorMessage}`,
    };

    this.stats.logs.push(logEntry);

    // Atualiza status do contato no serviço de persistência
    if (item.id || contactPhone) {
      broadcastRecipientsService.updateRecipientStatus(
        item.id || contactPhone,
        success ? "sent" : "failed",
        errorMessage,
        messageId
      );
      this.emit("broadcast:recipient_updated", {
        id: item.id,
        phone: contactPhone,
        status: success ? "sent" : "failed",
      });
    }

    // Emite o log detalhado para o frontend em tempo real
    this.emit("broadcast:log", logEntry);
  }
}

// Exporta instância singleton
const metaBroadcastService = new MetaBroadcastService();
module.exports = {
  MetaBroadcastService,
  metaBroadcastService,
  calculateDelayMs,
};
