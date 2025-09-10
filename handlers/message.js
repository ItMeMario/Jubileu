// message.js - Versão Refatorada e Modular com Sistema de Reminder
const { client } = require("../client/client");
const {
  shouldIgnoreMessage,
  getChatInfo,
  logChatStats,
} = require("../utils/groupFilter");
const { antiSpamManager } = require("../utils/antiSpam");
const { messageTypeHandler } = require("../handlers/unsuportedMessage");
const { debug } = require("../services/debugService");
const timeout = require("../utils/timeout");
const { reminderSystem } = require("../utils/reminder");

// Importa os handlers específicos
const MenuHandler = require("../handlers/menuHandler");
const CityHandler = require("../handlers/cityHandler");
const TimeHandler = require("../handlers/timeHandler");
const NameHandler = require("../handlers/nameHandler");
const FaqHandler = require("../handlers/faqHandler");

// Estado global dos usuários
const userStates = {};

// 🔎 Identifica erros esperados (com fallback) para não acionar o handler geral
function isExpectedFallbackError(err) {
  try {
    const code = err?.code || "";
    const message = (err?.message || String(err || "")).toString();

    // Padrões que representam "erro esperado" vindo do messageReader ou templates
    const fallbackPatterns = [
      /\[ERRO:/, // seu sistema antigo que marca erros de template com [ERRO:
      /Mensagem do tipo .*n(?:ã|a)o encontrada/i, // "Mensagem do tipo '...' não encontrada ..." (pt-BR)
      /n.?o encontrada.*fallback/i, // versão com possível quebra/encoding: "nâ"œÃºo encontrada ... fallback"
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
 */
module.exports = async function messageHandler(msg) {
  try {
    // 🛡️ Verificação 1: Filtro de grupos (com exceção para reminder)
    if (await shouldIgnoreGroups(msg)) return;

    // 📱 Verificação 2: Tipos de mensagem não suportados
    if (await handleUnsupportedMessages(msg)) return;

    // 🚫 Verificação 3: Anti-spam
    if (await handleAntiSpam(msg)) return;

    // 🔔 Verificação 4: Comandos de reminder
    if (await handleReminder(msg)) return;

    // 📋 Verificação 5: FAQ/Ajuda
    if (await handleFAQ(msg)) return;

    // 🔄 Verificação 6: Menu/Reinício
    if (await handleMenuTrigger(msg)) return;

    // 🎯 Roteamento baseado no estado do usuário
    await routeByUserState(msg);
  } catch (error) {
    // ⛔️ Não notifica usuário nem limpa estado em erros com fallback esperado
    if (isExpectedFallbackError(error)) {
      await debug(
        "ℹ️ Erro esperado com fallback aplicado; não notificar usuário."
      );
      return;
    }

    console.error("Erro no messageHandler:", error);
    await handleError(msg, error);
  }
};

/**
 * Verifica e ignora mensagens de grupos (COM EXCEÇÃO para comandos de reminder)
 */
async function shouldIgnoreGroups(msg) {
  // 🎯 EXCEÇÃO: Permite comandos de reminder em grupos
  if (reminderSystem.constructor.isReminderCommand(msg)) {
    await debug("🔔 Comando de reminder detectado - processando em grupo");
    return false; // Não ignorar, processar o comando
  }

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
 * Verifica e trata comandos de reminder
 */
async function handleReminder(msg) {
  if (reminderSystem.constructor.isReminderCommand(msg)) {
    await debug("🔔 Processando comando de reminder");

    try {
      const success = await reminderSystem.handleReminderCommand(client, msg);

      if (success) {
        await debug("✅ Comando de reminder processado com sucesso");
      } else {
        await debug("⚠️ Comando de reminder processado com avisos");
      }
    } catch (error) {
      console.error("❌ Erro ao processar comando de reminder:", error);
      await debug(`❌ Erro no comando de reminder: ${error.message}`);
    }

    return true; // Sempre retorna true para comandos de reminder (processado ou com erro)
  }

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

  // 🚧 Não tratar como erro fatal se for de fallback esperado
  if (isExpectedFallbackError(error)) {
    await debug("⚠️ handleError ignorado: erro com fallback reconhecido.");
    return;
  }

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

// 🔔 LISTENER DE TESTE PARA REMINDER (temporário para debug)
client.on("message", async (msg) => {
  const text = msg.body.toLowerCase().trim();

  if (text === "!reminder" || text === "!lembrete") {
    console.log("🔔 LISTENER DE TESTE - COMANDO REMINDER DETECTADO!");

    try {
      const chat = await msg.getChat();
      console.log(
        `📱 Chat: ${chat.name} | Grupo: ${chat.isGroup} | ID: ${chat.id._serialized}`
      );

      if (chat.isGroup) {
        console.log("🎯 Processando reminder via listener de teste...");
        await reminderSystem.handleReminderCommand(client, msg);
      } else {
        await msg.reply("⚠️ Este comando só funciona em grupos!");
      }
    } catch (error) {
      console.error("❌ Erro no listener de teste:", error);
      await msg.reply("❌ Erro no teste do reminder");
    }
  }
});


