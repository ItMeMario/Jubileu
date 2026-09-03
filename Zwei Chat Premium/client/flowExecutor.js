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
   * Substitui tags do tipo {{variavel}} no texto utilizando o contexto acumulado da sessão
   * @param {string} templateText
   * @param {object} context
   * @returns {string}
   */
  interpolateVariables(templateText, context = {}) {
    if (!templateText || typeof templateText !== "string") return templateText || "";

    return templateText.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (match, rawKey) => {
      const key = rawKey.trim();

      // 1. Busca direta por chave exata
      if (context[key] !== undefined && context[key] !== null && context[key] !== "") {
        return String(context[key]);
      }

      // 2. Busca case-insensitive
      const lowerKey = key.toLowerCase();
      for (const [k, v] of Object.entries(context)) {
        if (k.toLowerCase() === lowerKey && v !== undefined && v !== null && v !== "") {
          return String(v);
        }
      }

      return match;
    });
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
    let session = this._getSession(contactPhone);
    const activeFlow = session ? flowService.getFlowById(session.flowId) : flowService.getActiveFlow();

    if (!activeFlow) {
      return { handled: false, error: "Nenhum fluxo configurado ou ativo" };
    }

    // 1. Verifica se a mensagem de entrada aciona o gatilho de início/reinício de fluxo
    const textBody = (message.body || "").trim().toLowerCase();
    const isTriggerWord = (activeFlow.triggerKeywords || []).some((kw) => textBody === kw.toLowerCase());

    if (isTriggerWord || !session) {
      // Inicia nova sessão com contexto básico
      session = {
        flowId: activeFlow.id,
        currentStepId: null,
        lastInteraction: Date.now(),
        context: {
          phone: contactPhone,
          telefone: contactPhone,
          contactPhone: contactPhone,
        },
      };
      this.sessions.set(contactPhone, session);

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

    const resolution = this._resolveNextStep(message, currentStep);

    if (resolution && resolution.nextStepId) {
      // Salva as variáveis capturadas nesta etapa no contexto da sessão
      if (resolution.variables) {
        Object.assign(session.context, resolution.variables);
      }
      return this._executeStep(contactPhone, activeFlow, resolution.nextStepId);
    } else {
      // Fallback: Resposta não reconhecida para o menu atual
      console.log(`ℹ️ Resposta não reconhecida de ${contactPhone}. Reenviando opções...`);
      return this._executeStep(contactPhone, activeFlow, session.currentStepId);
    }
  }

  /**
   * Determina qual o próximo passo e extrai variáveis da escolha do usuário
   * @private
   * @returns {{ nextStepId: string, variables: object }|null}
   */
  _resolveNextStep(message, currentStep) {
    const varName = currentStep.variableName || currentStep.id;

    // Caso A: Clique em Botão de Resposta Rápida (button_reply)
    if (message.interactiveType === "button_reply" && message.buttonReply?.id) {
      const clickedId = message.buttonReply.id;
      const button = (currentStep.buttons || []).find((b) => b.id === clickedId);
      if (button) {
        const chosenValue = button.value || button.title || button.id;
        const variables = {
          [varName]: chosenValue,
          [currentStep.id]: chosenValue,
        };

        if (button.link) {
          variables.link = button.link;
          variables[`${varName}_link`] = button.link;
        }

        if (button.variableName) {
          variables[button.variableName] = chosenValue;
        }

        return { nextStepId: button.nextStepId, variables };
      }
      return null;
    }

    // Caso B: Seleção em Menu de Lista (list_reply)
    if (message.interactiveType === "list_reply" && message.listReply?.id) {
      const selectedId = message.listReply.id;
      for (const section of currentStep.sections || []) {
        const row = (section.rows || []).find((r) => r.id === selectedId);
        if (row && row.nextStepId) {
          const chosenValue = row.value || row.title || row.id;
          const variables = {
            [varName]: chosenValue,
            [currentStep.id]: chosenValue,
          };

          if (row.link) {
            variables.link = row.link;
            variables[`${varName}_link`] = row.link;
          }

          if (row.variableName) {
            variables[row.variableName] = chosenValue;
          }

          return { nextStepId: row.nextStepId, variables };
        }
      }
      return null;
    }

    // Caso C: Resposta em Texto Livre (Fallback inteligente por número ou título)
    const textInput = (message.body || "").trim().toLowerCase();
    const rawText = (message.body || "").trim();

    // C.1 Se o passo atual possui botões
    if (currentStep.buttons && currentStep.buttons.length > 0) {
      for (let i = 0; i < currentStep.buttons.length; i++) {
        const btn = currentStep.buttons[i];
        const indexStr = String(i + 1);
        const title = (btn.title || "").toLowerCase();

        if (textInput === indexStr || textInput === title || textInput === btn.id.toLowerCase()) {
          const chosenValue = btn.value || btn.title || btn.id;
          const variables = {
            [varName]: chosenValue,
            [currentStep.id]: chosenValue,
          };
          if (btn.link) {
            variables.link = btn.link;
            variables[`${varName}_link`] = btn.link;
          }
          if (btn.variableName) {
            variables[btn.variableName] = chosenValue;
          }
          return { nextStepId: btn.nextStepId, variables };
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
            const chosenValue = row.value || row.title || row.id;
            const variables = {
              [varName]: chosenValue,
              [currentStep.id]: chosenValue,
            };
            if (row.link) {
              variables.link = row.link;
              variables[`${varName}_link`] = row.link;
            }
            if (row.variableName) {
              variables[row.variableName] = chosenValue;
            }
            return { nextStepId: row.nextStepId, variables };
          }
          globalIndex++;
        }
      }
    }

    // C.3 Se o passo atual é de texto que captura dados livres (ex: Nome) e tem próximo passo
    if (currentStep.type === "text" && currentStep.nextStepId) {
      const variables = {
        [varName]: rawText,
        [currentStep.id]: rawText,
      };
      return { nextStepId: currentStep.nextStepId, variables };
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

    let session = this.sessions.get(contactPhone);
    if (!session) {
      session = {
        flowId: flow.id,
        currentStepId: stepId,
        lastInteraction: Date.now(),
        context: {
          phone: contactPhone,
          telefone: contactPhone,
          contactPhone: contactPhone,
        },
      };
      this.sessions.set(contactPhone, session);
    } else {
      session.currentStepId = stepId;
      session.lastInteraction = Date.now();
      if (!session.context) {
        session.context = { phone: contactPhone, telefone: contactPhone };
      }
    }

    const context = session.context;
    let sendResult = null;

    try {
      // Interpolação dinâmica de variáveis no conteúdo antes do envio
      const interpolatedBody = this.interpolateVariables(step.body || "", context);
      const interpolatedHeader = step.header ? this.interpolateVariables(step.header, context) : null;
      const interpolatedFooter = step.footer ? this.interpolateVariables(step.footer, context) : null;

      switch (step.type) {
        case "interactive_buttons": {
          const interpolatedButtons = (step.buttons || []).map((btn) => ({
            ...btn,
            title: this.interpolateVariables(btn.title, context),
          }));

          sendResult = await metaApiClient.sendInteractiveButtons(
            contactPhone,
            interpolatedBody,
            interpolatedButtons,
            interpolatedHeader,
            interpolatedFooter
          );
          break;
        }

        case "interactive_list": {
          const interpolatedButtonTitle = this.interpolateVariables(step.buttonTitle || "Opções", context);
          const interpolatedSections = (step.sections || []).map((sec) => ({
            ...sec,
            title: this.interpolateVariables(sec.title || "", context),
            rows: (sec.rows || []).map((r) => ({
              ...r,
              title: this.interpolateVariables(r.title || "", context),
              description: r.description ? this.interpolateVariables(r.description, context) : undefined,
            })),
          }));

          sendResult = await metaApiClient.sendInteractiveList(
            contactPhone,
            interpolatedBody,
            interpolatedButtonTitle,
            interpolatedSections,
            interpolatedHeader,
            interpolatedFooter
          );
          break;
        }

        case "text":
        default:
          sendResult = await metaApiClient.sendTextMessage(contactPhone, interpolatedBody);
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
   * Obtém o contexto atual de variáveis de uma sessão
   * @param {string} contactPhone
   * @returns {object|null}
   */
  getSessionContext(contactPhone) {
    const session = this._getSession(contactPhone);
    return session ? { ...session.context } : null;
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
