// handlers/cityHandler.js
const {
  normalizarTexto,
  identificarCidadeFuzzy,
} = require("../utils/triggers");
const { chatContext } = require("./menuMessage");
const { enviarMenuHorarios } = require("./timeHandler");
const groupService = require("../services/groupService");
const delay = require("../utils/delay");
const messageReader = require("../utils/messageReader");
const MessageType = require("../config/messageType");
const { debug } = require("../services/debugService");
const { sendMessageOptions } = require("../config/compatibility/whatsappCompatibility");

// Mensagem de fallback
const FALLBACK_MESSAGES = {
  [MessageType.CITY_ERROR]:
    "🤔 Ops, cidade não encontrada! Parece que essa cidade não está na nossa lista ou houve um errinho de digitação.\n\n🏠 *Cidades disponíveis:*\n{{cityList}}\n\n💡 Você pode digitar:\n• O *número* da cidade (1, 2, 3...)\n• O *nome completo* (São Paulo, Joinville...)\n• Parte do nome (São, Join...)\n\nE se precisar de ajuda, digite a palavra *AJUDA* ou *FAQ* que vou te enviar a lista com as dúvidas mais comuns sobre a nossa seleção.\n\nTente novamente! 😊",
};

class cityHandler {
  async process(client, msg, userStates, userNumber, antiSpamManager) {
    const inputCidade = msg.body?.trim() || "";
    const selectedCityData = await this.findCity(inputCidade);

    if (selectedCityData) {
      await this.handleCityFound(
        client,
        msg,
        userStates,
        userNumber,
        selectedCityData,
        antiSpamManager
      );
    } else {
      await this.handleCityNotFound(client, msg, userNumber, antiSpamManager);
    }
  }

  async findCity(inputCidade) {
    const inputCidadeNormalizado = normalizarTexto(inputCidade);
    const allGroups = await groupService.getAllGroups();

    // Busca por número
    const numero = parseInt(inputCidade.trim());
    if (!isNaN(numero) && numero >= 1 && numero <= allGroups.length) {
      return allGroups[numero - 1];
    }

    // Busca exata
    let city = allGroups.find(
      (group) => normalizarTexto(group.name) === inputCidadeNormalizado
    );

    if (city) return city;

    // Busca parcial
    city = allGroups.find((group) => {
      const nomeNormalizado = normalizarTexto(group.name);
      return (
        nomeNormalizado.includes(inputCidadeNormalizado) ||
        inputCidadeNormalizado.includes(nomeNormalizado)
      );
    });

    if (city) return city;

    // Busca fuzzy
    const fuzzyNomeCidade = await identificarCidadeFuzzy(inputCidade);
    if (fuzzyNomeCidade) {
      return allGroups.find((group) => group.name === fuzzyNomeCidade);
    }

    return null;
  }

  async handleCityFound(
    client,
    msg,
    userStates,
    userNumber,
    selectedCityData,
    antiSpamManager
  ) {
    await antiSpamManager.resetUserAttempts(userNumber);

    chatContext[userNumber] = { selectedCityData };

    await delay.smartDelay({ minMs: 5000, maxMs: 25000 });
    await client.sendMessage(
      msg.from,
      `✅ Cidade selecionada: *${selectedCityData.name}*\n\n${
        selectedCityData.message || ""
      }`,
      sendMessageOptions
    );

    userStates[userNumber] = {
      ...userStates[userNumber],
      step: "awaiting_time",
    };

    const chat = await msg.getChat();
    await enviarMenuHorarios(client, msg.from, chat);
  }

  async handleCityNotFound(client, msg, userNumber, antiSpamManager) {
    const spamCheck = await antiSpamManager.incrementAttempts(userNumber);

    if (spamCheck.action === "send_faq") {
      await antiSpamManager.handleSpamAction(client, msg, "send_faq");
      return;
    }

    if (spamCheck.action === "suspend") {
      await antiSpamManager.handleSpamAction(client, msg, "suspend", {
        suspendDurationMinutes: spamCheck.suspendDurationMinutes,
      });
      return;
    }

    await this.sendCityErrorMessage(client, msg);
  }

  // Monta lista de cidades formatada
  buildCityList(cities) {
    return cities
      .map((city, index) => {
        const numberEmoji = index + 1 + "\uFE0F\u20E3";
        return `${numberEmoji} ${city.name}`;
      })
      .join("\n");
  }

  // 🔹 Obter mensagem dinâmica de CITY_ERROR com fallback
  async getCityErrorMessage(cities) {
    const cityCount = cities.length;
    const cityList = this.buildCityList(cities);

    try {
      const dynamicMessage = await messageReader.getMessage(
        MessageType.CITY_ERROR,
        { cityCount, cityList }
      );

      if (!dynamicMessage.includes("[ERRO:")) {
        return dynamicMessage;
      }

      await debug("ℹ️ Mensagem CITY_ERROR não cadastrada, usando fallback.");
    } catch {
      await debug("ℹ️ Erro ao buscar CITY_ERROR, usando fallback.");
    }

    return FALLBACK_MESSAGES[MessageType.CITY_ERROR]
      .replace("{{cityCount}}", cityCount)
      .replace("{{cityList}}", cityList);
  }

  async sendCityErrorMessage(client, msg) {
    const allGroups = await groupService.getAllGroups();
    const errorMessage = await this.getCityErrorMessage(allGroups);
    await client.sendMessage(msg.from, errorMessage, sendMessageOptions);
  }
}

module.exports = cityHandler;
