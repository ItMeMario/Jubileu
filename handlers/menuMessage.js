// menuMessage.js refatorado
const {delay, randomDelay} = require("../utils/delay");
const fs = require("fs");
const path = require("path");
const groupService = require("../services/groupService");
const messageStorage = require("../services/messageService");

// Carrega as cidades do JSON
const CITIES_FILE = path.join(__dirname, '../data/cities.json');
let cities = [];
try {
  cities = JSON.parse(fs.readFileSync(CITIES_FILE, 'utf8'));
} catch (error) {
  console.error("Erro ao carregar cities.json:", error);
  cities = [];
}

// Armazena o contexto das conversas temporariamente
const chatContext = {};

// Busca a última mensagem válida salva
const getLatestValidMessage = async () => {
  try {
    const lastMessage = await messageStorage.getLastMessage();
    if (!lastMessage || !lastMessage.content) return null;

    const trimmedContent = lastMessage.content.trim();
    return trimmedContent.length > 20 ? trimmedContent : null;
  } catch (error) {
    console.error("Erro ao recuperar mensagem:", error);
    return null;
  }
};

// Envia mensagem de boas-vindas e o menu inicial
async function enviarMensagemMenu(client, msg, chat) {
  const chatId = msg.from;
  await delay(3000); //delay de 3 segundos destinado para fins de teste;
  //await randomDelay(60000, 180000);

  await chat.sendStateTyping();

  const contact = await msg.getContact();
  const name = contact.pushname?.split(" ")[0] || "";

  const latestMessage = await getLatestValidMessage();
  const greetingMessage = latestMessage
    ? `Olá ${name}! Tudo bem?\n${latestMessage}`
    : `Olá ${name}! Tudo bem?\n\nAqui é o Léo Rieper, da empresa *Dilson Stein!*\nEstamos organizando um evento para escolher novos modelos...`;

  await client.sendMessage(chatId, greetingMessage);

  const currentMode = groupService.getCurrentMode();

  if (currentMode === "MULTI") {
    await enviarMenuCidades(client, chatId, chat);
  } else {
    await enviarMenuHorarios(client, chatId, chat);
  }
}

// Menu de cidades para o modo MULTI
async function enviarMenuCidades(client, chatId, chat) {
  //await delay(3000); //delay de 3 segundos estinado para fins de teste
  await randomDelay(60000, 180000);
  await chat.sendStateTyping();

  let cityMenu = "\ud83d\udccd *SELECIONE SUA CIDADE* \ud83d\udccd\n";
  cityMenu += "Por favor, responda com o N\u00daMERO da sua cidade:\n\n";

  cities.forEach((city, index) => {
    cityMenu += `${index + 1} - ${city.name}\n`;
  });

  await client.sendMessage(chatId, cityMenu);
}

// Menu de horários (usado em ambos os modos)
async function enviarMenuHorarios(client, chatId, chat) {
  await delay(3000);
  await chat.sendStateTyping();

  const timeMenu = `⚠*IMPORTANTE: Escolha seu hor\u00e1rio:*
  _Horarios disponíveis_
1️⃣ - 10:00h (Manh\u00e3)
2️⃣ - 12:00h (Meio-dia)
3️⃣ - 14:00h (Depois do almoço)
4️⃣ - 15:30h (Tarde)
5️⃣ - 17:30h (Final da tarde)
6️⃣ - 19:30h (Noite)`;

  await client.sendMessage(chatId, timeMenu);
}

module.exports = {
  enviarMensagemMenu,
  enviarMenuHorarios,
  chatContext
};
