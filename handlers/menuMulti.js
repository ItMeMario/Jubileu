// menuMulti.js
const modoDevService = require("../services/modoDevService");
const indicadores = require("../utils/indicadores");
const messageReader = require("../utils/messageReader");
const delay = require("../utils/delay");
const db = require("../config/db"); // conexão com o banco SQLite

const chatContext = {};

// Função para buscar cidades do banco
function getCitiesFromDB() {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM cities", (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function enviarMenuCidades(client, chatId, chat) {
  await chat.sendStateTyping();

  const cities = await getCitiesFromDB();

  let cityMenu =
    "Estamos com seleções abertas em " +
    cities.length +
    " cidades neste momento: 📍\n\n";

  cities.forEach((city, index) => {
    const numberEmoji = index + 1 + "\uFE0F\u20E3";
    cityMenu += `${numberEmoji} ${city.name}\n`;
  });

  cityMenu +=
    "\n✨ Em qual dessas cidades você gostaria de estar participando?";

  await delay.smartDelay({ minMs: 5000, maxMs: 25000 });
  await client.sendMessage(chatId, cityMenu);
}

async function enviarMenuHorarios(client, chatId, chat) {
  await chat.sendStateTyping();

  const timeMenu = `⚠*IMPORTANTE: Escolha seu horário:*
_Horários disponíveis_
1️⃣ - 10:00h (Manhã)
2️⃣ - 12:00h (Meio-dia)
3️⃣ - 14:00h (Depois do almoço)
4️⃣ - 15:30h (Tarde)
5️⃣ - 17:30h (Final da tarde)
6️⃣ - 19:30h (Noite)

*Por favor me informe o horário que você escolheu…*`;

  await delay.smartDelay({ minMs: 5000, maxMs: 25000 });
  await client.sendMessage(chatId, timeMenu);
}

async function enviarMensagemMenu(client, msg, chat) {
  await delay.smartDelay();
  await chat.sendStateTyping();
  indicadores.incrementarAtendidos();

  const contact = await msg.getContact();
  const name = contact.pushname?.split(" ")[0] || "";

   const messageTemplate = await messageReader.getWelcomeMessage();

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
