// services/metaBroadcastService.js
// Disparador Oficial em Lote (Broadcast) com Templates da Meta (Substituto Oficial do Drone)

const EventEmitter = require("events");
const { metaApiClient, normalizePhoneNumber } = require("../client/metaApiClient");
const { metaTemplateService } = require("./metaTemplateService");

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
   * @param {string} params.campaignId - Identificador único da campanha
   * @param {string} params.templateName - Nome do template cadastrado na Meta
   * @param {string} [params.languageCode='pt_BR'] - Idioma do template
   * @param {Array<{ phone: string, name?: string, variables?: Array<string>|object, headerMedia?: object }>} params.recipients - Lista de destinatários com suas variáveis
   * @param {number} [params.delayBetweenMs=100] - Intervalo entre envios (em ms) para controle de vazão
   */
  async startBroadcast({
    campaignId = `campaign_${Date.now()}`,
    templateName,
    languageCode = "pt_BR",
    recipients = [],
    delayBetweenMs = 100,
  }) {
    if (this.isRunning) {
      throw new Error("Uma campanha de disparo já está em execução.");
    }

    if (!templateName) {
      throw new Error("Nome do template é obrigatório para disparos oficiais.");
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw new Error("A lista de destinatários está vazia.");
    }

    this.isRunning = true;
    this.isPaused = false;
    this.shouldStop = false;

    this.stats = {
      campaignId,
      templateName,
      total: recipients.length,
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

    for (let i = 0; i < recipients.length; i++) {
      if (this.shouldStop) {
        console.log("🛑 Disparo interrompido pelo usuário.");
        break;
      }

      // Controle de pausa
      while (this.isPaused && !this.shouldStop) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      const item = recipients[i];
      const rawPhone = item.phone || item.numero || item.telefone;
      const cleanPhone = normalizePhoneNumber(rawPhone);

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

      // Intervalo entre requisições
      if (delayBetweenMs > 0 && i < recipients.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenMs));
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
    }
  }

  /**
   * Retoma uma campanha pausada
   */
  resume() {
    if (this.isRunning && this.isPaused) {
      this.isPaused = false;
      this.emit("broadcast:resumed", this.getStats());
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
   * Registra o resultado individual de cada envio
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

    const logEntry = {
      phone: item.phone || item.numero || item.telefone,
      name: item.name || item.nome || null,
      success,
      messageId,
      error: errorMessage,
      timestamp: Date.now(),
    };

    this.stats.logs.push(logEntry);
  }
}

// Exporta instância singleton
const metaBroadcastService = new MetaBroadcastService();
module.exports = {
  MetaBroadcastService,
  metaBroadcastService,
};
