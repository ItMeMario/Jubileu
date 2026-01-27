// menuMulti.js
const modoDevService = require("../services/modoDevService");
const indicadores = require("../utils/indicadores");
const messageReader = require("../utils/messageReader");
const delay = require("../utils/delay");
const db = require("../config/db"); // conexão com o banco SQLite
const { enviarMenuHorarios } = require("../handlers/timeHandler");
const MessageType = require("../config/messageType");
const { debug } = require("../services/debugService"); // ✅ usar debug
const { sendMessageOptions } = require("../config/compatibility/whatsappCompatibility");

const chatContext = {};

// Mensagens de fallback
const FALLBACK_MESSAGES = {
  [MessageType.CITY_MENU]:
    "Estamos com seleções abertas em {{cityCount}} cidades neste momento: 🏙\n\n{{cityList}}\n\n✨ Em qual dessas cidades você gostaria de estar participando?",
  [MessageType.WELCOME]: "Bem-vindo! Está aqui para seleção de modelos?", // Fallback simples
};

// Busca cidades do banco
function getCitiesFromDB() {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM cities", (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// Monta lista de cidades
function buildCityList(cities) {
  return cities
    .map((city, index) => {
      const numberEmoji = index + 1 + "\uFE0F\u20E3";
      return `${numberEmoji} ${city.name}`;
    })
    .join("\n");
}

// 🔹 Obter mensagem dinâmica de CITY_MENU com fallback
async function getCityMenuMessage(cities) {
  const cityCount = cities.length;
  const cityList = buildCityList(cities);

  try {
    const dynamicMessage = await messageReader.getMessage(
      MessageType.CITY_MENU,
      { cityCount, cityList }
    );

    if (!dynamicMessage.includes("[ERRO:")) {
      return dynamicMessage;
    }

    await debug("ℹ️ Mensagem CITY_MENU não cadastrada, usando fallback.");
  } catch {
    await debug("ℹ️ Erro ao buscar CITY_MENU, usando fallback.");
  }

  return FALLBACK_MESSAGES[MessageType.CITY_MENU]
    .replace("{{cityCount}}", cityCount)
    .replace("{{cityList}}", cityList);
}

// 🔹 Obter mensagem dinâmica de WELCOME com fallback
async function getWelcomeMessage(name) {
  try {
    const dynamicMessage = await messageReader.getMessage(MessageType.WELCOME, {
      name,
    });

    if (!dynamicMessage.includes("[ERRO:")) {
      return dynamicMessage;
    }

    await debug("ℹ️ Mensagem WELCOME não cadastrada, usando fallback.");
  } catch {
    await debug("ℹ️ Erro ao buscar WELCOME, usando fallback.");
  }

  return FALLBACK_MESSAGES[MessageType.WELCOME];
}

async function enviarMenuCidades(client, chatId, chat) {
  await chat.sendStateTyping();
  const cities = await getCitiesFromDB();
  const cityMenuMessage = await getCityMenuMessage(cities);

  await delay.smartDelay({ minMs: 5000, maxMs: 25000 });
  await debug("📝 [DEBUG] Tentando enviar mensagem de cidades...");
  await client.sendMessage(chatId, cityMenuMessage, sendMessageOptions);
  await debug("✅ [DEBUG] Mensagem de cidades enviada.");
}

async function enviarMensagemMenu(client, msg, chat) {
  await delay.smartDelay();
  await chat.sendStateTyping();
  indicadores.incrementarAtendidos();

  const contact = await msg.getContact();
  const name = contact.pushname?.split(" ")[0] || "";

  const welcomeMessage = await getWelcomeMessage(name);

  await debug("📝 [DEBUG] Tentando enviar mensagem de boas-vindas (Multi)...");
  await client.sendMessage(msg.from, welcomeMessage, sendMessageOptions);
  await debug("✅ [DEBUG] Mensagem de boas-vindas enviada (Multi).");
  await enviarMenuCidades(client, msg.from, chat);
}

module.exports = {
  enviarMensagemMenu,
  enviarMenuCidades,
  enviarMenuHorarios,
  chatContext,
};
