// services/botIntegrationService.js
// Orquestrador de Integração: Conecta a Sincronização em Tempo Real ao Motor de Fluxos

const { syncService } = require("./syncService");
const { flowExecutor } = require("../client/flowExecutor");

class BotIntegrationService {
  constructor() {
    this.isBotEnabled = true;
    this.boundHandler = this._onInboundMessage.bind(this);
    this.isInitialized = false;
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
