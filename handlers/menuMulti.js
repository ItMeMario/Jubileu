// menuMulti.js
const modoDevService = require("../services/modoDevService");
const indicadores = require("../utils/indicadores");
const messageReader = require("../utils/messageReader");
const delay = require("../utils/delay");
const db = require("../config/db"); // conexão com o banco SQLite
const { enviarMenuHorarios } = require("../handlers/timeHandler");

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
