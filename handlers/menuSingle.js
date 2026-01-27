// menuSingle.js
const indicadores = require("../utils/indicadores");
const messageReader = require("../utils/messageReader");
const delay = require("../utils/delay");
const { enviarMenuHorarios } = require("../handlers/timeHandler");
const MessageType = require("../config/messageType");
const { debug } = require("../services/debugService"); // ✅ usar debug
const { sendMessageOptions } = require("../config/compatibility/whatsappCompatibility");

const chatContext = {};

// Mensagem de fallback para WELCOME
const FALLBACK_WELCOME_MESSAGE =
  "Bem-vindo! Está aqui para seleção de modelos?";

/**
* Obtém a mensagem de boas-vindas dinâmica com fallback
 * @param {string} name - Nome do usuário
 * @returns {Promise<string>} - Mensagem processada
 */
async function getWelcomeMessage(name) {
  try {
    const dynamicMessage = await messageReader.getMessage(MessageType.WELCOME, {
      name,
    });

    return dynamicMessage;
  } catch (error) {
    await debug("ℹ️ Erro ao buscar WELCOME, usando fallback:", error.message);
    return messageReader.processVariables(FALLBACK_WELCOME_MESSAGE, { name });
  }
}

async function enviarMensagemMenu(client, msg, chat) {
  await delay.smartDelay();
  await chat.sendStateTyping();
  indicadores.incrementarAtendidos();

  const contact = await msg.getContact();
  const name = contact.pushname?.split(" ")[0] || "";

  const welcomeMessage = await getWelcomeMessage(name);

  await debug("📝 [DEBUG] Tentando enviar mensagem de boas-vindas (Single)...");
  await client.sendMessage(msg.from, welcomeMessage, sendMessageOptions);
  await debug("✅ [DEBUG] Mensagem de boas-vindas enviada (Single).");
  await enviarMenuHorarios(client, msg.from, chat);
}

module.exports = {
  enviarMensagemMenu,
  enviarMenuHorarios,
  chatContext,
};
