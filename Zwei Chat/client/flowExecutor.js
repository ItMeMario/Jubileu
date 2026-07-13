// client/flowExecutor.js
const flowService = require("../services/flowService");
const { debug } = require("../services/debugService");
const { matchMenuOption } = require("../utils/matchHelper");
const { calculateDelayMs } = require("../utils/delayHelper");

// Mapa de sessões ativas: `${clientId}:${senderId}` => { flowId, stepIndex, lastInteraction }
const sessions = new Map();

// Tempo limite de expiração de sessão: 30 minutos
const SESSION_TIMEOUT = 30 * 60 * 1000;

/**
 * Verifica se o remetente é um número de alguma de nossas instâncias (Bot, Drone ou Dee Jay)
 * para evitar loops de conversas automáticas.
 * @param {string} fromJid
 * @returns {boolean}
 */
function isLinkedNumber(fromJid) {
  if (!fromJid) return false;
  const rawNumber = fromJid.split("@")[0];

  try {
    // 1. Clientes do Bot Principal (Zwei Chat)
    const clientModule = require("./client");
    if (clientModule && clientModule.clients) {
      for (const [instanceId, clientInstance] of clientModule.clients.entries()) {
        const userNumber = clientInstance?.info?.wid?.user;
        if (userNumber === rawNumber) return true;
      }
    }

    // 2. Instâncias do Dee Jay
    const deeJayService = require("../services/deeJayService");
    const deeJayStatuses = deeJayService.getConnectedInstances();
    if (
      deeJayStatuses.some((inst) => {
        const client = inst.client;
        return client?.info?.wid?.user === rawNumber;
      })
    ) {
      return true;
    }

    // 3. Instâncias do Drone (Disparador)
    const droneService = require("../services/droneService");
    const droneStatuses = droneService.getConnectedInstances();
    if (
      droneStatuses.some((inst) => {
        const client = inst.client;
        return client?.info?.wid?.user === rawNumber;
      })
    ) {
      return true;
    }
  } catch (error) {
    console.error("Erro ao verificar números vinculados no FlowExecutor:", error);
  }

  return false;
}

/**
 * Função principal para processar mensagens de entrada
 * @param {object} msg - Objeto de mensagem do whatsapp-web.js
 * @param {object} clientInstance - Instância do cliente WhatsApp
 */
async function handleIncomingMessage(msg, clientInstance) {
  const senderId = msg.from;
  const bodyText = (msg.body || "").trim();
  const clientId = clientInstance.clientId;
  const sessionKey = `${clientId}:${senderId}`;

  // Ignora mensagens vazias ou de grupo (se o bot for apenas privado)
  // O Zwei Chat Lite é tipicamente focado em chats privados.
  // Vamos verificar se a mensagem vem de um grupo: grupos terminam com @g.us
  if (!bodyText || senderId.endsWith("@g.us")) {
    return;
  }

  // 🛡️ Prevenção de Loops: Ignora mensagens de outros chips vinculados (Bot, Drone, Dee Jay)
  if (isLinkedNumber(senderId)) {
    await debug(`[FlowExecutor] Ignorando mensagem de número vinculado/próprio: ${senderId}`);
    return;
  }

  const now = Date.now();
  let session = sessions.get(sessionKey);

  // Verifica se a sessão expirou
  if (session && now - session.lastInteraction > SESSION_TIMEOUT) {
    await debug(`[FlowExecutor] Sessão de ${senderId} na instância ${clientId} expirou por inatividade.`);
    sessions.delete(sessionKey);
    session = null;
  }

  // Carrega todos os fluxos do banco
  const allFlows = await flowService.getFlows();
  const activeFlows = allFlows.filter((f) => f.active);

  if (!session) {
    // 🔍 Nenhuma sessão ativa: tentar encontrar um fluxo pelo Gatilho
    let matchedFlow = null;
    let fallbackFlow = null;

    for (const flow of activeFlows) {
      const trigger = flow.definition.trigger || {};
      const type = trigger.type || "exact";
      const keywords = trigger.keywords || [];

      if (type === "all") {
        fallbackFlow = flow; // Salva como opção se nenhum outro casar
        continue;
      }

      const match = keywords.some((kw) => {
        const cleanKw = kw.toLowerCase().trim();
        if (!cleanKw) return false;

        if (type === "exact") {
          return bodyText.toLowerCase() === cleanKw;
        } else if (type === "contains") {
          return bodyText.toLowerCase().includes(cleanKw);
        } else if (type === "starts_with") {
          return bodyText.toLowerCase().startsWith(cleanKw);
        }
        return false;
      });

      if (match) {
        matchedFlow = flow;
        break;
      }
    }

    // Se não encontrou gatilho específico, usa o fallback (tipo "all") se existir
    const flowToExecute = matchedFlow || fallbackFlow;

    if (flowToExecute) {
      await debug(`[FlowExecutor] Iniciando fluxo '${flowToExecute.name}' para ${senderId} na instância ${clientId}`);
      session = {
        flowId: flowToExecute.id,
        stepIndex: 0,
        lastInteraction: now,
      };
      sessions.set(sessionKey, session);

      await executeFlowSteps(clientInstance, msg, flowToExecute, session);
    }
  } else {
    // 🔗 Sessão ativa: processar resposta do passo atual (geralmente options_menu)
    const flow = activeFlows.find((f) => f.id === session.flowId);
    if (!flow) {
      // Fluxo foi desativado ou removido, remove sessão
      sessions.delete(sessionKey);
      return;
    }

    const steps = flow.definition.steps || [];
    const currentStep = steps[session.stepIndex];

    if (currentStep && currentStep.type === "options_menu") {
      const options = currentStep.options || [];
      
      // Procura se a mensagem corresponde a alguma opção de forma inteligente
      const matchedOption = matchMenuOption(bodyText, options, currentStep.text);

      if (matchedOption) {
        await debug(`[FlowExecutor] Contato ${senderId} escolheu a opção: ${matchedOption.keyword} na instância ${clientId}`);
        
        // Envia a resposta da opção
        if (matchedOption.reply) {
          await sendReply(clientInstance, senderId, matchedOption.reply);
        }

        // Avança para o próximo passo do fluxo
        session.stepIndex += 1;
        session.lastInteraction = Date.now();

        // Continua executando os passos seguintes
        await executeFlowSteps(clientInstance, msg, flow, session);
      } else {
        await debug(`[FlowExecutor] Opção inválida digitada por ${senderId}: "${bodyText}" na instância ${clientId}`);
        
        // Envia mensagem de erro/fallback configurada no menu
        const fallbackText = currentStep.fallback || "Opção inválida. Por favor, selecione uma das opções válidas.";
        await sendReply(clientInstance, senderId, fallbackText);
        
        // Mantém o contato no mesmo passo esperando input válido
        session.lastInteraction = Date.now();
      }
    } else {
      // Se por algum motivo o passo atual não exigir interação, reseta a sessão
      sessions.delete(sessionKey);
    }
  }
}

/**
 * Executa sequencialmente os passos do fluxo a partir do stepIndex atual
 */
async function executeFlowSteps(clientInstance, msg, flow, session) {
  const steps = flow.definition.steps || [];
  const senderId = msg.from;
  const clientId = clientInstance.clientId;
  const sessionKey = `${clientId}:${senderId}`;

  while (session.stepIndex < steps.length) {
    const step = steps[session.stepIndex];
    await debug(`[FlowExecutor] Executando bloco ${session.stepIndex + 1}/${steps.length} (${step.type}) para ${senderId} na instância ${clientId}`);

    if (step.type === "send_message") {
      // 💬 Enviar Mensagem de Texto
      const delayMs = calculateDelayMs(step.delay);
      if (delayMs > 0) {
        await simulateDelayMs(delayMs);
      }
      await sendReply(clientInstance, senderId, step.text);
      session.stepIndex += 1;
      session.lastInteraction = Date.now();
    } else if (step.type === "options_menu") {
      // 📋 Enviar o menu de opções e parar. Aguarda a resposta no handleIncomingMessage.
      const delayMs = calculateDelayMs(step.delay);
      if (delayMs > 0) {
        await simulateDelayMs(delayMs);
      }
      await sendReply(clientInstance, senderId, step.text);
      
      // Fica parado neste step aguardando input do usuário
      return;
    } else {
      // Tipo desconhecido, pula
      session.stepIndex += 1;
    }
  }

  // Fim do fluxo: encerra a sessão
  await debug(`[FlowExecutor] Fluxo '${flow.name}' concluído com sucesso para ${senderId} na instância ${clientId}`);
  sessions.delete(sessionKey);
}

/**
 * Simula um atraso de digitação (delay) em milissegundos
 */
function simulateDelayMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Envia uma mensagem usando o cliente do WhatsApp Web
 */
async function sendReply(clientInstance, to, text) {
  try {
    if (clientInstance && clientInstance.info) {
      await clientInstance.sendMessage(to, text);
    } else {
      await debug(`⚠️ Não foi possível enviar mensagem: Cliente WhatsApp não está conectado.`);
    }
  } catch (error) {
    console.error(`❌ Erro ao enviar mensagem para ${to}:`, error);
  }
}

module.exports = {
  handleIncomingMessage,
  sessions,
};
