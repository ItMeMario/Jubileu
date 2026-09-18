// client/flowExecutor.js
// Motor de Execução de Fluxos Interativos e Chatbot para Meta WhatsApp Cloud API

const { metaApiClient, normalizePhoneNumber } = require("./metaApiClient");
const { flowService } = require("../services/flowService");
const { window24hService } = require("../services/window24hService");
const { antiLoopService } = require("../services/antiLoopService");
const { syncService } = require("../services/syncService");

// Tempo limite de expiração da sessão ativa: 30 minutos
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

    const normalizeStr = (str) =>
      String(str || "")
        .replace(/[{}]/g, "")
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

    return templateText.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, rawKey) => {
      const key = rawKey.trim();

      // 1. Busca direta por chave exata (ex: "cidade")
      if (context[key] !== undefined && context[key] !== null && context[key] !== "") {
        return String(context[key]);
      }

      // 2. Busca por chave envolvida por chaves (ex: "{{cidade}}")
      if (context[`{{${key}}}`] !== undefined && context[`{{${key}}}`] !== null && context[`{{${key}}}`] !== "") {
        return String(context[`{{${key}}}`]);
      }

      // 3. Busca normalizada: case-insensitive, sem acentos e sem chaves
      const targetNormalized = normalizeStr(key);
      for (const [k, v] of Object.entries(context)) {
        if (normalizeStr(k) === targetNormalized && v !== undefined && v !== null && v !== "") {
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

    // 🛡️ PROTEÇÃO ANTI-LOOP & GUERRA DE ROBÔS (Bot vs Bot - Vulnerabilidade #2)
    const antiLoopResult = antiLoopService.checkAndRecordInbound(contactPhone, message.body, activeFlow);
    if (!antiLoopResult.allowed) {
      if (antiLoopResult.triggeredNow) {
        console.warn(
          `🛑 [ANTI-LOOP TRIGGERED] Alerta de Loop Infinito detectado para o contato ${contactPhone}! Motivo: ${antiLoopResult.reason}. Ação: ${antiLoopResult.action}. Cooldown ativado por 15 minutos.`
        );

        // Encerra sessão ativa para liberar o estado em loop
        this.resetSession(contactPhone);

        // Dispara evento para o barramento / painel
        syncService.emit("bot:anti_loop_triggered", {
          phone: contactPhone,
          reason: antiLoopResult.reason,
          action: antiLoopResult.action,
          cooldownUntil: Date.now() + (antiLoopResult.remainingMs || 15 * 60 * 1000),
          remainingMs: antiLoopResult.remainingMs,
        });

        // Se a ação for "notify_and_pause", envia a mensagem amigável uma única vez
        if (antiLoopResult.action === "notify_and_pause" && antiLoopResult.message) {
          try {
            await metaApiClient.sendTextMessage(contactPhone, antiLoopResult.message);
          } catch (err) {
            console.error(`❌ Erro ao enviar mensagem amigável de anti-loop para ${contactPhone}:`, err.message);
          }
        }

        return {
          handled: true,
          actionTaken:
            antiLoopResult.action === "notify_and_pause"
              ? "ANTI_LOOP_NOTIFIED_AND_PAUSED"
              : "ANTI_LOOP_SILENT_PAUSED",
          antiLoop: true,
          reason: antiLoopResult.reason,
        };
      } else {
        // Contato já em cooldown ativo: descarte silencioso estrito (zero envio à Meta)
        console.log(
          `⏳ [ANTI-LOOP] Contato ${contactPhone} em cooldown de proteção (${Math.ceil((antiLoopResult.remainingMs || 0) / 1000)}s restantes). Mensagem ignorada.`
        );
        return {
          handled: false,
          antiLoop: true,
          reason: antiLoopResult.reason || "CONTACT_IN_COOLDOWN",
          remainingMs: antiLoopResult.remainingMs,
        };
      }
    }

    // 1. Tratamento de mensagens fora do padrão (imagens, vídeos, áudios, documentos, stickers, etc.)
    const outOfPattern = activeFlow.outOfPatternConfig;
    const msgType = message.type || "text";
    const isConfiguredOutOfPattern =
      outOfPattern &&
      outOfPattern.enabled &&
      Array.isArray(outOfPattern.types) &&
      outOfPattern.types.includes(msgType);

    if (isConfiguredOutOfPattern) {
      console.log(`⚠️ [OUT_OF_PATTERN] Mensagem fora do padrão recebida de ${contactPhone} (Tipo: ${msgType}). Aplicando resposta programada...`);

      const defaultWarning = "Desculpe, nosso atendimento automático não aceita este tipo de arquivo ou mídia. Por favor, utilize as opções abaixo para prosseguirmos: 👇";
      const warningText = outOfPattern.message || defaultWarning;
      const context = session?.context || { phone: contactPhone, telefone: contactPhone };
      const interpolatedWarning = this.interpolateVariables(warningText, context);

      // Envia a mensagem de aviso programada
      await metaApiClient.sendTextMessage(contactPhone, interpolatedWarning);

      // Pausa estratégica de 800ms para ordenação natural das mensagens no WhatsApp
      await sleep(800);

      // Decisão de retomada: reiniciar fluxo ou retomar o passo atual
      const action = outOfPattern.action || "resume";
      const initialStepId = activeFlow.initialStepId || Object.keys(activeFlow.steps || {})[0];

      if (action === "restart" || !session || !session.currentStepId) {
        session = {
          flowId: activeFlow.id,
          currentStepId: null,
          lastInteraction: Date.now(),
          context: {
            phone: contactPhone,
            telefone: contactPhone,
            contactPhone: contactPhone,
            ...(session?.context || {}),
          },
        };
        this.sessions.set(contactPhone, session);
        return this._executeStep(contactPhone, activeFlow, initialStepId);
      } else {
        // Retoma o passo atual onde o cliente já estava
        return this._executeStep(contactPhone, activeFlow, session.currentStepId);
      }
    }

    // 2. Verifica se a mensagem de entrada aciona o gatilho de início/reinício de fluxo
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
      // Zera contador de fallbacks ao avançar com sucesso
      antiLoopService.resetFallback(contactPhone);

      // Salva as variáveis capturadas nesta etapa no contexto da sessão
      if (resolution.variables) {
        Object.assign(session.context, resolution.variables);
      }
      return this._executeStep(contactPhone, activeFlow, resolution.nextStepId);
    } else {
      // 🛡️ Fallback: Resposta não reconhecida para o menu atual
      const fallbackCheck = antiLoopService.recordFallback(contactPhone, activeFlow);

      if (fallbackCheck.triggered) {
        console.warn(
          `🛑 [ANTI-LOOP FALLBACK] Limite de ${fallbackCheck.count} respostas inválidas consecutivas atingido para ${contactPhone}. Ação: ${fallbackCheck.action}.`
        );

        this.resetSession(contactPhone);

        syncService.emit("bot:anti_loop_triggered", {
          phone: contactPhone,
          reason: fallbackCheck.reason,
          action: fallbackCheck.action,
          cooldownUntil: Date.now() + (fallbackCheck.remainingMs || 15 * 60 * 1000),
          remainingMs: fallbackCheck.remainingMs,
        });

        if (fallbackCheck.action === "notify_and_pause" && fallbackCheck.message) {
          try {
            await metaApiClient.sendTextMessage(contactPhone, fallbackCheck.message);
          } catch (err) {
            console.error(`❌ Erro ao enviar mensagem amigável de fallback para ${contactPhone}:`, err.message);
          }
        }

        return {
          handled: true,
          actionTaken:
            fallbackCheck.action === "notify_and_pause"
              ? "FALLBACK_LIMIT_NOTIFIED_AND_PAUSED"
              : "FALLBACK_LIMIT_SILENT_PAUSED",
          antiLoop: true,
          reason: fallbackCheck.reason,
        };
      }

      console.log(
        `ℹ️ Resposta não reconhecida de ${contactPhone} (Tentativa ${fallbackCheck.count}/${activeFlow.antiLoopConfig?.maxFallbacks || 3}). Reenviando opções...`
      );
      return this._executeStep(contactPhone, activeFlow, session.currentStepId);
    }
  }

  /**
   * Constrói mapa de variáveis da etapa garantindo compatibilidade com ou sem chaves
   * @private
   */
  _buildStepVariables(currentStep, chosenValue, itemLink = null, itemVarName = null) {
    const rawVarName = currentStep.variableName || currentStep.id;
    const cleanVarName = String(rawVarName).replace(/[{}]/g, "").trim();

    const variables = {
      [cleanVarName]: chosenValue,
      [rawVarName]: chosenValue,
      [currentStep.id]: chosenValue,
    };

    if (itemLink) {
      variables.link = itemLink;
      variables[`${cleanVarName}_link`] = itemLink;
      variables[`${rawVarName}_link`] = itemLink;
    }

    if (itemVarName) {
      const cleanItemVar = String(itemVarName).replace(/[{}]/g, "").trim();
      variables[cleanItemVar] = chosenValue;
      variables[itemVarName] = chosenValue;
    }

    return variables;
  }

  /**
   * Determina qual o próximo passo e extrai variáveis da escolha do usuário
   * @private
   * @returns {{ nextStepId: string, variables: object }|null}
   */
  _resolveNextStep(message, currentStep) {
    // Caso A: Clique em Botão de Resposta Rápida (button_reply)
    if (message.interactiveType === "button_reply" && message.buttonReply?.id) {
      const clickedId = message.buttonReply.id;
      const button = (currentStep.buttons || []).find((b) => b.id === clickedId);
      if (button) {
        const chosenValue = button.value || button.title || button.id;
        const variables = this._buildStepVariables(currentStep, chosenValue, button.link, button.variableName);
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
          const variables = this._buildStepVariables(currentStep, chosenValue, row.link, row.variableName);
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
          const variables = this._buildStepVariables(currentStep, chosenValue, btn.link, btn.variableName);
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
            const variables = this._buildStepVariables(currentStep, chosenValue, row.link, row.variableName);
            return { nextStepId: row.nextStepId, variables };
          }
          globalIndex++;
        }
      }
    }

    // C.3 Se o passo atual é de texto que captura dados livres (ex: Nome) e tem próximo passo
    if (currentStep.type === "text" && currentStep.nextStepId) {
      const variables = this._buildStepVariables(currentStep, rawText);
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
    antiLoopService.resetFallback(phone);
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
