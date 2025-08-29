// message.js - Versão Refatorada e Modular
const { client } = require("../client/client");
const {
  shouldIgnoreMessage,
  getChatInfo,
  logChatStats,
} = require("../utils/groupFilter");
const { antiSpamManager } = require("../utils/antiSpam");
const { messageTypeHandler } = require("../handlers/messageType");
const { debug } = require("../services/debugService");
const timeout = require("../utils/timeout");

// Importa os handlers específicos
const MenuHandler = require("../handlers/menuHandler");
const CityHandler = require("../handlers/cityHandler");
const TimeHandler = require("../handlers/timeHandler");
const NameHandler = require("../handlers/nameHandler");
const FaqHandler = require("../handlers/faqHandler");

// Estado global dos usuários
const userStates = {};

// Inicializa o anti-spam manager
(async () => {
  await antiSpamManager.initialize();
})();

/**
 * Handler principal de mensagens - Orquestrador
 */
module.exports = async function messageHandler(msg) {
  try {
    // 🛡️ Verificação 1: Filtro de grupos
    if (await shouldIgnoreGroups(msg)) return;

    // 📱 Verificação 2: Tipos de mensagem não suportados
    if (await handleUnsupportedMessages(msg)) return;

    // 🚫 Verificação 3: Anti-spam
    if (await handleAntiSpam(msg)) return;

    // 📋 Verificação 4: FAQ/Ajuda
    if (await handleFAQ(msg)) return;

    // 🔄 Verificação 5: Menu/Reinício
    if (await handleMenuTrigger(msg)) return;

    // 🎯 Roteamento baseado no estado do usuário
    await routeByUserState(msg);
  } catch (error) {
    console.error("Erro no messageHandler:", error);
    await handleError(msg, error);
  }
};

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
async function handleUnsupportedMessages(msg) {
  const unsupportedResult = await messageTypeHandler.processMessage(
    client,
    msg
  );

  if (unsupportedResult.handled) {
    await debug(
      `📱 Mensagem não suportada tratada: ${unsupportedResult.action}`
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
async function handleAntiSpam(msg) {
  const userNumber = msg.from;

  if (antiSpamManager.isUserSuspended(userNumber)) {
    const remainingMinutes =
      antiSpamManager.getSuspensionTimeRemaining(userNumber);
    await antiSpamManager.handleSpamAction(client, msg, "suspended", {
      remainingMinutes,
    });
    return true;
  }
  return false;
}

/**
 * Verifica e trata solicitações de FAQ
 */
async function handleFAQ(msg) {
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
async function handleMenuTrigger(msg) {
  const menuHandlerInstance = new MenuHandler();
  const userNumber = msg.from;

  if (await menuHandlerInstance.shouldHandle(msg, userStates[userNumber])) {
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
async function routeByUserState(msg) {
  const userNumber = msg.from;
  const currentState = userStates[userNumber];

  if (!currentState) {
    // Usuário sem estado - ignora mensagem ou oferece ajuda
    return;
  }

  const { chat, name } = await getBasicMessageInfo(msg);

  switch (currentState.step) {
    case "awaiting_city":
      await handleCitySelection(msg, userNumber, chat, name);
      break;

    case "awaiting_time":
      await handleTimeSelection(msg, userNumber, chat, name);
      break;

    case "awaiting_name":
      await handleNameInput(msg, userNumber, chat, name);
      break;

    default:
      console.warn(`Estado desconhecido: ${currentState.step}`);
      break;
  }
}

/**
 * Trata seleção de cidade
 */
async function handleCitySelection(msg, userNumber, chat, name) {
  const cityHandlerInstance = new CityHandler();

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
async function handleTimeSelection(msg, userNumber, chat, name) {
  const timeHandlerInstance = new TimeHandler();

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
async function handleNameInput(msg, userNumber, chat, name) {
  const nameHandlerInstance = new NameHandler();

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
async function handleError(msg, error) {
  const userNumber = msg.from;

  try {
    await msg.reply(
      "⚠️ Ocorreu um erro inesperado. Por favor, tente novamente digitando *MENU* ou *AJUDA*."
    );
  } catch (replyError) {
    console.error("Erro ao enviar mensagem de erro:", replyError);
  }

  // Limpa estados em caso de erro
  timeout.cancelTimeout(userNumber);
  delete userStates[userNumber];
}
