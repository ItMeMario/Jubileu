// handlers/cityHandler.js
const {
  normalizarTexto,
  identificarCidadeFuzzy,
} = require("../utils/triggers");
const { chatContext } = require("./menuMessage");
const { enviarMenuHorarios } = require("./timeHandler");
const groupService = require("../services/groupService");
const delay = require("../utils/delay");

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
      }`
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

  async sendCityErrorMessage(client, msg) {
    const allGroups = await groupService.getAllGroups();

    let errorMessage =
      "🤔 Ops, cidade não encontrada! Parece que essa cidade não está na nossa lista ou houve um errinho de digitação.\n\n";
    errorMessage += "🏠 *Cidades disponíveis:*\n";

    allGroups.forEach((group, index) => {
      errorMessage += `${index + 1}. ${group.name}\n`;
    });

    errorMessage += "\n💡 Você pode digitar:\n";
    errorMessage += "• O *número* da cidade (1, 2, 3...)\n";
    errorMessage += "• O *nome completo* (São Paulo, Joinville...)\n";
    errorMessage += "• Parte do nome (São, Join...)\n";
    errorMessage +=
      "\nE se precisar de ajuda, digite a palavra *AJUDA* ou *FAQ* que vou te enviar a lista com as dúvidas mais comuns sobre a nossa seleção.\n";
    errorMessage += "\nTente novamente! 😊";

    await client.sendMessage(msg.from, errorMessage);
  }
}

module.exports = cityHandler;
