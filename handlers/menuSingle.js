// menuSingle.js
const modoDevService = require("../services/modoDevService");
const indicadores = require('../utils/indicadores');
const messageReader = require('../utils/messageReader');

const chatContext = {};

async function enviarMenuHorarios(client, chatId, chat) {
  await modoDevService.testDelay();
  await chat.sendStateTyping();

  const timeMenu = `⚠*IMPORTANTE: Escolha seu horário:*
_Horarios disponíveis_
1️⃣ - 10:00h (Manhã)
2️⃣ - 12:00h (Meio-dia)
3️⃣ - 14:00h (Depois do almoço)
4️⃣ - 15:30h (Tarde)
5️⃣ - 17:30h (Final da tarde)
6️⃣ - 19:30h (Noite)`;

  await client.sendMessage(chatId, timeMenu);
}

async function enviarMensagemMenu(client, msg, chat) {
  await modoDevService.testDelay();
  await chat.sendStateTyping();
  indicadores.incrementarAtendidos();

  const contact = await msg.getContact();
  const name = contact.pushname?.split(" ")[0] || "";

  // Lê a mensagem do arquivo de texto
  const messageTemplate = messageReader.lerMensagemSaudacao();
  
  // Processa a mensagem com o nome do contato
  const greetingMessage = `Olá ${name}! Tudo bem?\n\n${messageReader.processarMensagem(messageTemplate, name)}`;

  await client.sendMessage(msg.from, greetingMessage);
  await enviarMenuHorarios(client, msg.from, chat);
}

module.exports = {
  enviarMensagemMenu,
  enviarMenuHorarios,
  chatContext
};