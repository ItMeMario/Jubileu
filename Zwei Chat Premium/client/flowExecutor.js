// client/flowExecutor.js
// Motor de Execução de Fluxos Interativos e Chatbot para Meta WhatsApp Cloud API

const { metaApiClient, normalizePhoneNumber } = require("./metaApiClient");
const { flowService } = require("../services/flowService");
const { window24hService } = require("../services/window24hService");

// Tempo limite de expiração da sessão ativa: 30 minutos
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

class FlowExecutor {
  constructor() {
    // Mapa de sessões: contactPhone => { flowId, currentStepId, lastInteraction, context }
    this.sessions = new Map();
  }

  /**
   * Processa uma mensagem de entrada e conduz o fluxo interativo
   * @param {object} message - Mensagem normalizada recebida da Meta (via Webhook/Sync)
   * @returns {Promise<{ handled: boolean, actionTaken?: string, error?: string }>}
   */
  async handleIncomingMessage(message) {
    if (!message || !message.from || message.direction !== "inbound") {
      return { handled: false, error: "Mensagem inválida para processamento de fluxo" };
    }

    const contactPhone = normalizePhoneNumber(message.from);
    const session = this._getSession(contactPhone);
    const activeFlow = session ? flowService.getFlowById(session.flowId) : flowService.getActiveFlow();

    if (!activeFlow) {
      return { handled: false, error: "Nenhum fluxo configurado ou ativo" };
    }

    // 1. Verifica se a mensagem de entrada aciona o gatilho de início/reinício de fluxo
    const textBody = (message.body || "").trim().toLowerCase();
    const isTriggerWord = (activeFlow.triggerKeywords || []).some((kw) => textBody === kw.toLowerCase());

    if (isTriggerWord || !session) {
      // Inicia novo fluxo do passo inicial
      const initialStepId = activeFlow.initialStepId || Object.keys(activeFlow.steps || {})[0];
      return this._executeStep(contactPhone, activeFlow, initialStepId);
    }

    // 2. Se já existe uma sessão em andamento, resolve a resposta do usuário
    const currentStep = activeFlow.steps?.[session.currentStepId];
    if (!currentStep) {
      this.resetSession(contactPhone);
      return { handled: false, error: "Passo atual não encontrado no fluxo" };
    }

    const nextStepId = this._resolveNextStep(message, currentStep);

    if (nextStepId) {
      return this._executeStep(contactPhone, activeFlow, nextStepId);
    } else {
      // Fallback: Resposta não reconhecida para o menu atual
      // Reenvia o menu ou opção de ajuda
      console.log(`ℹ️ Resposta não reconhecida de ${contactPhone}. Reenviando opções...`);
      return this._executeStep(contactPhone, activeFlow, session.currentStepId);
    }
  }

  /**
   * Determina qual o próximo passo com base no clique em botão, seleção de lista ou digitação de texto
   * @private
   */
  _resolveNextStep(message, currentStep) {
    // Caso A: Clique em Botão de Resposta Rápida (button_reply)
    if (message.interactiveType === "button_reply" && message.buttonReply?.id) {
      const clickedId = message.buttonReply.id;
      const button = (currentStep.buttons || []).find((b) => b.id === clickedId);
      return button ? button.nextStepId : null;
    }

    // Caso B: Seleção em Menu de Lista (list_reply)
    if (message.interactiveType === "list_reply" && message.listReply?.id) {
      const selectedId = message.listReply.id;
      for (const section of currentStep.sections || []) {
        const row = (section.rows || []).find((r) => r.id === selectedId);
        if (row && row.nextStepId) return row.nextStepId;
      }
      return null;
    }

    // Caso C: Resposta em Texto Livre (Fallback inteligente por número ou título)
    const textInput = (message.body || "").trim().toLowerCase();

    // C.1 Se o passo atual possui botões
    if (currentStep.buttons && currentStep.buttons.length > 0) {
      for (let i = 0; i < currentStep.buttons.length; i++) {
        const btn = currentStep.buttons[i];
        const indexStr = String(i + 1);
        const title = (btn.title || "").toLowerCase();

        if (textInput === indexStr || textInput === title || textInput === btn.id.toLowerCase()) {
          return btn.nextStepId;
        }
      }
    }

    // C.2 Se o passo atual possui lista
    if (currentStep.sections && currentStep.sections.length > 0) {
      let globalIndex = 1;
      for (const section of currentStep.sections) {
        for (const row of section.rows || []) {
          const indexStr = String(globalIndex);
          const title = (row.title || "").toLowerCase();

          if (textInput === indexStr || textInput === title || textInput === row.id.toLowerCase()) {
            return row.nextStepId;
          }
          globalIndex++;
        }
      }
    }

    return null;
  }

  /**
   * Executa e despacha uma etapa específica do fluxo para o WhatsApp do cliente
   * @private
   */
  async _executeStep(contactPhone, flow, stepId) {
    const step = flow.steps?.[stepId];
    if (!step) {
      this.resetSession(contactPhone);
      return { handled: true, actionTaken: "FLOW_FINISHED" };
    }

    // Atualiza a sessão ativa
    this.sessions.set(contactPhone, {
      flowId: flow.id,
      currentStepId: stepId,
      lastInteraction: Date.now(),
    });

    let sendResult = null;

    try {
      switch (step.type) {
        case "interactive_buttons":
          sendResult = await metaApiClient.sendInteractiveButtons(
            contactPhone,
            step.body,
            step.buttons,
            step.header || null,
            step.footer || null
          );
          break;

        case "interactive_list":
          sendResult = await metaApiClient.sendInteractiveList(
            contactPhone,
            step.body,
            step.buttonTitle || "Opções",
            step.sections,
            step.header || null,
            step.footer || null
          );
          break;

        case "text":
          sendResult = await metaApiClient.sendTextMessage(contactPhone, step.body);
          break;

        default:
          sendResult = await metaApiClient.sendTextMessage(contactPhone, step.body || "");
          break;
      }

      // Se o passo não tiver botões nem listas e definir um nextStepId imediato, avança automaticamente
      if (step.type === "text" && step.nextStepId) {
        return this._executeStep(contactPhone, flow, step.nextStepId);
      }

      // Se for passo final sem próximo passo, encerra a sessão
      if (!step.buttons && !step.sections && !step.nextStepId) {
        this.resetSession(contactPhone);
      }

      return {
        handled: true,
        actionTaken: `EXECUTED_STEP_${stepId}`,
        success: sendResult?.success || false,
        messageId: sendResult?.messageId || null,
      };
    } catch (error) {
      console.error(`❌ Erro ao despachar passo ${stepId} para ${contactPhone}:`, error);
      return { handled: false, error: error.message };
    }
  }

  /**
   * Obtém a sessão ativa de um contato respeitando o timeout
   * @private
   */
  _getSession(contactPhone) {
    const session = this.sessions.get(contactPhone);
    if (!session) return null;

    if (Date.now() - session.lastInteraction > SESSION_TIMEOUT_MS) {
      this.sessions.delete(contactPhone);
      return null;
    }

    return session;
  }

  /**
   * Encerra a sessão ativa de um contato
   * @param {string} contactPhone
   */
  resetSession(contactPhone) {
    const phone = normalizePhoneNumber(contactPhone);
    this.sessions.delete(phone);
  }

  /**
   * Retorna a contagem de sessões ativas
   */
  getActiveSessionCount() {
    return this.sessions.size;
  }
}

// Exporta instância singleton
const flowExecutor = new FlowExecutor();
module.exports = {
  FlowExecutor,
  flowExecutor,
};
