// menuSingle.js
const modoDevService = require("../services/modoDevService");
const indicadores = require("../utils/indicadores");
const messageReader = require("../utils/messageReader");
const delay = require("../utils/delay");
const { enviarMenuHorarios } = require("../handlers/timeHandler");
const MessageType = require("../config/messageType");

const chatContext = {};

// Mensagem de fallback para WELCOME
const FALLBACK_WELCOME_MESSAGE = "Bem-vindo! Está aqui para seleção de modelos?";

/**
 * Obtém a mensagem de boas-vindas dinâmica
 * @param {string} name - Nome do usuário
 * @returns {Promise<string>} - Mensagem processada
 */
async function getWelcomeMessage(name) {
  try {
    // Tenta buscar mensagem dinâmica do banco
    const dynamicMessage = await messageReader.getMessage(MessageType.WELCOME, {
      name: name,
    });

    // Se não contém erro, usa a mensagem dinâmica
    if (!dynamicMessage.includes("[ERRO:")) {
      return dynamicMessage;
    }

    // Senão, usa fallback processado
    return messageReader.processVariables(FALLBACK_WELCOME_MESSAGE, {
      name: name,
    });
  } catch (error) {
    console.warn(
      `⚠️ Erro ao buscar mensagem dinâmica para WELCOME, usando fallback:`,
      error
    );

    // Fallback manual em caso de erro total
    return messageReader.processVariables(FALLBACK_WELCOME_MESSAGE, {
      name: name,
    });
  }
}

async function enviarMensagemMenu(client, msg, chat) {
  await delay.smartDelay();
  await chat.sendStateTyping();
  indicadores.incrementarAtendidos();

  const contact = await msg.getContact();
  const name = contact.pushname?.split(" ")[0] || "";

  // Usa o novo sistema dinâmico para welcome (já inclui saudação)
  const welcomeMessage = await getWelcomeMessage(name);

  await client.sendMessage(msg.from, welcomeMessage);
  await enviarMenuHorarios(client, msg.from, chat);
}

module.exports = {
  enviarMensagemMenu,
  enviarMenuHorarios,
  chatContext,
};
