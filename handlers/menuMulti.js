// menuMulti.js
const fs = require("fs");
const path = require("path");
const modoDevService = require("../services/modoDevService");
const indicadores = require('../utils/indicadores');

const CITIES_FILE = path.join(__dirname, '../data/cities.json');
let cities = [];
try {
  cities = JSON.parse(fs.readFileSync(CITIES_FILE, 'utf8'));
} catch (error) {
  console.error("Erro ao carregar cities.json:", error);
}

const chatContext = {};

async function enviarMenuCidades(client, chatId, chat) {
  await modoDevService.testDelay();
  await chat.sendStateTyping();

  let cityMenu = "📍 *SELECIONE SUA CIDADE* 📍\nPor favor, responda com o NÚMERO da sua cidade:\n\n";

  cities.forEach((city, index) => {
    cityMenu += `${index + 1} - ${city.name}\n`;
  });

  await client.sendMessage(chatId, cityMenu);
}

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

  const greetingMessage = `Olá ${name}! Tudo bem?\n\nAqui é o Léo Rieper, da empresa *Dilson Stein!*\nEstamos organizando um evento para escolher novos modelos...`;

  await client.sendMessage(msg.from, greetingMessage);
  await enviarMenuCidades(client, msg.from, chat);
}

module.exports = {
  enviarMensagemMenu,
  enviarMenuCidades,
  enviarMenuHorarios,
  chatContext
};
