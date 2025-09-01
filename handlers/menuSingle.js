// menuSingle.js
const modoDevService = require("../services/modoDevService");
const indicadores = require("../utils/indicadores");
const messageReader = require("../utils/messageReader");
const delay = require("../utils/delay");
const { enviarMenuHorarios } = require("../handlers/timeHandler");

const chatContext = {};

async function enviarMensagemMenu(client, msg, chat) {
  await delay.smartDelay();
  await chat.sendStateTyping();
  indicadores.incrementarAtendidos();

  const contact = await msg.getContact();
  const name = contact.pushname?.split(" ")[0] || "";

  // Agora lê a mensagem de boas-vindas do banco
  const messageTemplate = await messageReader.getWelcomeMessage();

  const greetingMessage = `Olá ${name}! Tudo bem?\n\n${messageReader.processarMensagem(
    messageTemplate,
    name
  )}`;

  await client.sendMessage(msg.from, greetingMessage);
  await enviarMenuHorarios(client, msg.from, chat);
}

module.exports = {
  enviarMensagemMenu,
  enviarMenuHorarios,
  chatContext,
};
