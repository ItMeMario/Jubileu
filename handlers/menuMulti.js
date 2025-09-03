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
  [MessageType.WELCOME]: "{{name}}", // Fallback simples para welcome
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
async function getCityMenuMessage(cities) {
  try {
    const cityCount = cities.length;
    const cityList = buildCityList(cities);

    // Tenta buscar mensagem dinâmica do banco
    const dynamicMessage = await messageReader.getMessage(
      MessageType.CITY_MENU,
      {
        cityCount: cityCount,
        cityList: cityList,
      }
    );

    // Se não contém erro, usa a mensagem dinâmica
    if (!dynamicMessage.includes("[ERRO:")) {
      return dynamicMessage;
    }

    // Senão, usa fallback processado
    return messageReader.processVariables(
      FALLBACK_MESSAGES[MessageType.CITY_MENU],
      {
        cityCount: cityCount,
        cityList: cityList,
      }
    );
  } catch (error) {
    console.warn(
      `⚠️ Erro ao buscar mensagem dinâmica para CITY_MENU, usando fallback:`,
      error
    );

    // Fallback manual em caso de erro total
    const cityCount = cities.length;
    const cityList = buildCityList(cities);

    return messageReader.processVariables(
      FALLBACK_MESSAGES[MessageType.CITY_MENU],
      {
        cityCount: cityCount,
        cityList: cityList,
      }
    );
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

  // Usa o novo sistema dinâmico para welcome
  const welcomeMessage = await getWelcomeMessage(name);
  const greetingMessage = `Olá ${name}! Tudo bem?\n\n${welcomeMessage}`;

  await client.sendMessage(msg.from, greetingMessage);
  await enviarMenuCidades(client, msg.from, chat);
}

module.exports = {
  enviarMensagemMenu,
  enviarMenuCidades,
  enviarMenuHorarios,
  chatContext,
};
