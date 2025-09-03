// menuMulti.js
const modoDevService = require("../services/modoDevService");
const indicadores = require("../utils/indicadores");
const messageReader = require("../utils/messageReader");
const delay = require("../utils/delay");
const db = require("../config/db"); // conexão com o banco SQLite
const { enviarMenuHorarios } = require("../handlers/timeHandler");
const MessageType = require("../config/messageType");

const chatContext = {};

// Mensagens de fallback
const FALLBACK_MESSAGES = {
  [MessageType.CITY_MENU]:
    "Estamos com seleções abertas em {{cityCount}} cidades neste momento: 🏙\n\n{{cityList}}\n\n✨ Em qual dessas cidades você gostaria de estar participando?",
  [MessageType.WELCOME]: "Bem-vindo! Está aqui para seleção de modelos?", // Fallback simples para welcome
};

// Função para buscar cidades do banco
function getCitiesFromDB() {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM cities", (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

/**
 * Constrói a lista formatada de cidades com emojis numerados
 * @param {Array} cities - Array de cidades do banco
 * @returns {string} - Lista formatada
 */
function buildCityList(cities) {
  return cities
    .map((city, index) => {
      const numberEmoji = index + 1 + "\uFE0F\u20E3";
      return `${numberEmoji} ${city.name}`;
    })
    .join("\n");
}

/**
 * Obtém a mensagem dinâmica do menu de cidades
 * @param {Array} cities - Array de cidades
 * @returns {Promise<string>} - Mensagem processada
 */
/**
 * Obtém a mensagem dinâmica do menu de cidades
 */
async function getCityMenuMessage(cities) {
  try {
    const cityCount = cities.length;
    const cityList = buildCityList(cities);

    const dynamicMessage = await messageReader.getMessage(
      MessageType.CITY_MENU,
      { cityCount, cityList }
    );

    if (!dynamicMessage.includes("[ERRO:")) {
      return dynamicMessage;
    }

    // Usa FALLBACK_MESSAGES
    return FALLBACK_MESSAGES[MessageType.CITY_MENU]
      .replace("{{cityCount}}", cityCount)
      .replace("{{cityList}}", cityList);
  } catch (error) {
    console.warn(`⚠️ Erro ao buscar CITY_MENU, usando fallback:`, error);
    const cityCount = cities.length;
    const cityList = buildCityList(cities);
    return FALLBACK_MESSAGES[MessageType.CITY_MENU]
      .replace("{{cityCount}}", cityCount)
      .replace("{{cityList}}", cityList);
  }
}

/**
 * Obtém a mensagem de boas-vindas dinâmica
 */
async function getWelcomeMessage(name) {
  try {
    const dynamicMessage = await messageReader.getMessage(
      MessageType.WELCOME,
      { name }
    );

    if (!dynamicMessage.includes("[ERRO:")) {
      return dynamicMessage;
    }

    // Usa FALLBACK_MESSAGES
    return FALLBACK_MESSAGES[MessageType.WELCOME];
  } catch (error) {
    console.warn(`⚠️ Erro ao buscar WELCOME, usando fallback:`, error);
    return FALLBACK_MESSAGES[MessageType.WELCOME];
  }
}


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

    // Senão, usa o método legado como fallback
    const legacyTemplate = await messageReader.getWelcomeMessage();
    return messageReader.processarMensagem(legacyTemplate, name);
  } catch (error) {
    console.warn(
      `⚠️ Erro ao buscar mensagem dinâmica para WELCOME, usando fallback legado:`,
      error
    );

    // Fallback para método legado
    const legacyTemplate = await messageReader.getWelcomeMessage();
    return messageReader.processarMensagem(legacyTemplate, name);
  }
}

async function enviarMenuCidades(client, chatId, chat) {
  await chat.sendStateTyping();

  const cities = await getCitiesFromDB();
  const cityMenuMessage = await getCityMenuMessage(cities);

  await delay.smartDelay({ minMs: 5000, maxMs: 25000 });
  await client.sendMessage(chatId, cityMenuMessage);
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
  await enviarMenuCidades(client, msg.from, chat);
}

module.exports = {
  enviarMensagemMenu,
  enviarMenuCidades,
  enviarMenuHorarios,
  chatContext,
};
