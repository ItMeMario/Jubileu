// menuSingle.js
const modoDevService = require("../services/modoDevService");
const indicadores = require("../utils/indicadores");
const messageReader = require("../utils/messageReader");
const delay = require("../utils/delay");

const chatContext = {};

async function enviarMenuHorarios(client, chatId, chat) {
  await chat.sendStateTyping();

  const timeMenu = `⚠*IMPORTANTE: Escolha seu horário:*
_Horarios disponíveis_
1️⃣ - 10:00h (Manhã)
2️⃣ - 12:00h (Meio-dia)
3️⃣ - 14:00h (Depois do almoço)
4️⃣ - 15:30h (Tarde)
5️⃣ - 17:30h (Final da tarde)
6️⃣ - 19:30h (Noite)

*Por favor me informe o horário que você escolheu…*`;

  // Delay antes do menu de horários
  await delay.smartDelay({ minMs: 5000, maxMs: 25000 });
  await client.sendMessage(chatId, timeMenu);
}

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
