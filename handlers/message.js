// handlers/message.js - Versão Multi-Instância
const { instanceManager } = require("../services/instanceManager");
const {
  shouldIgnoreMessage,
  getChatInfo,
  logChatStats,
} = require("../utils/groupFilter");
const { antiSpamManager } = require("../utils/antiSpam");
const { messageTypeHandler } = require("../handlers/unsuportedMessage");
const { debug } = require("../services/debugService");
const timeout = require("../utils/timeout");
const { sendMessageOptions } = require("../config/compatibility/whatsappCompatibility");

// Importa os handlers específicos
const MenuHandler = require("../handlers/menuHandler");
const CityHandler = require("../handlers/cityHandler");
const TimeHandler = require("../handlers/timeHandler");
const NameHandler = require("../handlers/nameHandler");
const FaqHandler = require("../handlers/faqHandler");

// Estado global dos usuários (agora por instância)
// Estrutura: { instanceId: { userNumber: { step, data, ... } } }
const instanceUserStates = {};

/**
 * Obtém o estado dos usuários para uma instância específica
 * @param {string} instanceId - ID da instância
 * @returns {Object} Estado dos usuários da instância
 */
function getUserStates(instanceId) {
  if (!instanceUserStates[instanceId]) {
    instanceUserStates[instanceId] = {};
  }
  return instanceUserStates[instanceId];
}

/**
 * Limpa o estado de um usuário em uma instância
 * @param {string} instanceId - ID da instância
 * @param {string} userNumber - Número do usuário
 */
function clearUserState(instanceId, userNumber) {
  const userStates = getUserStates(instanceId);
  delete userStates[userNumber];
}

/**
 * Obtém o cliente de uma instância
 * @param {string} instanceId - ID da instância
 * @returns {Client|null} Cliente WhatsApp
 */
function getClient(instanceId) {
  return instanceManager.getClient(instanceId);
}

// 🔎 Identifica erros esperados (com fallback) para não acionar o handler geral
function isExpectedFallbackError(err) {
  try {
    const code = err?.code || "";
    const message = (err?.message || String(err || "")).toString();

    // Padrões que representam "erro esperado" vindo do messageReader ou templates
    const fallbackPatterns = [
      /\[ERRO:/,
      /Mensagem do tipo .*n(?:ã|a)o encontrada/i,
      /n.?o encontrada.*fallback/i,
      /MESSAGE(_| )?NOT(_| )?FOUND/i,
      /NO(_| )?TEMPLATE/i,
      /NO(_| )?MESSAGE/i,
      /mensagem (não|nao) cadastrada/i,
    ];

    return (
      err?.isFallback === true || fallbackPatterns.some((p) => p.test(message))
    );
  } catch {
    return false;
  }
}

// Inicializa o anti-spam manager
(async () => {
  await antiSpamManager.initialize();
})();

/**
 * Handler principal de mensagens - Orquestrador
 * @param {Message} msg - Mensagem recebida
 * @param {string} instanceId - ID da instância que recebeu a mensagem
 */
async function messageHandler(msg, instanceId) {
  // Obtém o cliente da instância
  const client = getClient(instanceId);

  if (!client) {
    console.error(
      `[${instanceId}] Cliente não encontrado para processar mensagem`
    );
    return;
  }

  // Obtém o estado dos usuários desta instância
  const userStates = getUserStates(instanceId);

  try {
    // 🛡️ Verificação 1: Filtro de grupos
    if (await shouldIgnoreGroups(msg)) return;

    // 📱 Verificação 2: Tipos de mensagem não suportados
    if (await handleUnsupportedMessages(msg, client, instanceId)) return;

    // 🚫 Verificação 3: Anti-spam
    if (await handleAntiSpam(msg, client)) return;

    // 📋 Verificação 4: FAQ/Ajuda
    if (await handleFAQ(msg, client, instanceId, userStates)) return;

    // 🔄 Verificação 5: Menu/Reinício
    if (await handleMenuTrigger(msg, client, instanceId, userStates)) return;

    // 🎯 Roteamento baseado no estado do usuário
    await routeByUserState(msg, client, instanceId, userStates);
  } catch (error) {
    // ⛒️ Não notifica usuário nem limpa estado em erros com fallback esperado
    if (isExpectedFallbackError(error)) {
      await debug(
        `[${instanceId}] ℹ️ Erro esperado com fallback aplicado; não notificar usuário.`
      );
      return;
    }

    console.error(`[${instanceId}] Erro no messageHandler:`, error);
    await handleError(msg, error, instanceId, userStates);
  }
}

/**
 * Verifica e ignora mensagens de grupos
 */
async function shouldIgnoreGroups(msg) {
  const shouldIgnore = await shouldIgnoreMessage(msg);
  if (shouldIgnore) {
    const chatInfo = await getChatInfo(msg);
    logChatStats(chatInfo);
    return true;
  }

  await debug("✅ Mensagem aceita para processamento - conversa privada");
  return false;
}

/**
 * Trata mensagens de tipos não suportados
 */
async function handleUnsupportedMessages(msg, client, instanceId) {
  const unsupportedResult = await messageTypeHandler.processMessage(
    client,
    msg
  );

  if (unsupportedResult.handled) {
    await debug(
      `[${instanceId}] 📱 Mensagem não suportada tratada: ${unsupportedResult.action}`
    );

    if (unsupportedResult.action === "suspended") {
      const { chat, userNumber, name } = await getBasicMessageInfo(msg);
      await timeout.startTimeout(client, userNumber, chat, name);
    }
    return true;
  }
  return false;
}

/**
 * Verifica e trata anti-spam
 */
async function handleAntiSpam(msg, client) {
  const userNumber = msg.from;

  if (antiSpamManager.isUserSuspended(userNumber)) {
    // Verifica quantas vezes já enviou a mensagem de suspenso
    const timeoutInfo = timeout.getTimeoutInfo(userNumber);

    // Se já enviou 2 ou mais mensagens, não envia mais nada
    if (timeoutInfo && timeoutInfo.count >= 2) {
      await debug(`[ANTI-SPAM] Usuário ${userNumber} em silêncio (limite atingido)`);
      return true; // Retorna true para bloquear o processamento, mas não envia mensagem
    }

    const remainingMinutes =
      antiSpamManager.getSuspensionTimeRemaining(userNumber);
    await antiSpamManager.handleSpamAction(client, msg, "suspended", {
      remainingMinutes,
    });

    // Incrementa o contador de mensagens enviadas
    const currentInfo = timeout.getTimeoutInfo(userNumber);
    if (currentInfo) {
      currentInfo.count++;
    } else {
      // Cria entrada se não existir (usando a estrutura interna do timeout.js)
      // Vamos criar uma função no timeout.js para isso
      timeout.incrementTimeoutCount(userNumber);
    }

    return true;
  }
  return false;
}

/**
 * Verifica e trata solicitações de FAQ
 */
async function handleFAQ(msg, client, instanceId, userStates) {
  const faqHandlerInstance = new FaqHandler();

  if (await faqHandlerInstance.shouldHandle(msg)) {
    await faqHandlerInstance.process(client, msg);

    const { chat, userNumber, name } = await getBasicMessageInfo(msg);
    await timeout.startTimeout(client, userNumber, chat, name);
    return true;
  }
  return false;
}

/**
 * Verifica triggers de menu/reinício
 */
async function handleMenuTrigger(msg, client, instanceId, userStates) {
  const menuHandlerInstance = new MenuHandler();
  const userNumber = msg.from;

  if (await menuHandlerInstance.shouldHandle(msg, userStates[userNumber])) {
    // Reset do contador de timeout quando usuário interage
    timeout.resetTimeoutCount(userNumber);

    await menuHandlerInstance.process(client, msg, userStates, userNumber);

    const { chat, name } = await getBasicMessageInfo(msg);
    await timeout.startTimeout(client, userNumber, chat, name);
    return true;
  }
  return false;
}

/**
 * Roteia mensagem baseado no estado atual do usuário
 */
async function routeByUserState(msg, client, instanceId, userStates) {
  const userNumber = msg.from;
  const currentState = userStates[userNumber];

  if (!currentState) {
    // Usuário sem estado - ignora mensagem ou oferece ajuda
    return;
  }

  const { chat, name } = await getBasicMessageInfo(msg);

  switch (currentState.step) {
    case "awaiting_city":
      await handleCitySelection(
        msg,
        client,
        userNumber,
        chat,
        name,
        userStates
      );
      break;

    case "awaiting_time":
      await handleTimeSelection(
        msg,
        client,
        userNumber,
        chat,
        name,
        userStates
      );
      break;

    case "awaiting_name":
      await handleNameInput(msg, client, userNumber, chat, name, userStates);
      break;

    default:
      console.warn(`[${instanceId}] Estado desconhecido: ${currentState.step}`);
      break;
  }
}

/**
 * Trata seleção de cidade
 */
async function handleCitySelection(
  msg,
  client,
  userNumber,
  chat,
  name,
  userStates
) {
  const cityHandlerInstance = new CityHandler();

  // Reset do contador de timeout quando usuário interage
  timeout.resetTimeoutCount(userNumber);

  await cityHandlerInstance.process(
    client,
    msg,
    userStates,
    userNumber,
    antiSpamManager
  );

  await timeout.startTimeout(client, userNumber, chat, name);
}

/**
 * Trata seleção de horário
 */
async function handleTimeSelection(
  msg,
  client,
  userNumber,
  chat,
  name,
  userStates
) {
  const timeHandlerInstance = new TimeHandler();

  // Reset do contador de timeout quando usuário interage
  timeout.resetTimeoutCount(userNumber);

  await timeHandlerInstance.process(
    client,
    msg,
    userStates,
    userNumber,
    antiSpamManager
  );

  await timeout.startTimeout(client, userNumber, chat, name);
}

/**
 * Trata entrada do nome
 */
async function handleNameInput(
  msg,
  client,
  userNumber,
  chat,
  name,
  userStates
) {
  const nameHandlerInstance = new NameHandler();

  // Reset do contador de timeout quando usuário interage
  timeout.resetTimeoutCount(userNumber);

  await nameHandlerInstance.process(
    client,
    msg,
    userStates,
    userNumber,
    antiSpamManager
  );

  // nameHandler gerencia seu próprio timeout/cleanup
}

/**
 * Extrai informações básicas da mensagem
 */
async function getBasicMessageInfo(msg) {
  const chat = await msg.getChat();
  const userNumber = msg.from;
  const contact = await msg.getContact();
  const name = contact.pushname?.split(" ")[0] || "";

  return { chat, userNumber, name };
}

/**
 * Trata erros gerais
 */
async function handleError(msg, error, instanceId, userStates) {
  const userNumber = msg.from;

  // 🚧 Não tratar como erro fatal se for de fallback esperado
  if (isExpectedFallbackError(error)) {
    await debug(
      `[${instanceId}] ⚠️ handleError ignorado: erro com fallback reconhecido.`
    );
    return;
  }

  try {
    await msg.reply(
      "⚠️ Ocorreu um erro inesperado. Por favor, tente novamente digitando *MENU* ou *AJUDA*.",
      msg.from,
      sendMessageOptions
    );
  } catch (replyError) {
    console.error(
      `[${instanceId}] Erro ao enviar mensagem de erro:`,
      replyError
    );
  }

  // Limpa estados em caso de erro
  timeout.cancelTimeout(userNumber);
  delete userStates[userNumber];
}

// ========================================
// Exportações
// ========================================

module.exports = messageHandler;

// Exporta funções auxiliares para uso externo se necessário
module.exports.getUserStates = getUserStates;
module.exports.clearUserState = clearUserState;
module.exports.instanceUserStates = instanceUserStates;
