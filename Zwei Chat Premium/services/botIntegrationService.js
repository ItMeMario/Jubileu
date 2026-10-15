// services/botIntegrationService.js
// Orquestrador de Integração: Conecta a Sincronização em Tempo Real ao Motor de Fluxos

const { syncService } = require("./syncService");
const { flowExecutor } = require("../client/flowExecutor");
const { conversationService } = require("./conversationService");
const metaConfig = require("../config/metaConfig");

class BotIntegrationService {
  constructor() {
    this.isBotEnabled = true;
    this.boundHandler = this._onInboundMessage.bind(this);
    this.isInitialized = false;
    this.processedMessageIds = new Map();
  }

  /**
   * Inicializa o vínculo entre os eventos do Firestore e o executor de chatbot
   */
  initialize() {
    if (this.isInitialized) return;

    syncService.on("message:inbound", this.boundHandler);
    this.isInitialized = true;
    console.log("🤖 BotIntegrationService: Chatbot automatizado vinculado ao barramento de eventos.");
  }

  /**
   * Handler de mensagens de entrada
   * @private
   */
  async _onInboundMessage(message) {
    if (!this.isBotEnabled) {
      console.log(`ℹ️ Bot desativado temporariamente. Ignorando mensagem de ${message.from}`);
      return;
    }

    // 🛡️ Deduplicação de Mensagens: previne processamento duplicado caso a mensagem chegue por múltiplos canais (Túnel + Firestore)
    if (message && message.id) {
      const now = Date.now();
      // Limpeza periódica de mensagens com mais de 10 minutos
      if (this.processedMessageIds.size > 500) {
        for (const [id, ts] of this.processedMessageIds.entries()) {
          if (now - ts > 10 * 60 * 1000) {
            this.processedMessageIds.delete(id);
          }
        }
      }

      if (this.processedMessageIds.has(message.id)) {
        console.log(`🛡️ [Deduplicação] Mensagem ${message.id} já processada recentemente. Ignorando duplicata.`);
        return;
      }
      this.processedMessageIds.set(message.id, now);
    }

    // 🛡️ Isolamento por Contato: se o robô foi pausado para este contato específico (atendimento humano), não responde
    if (conversationService && !conversationService.isBotActiveForContact(message.from)) {
      console.log(`👤 [Atendimento Humano] Contato ${message.from} com bot pausado. Mensagem recebida aguardando operador.`);
      return;
    }

    // 🛡️ Isolamento por Linha: Se a mensagem foi recebida para um recipientPhoneNumberId específico
    // e esta máquina tem um phoneNumberId configurado, garante que são para a mesma linha
    const activePhoneId =
      metaConfig && typeof metaConfig.getConfig === "function"
        ? metaConfig.getConfig().phoneNumberId
        : null;

    if (
      message.recipientPhoneNumberId &&
      activePhoneId &&
      message.recipientPhoneNumberId !== activePhoneId
    ) {
      console.log(
        `ℹ️ [Bot] Mensagem destinada à linha ${message.recipientPhoneNumberId}. Ignorando pois esta máquina atende a linha ${activePhoneId}.`
      );
      return;
    }

    try {
      const result = await flowExecutor.handleIncomingMessage(message);
      if (result.handled) {
        console.log(`🤖 Bot executou ação [${result.actionTaken}] para ${message.from}`);
      }
    } catch (error) {
      console.error("❌ Erro ao processar mensagem no BotIntegrationService:", error);
    }
  }

  /**
   * Ativa a resposta automática do bot
   */
  enable() {
    this.isBotEnabled = true;
    console.log("✅ Chatbot automático ATIVADO.");
  }

  /**
   * Desativa a resposta automática do bot (ex: quando um operador humano assume a conversa)
   */
  disable() {
    this.isBotEnabled = false;
    console.log("⏸️ Chatbot automático PAUSADO.");
  }

  /**
   * Retorna o estado atual do bot
   * @returns {boolean}
   */
  isEnabled() {
    return this.isBotEnabled;
  }
}

// Exporta instância singleton
const botIntegrationService = new BotIntegrationService();
module.exports = {
  BotIntegrationService,
  botIntegrationService,
};
