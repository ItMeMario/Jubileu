// menuMulti.js
const fs = require("fs");
const path = require("path");
const modoDevService = require("../services/modoDevService");
const indicadores = require("../utils/indicadores");
const messageReader = require("../utils/messageReader");
const delay = require("../utils/delay");

const CITIES_FILE = path.join(__dirname, "../data/cities.json");
let cities = [];
try {
  cities = JSON.parse(fs.readFileSync(CITIES_FILE, "utf8"));
} catch (error) {
  console.error("Erro ao carregar cities.json:", error);
}

const chatContext = {};

async function enviarMenuCidades(client, chatId, chat) {
  await chat.sendStateTyping();

  let cityMenu =
    "Estamos com seleções abertas em " +
    cities.length +
    " cidades neste momento: 📍\n\n";

  cities.forEach((city, index) => {
    // Usando emojis de números circulares (1️⃣, 2️⃣, etc.)
    const numberEmoji = index + 1 + "\uFE0F\u20E3"; // Combina o número com os modificadores
    cityMenu += `${numberEmoji} ${city.name}\n`;
  });

  cityMenu +=
    "\n✨ Em qual dessas cidades você gostaria de estar participando?";

  // Delay antes do menu de cidades
  await delay.smartDelay({ minMs: 5000, maxMs: 25000 });
  await client.sendMessage(chatId, cityMenu);
}

async function enviarMenuHorarios(client, chatId, chat) {
  await chat.sendStateTyping();

  const timeMenu = `⚠*IMPORTANTE: Escolha seu horário:*
_Horarios disponíveis_
1️⃣ - 10:00h (Manhã)
2️⃣ - 12:00h (Meio-dia)
3️⃣ - 14:00h (Depois do almoço)
4️⃣ - 15:30h (Tarde)
5️⃣ - 17:30h (Final da tarde)
6️⃣ - 19:30h (Noite)`;

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

  // Lê a mensagem do arquivo de texto
  const messageTemplate = messageReader.lerMensagemSaudacao();

  // Processa a mensagem com o nome do contato
  const greetingMessage = `Olá ${name}! Tudo bem?\n\n${messageReader.processarMensagem(
    messageTemplate,
    name
  )}`;

  await client.sendMessage(msg.from, greetingMessage);
  await enviarMenuCidades(client, msg.from, chat);
}

module.exports = {
  enviarMensagemMenu,
  enviarMenuCidades,
  enviarMenuHorarios,
  chatContext,
};