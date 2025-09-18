const { chatContext } = require("./menuMessage");
const groupService = require("../services/groupService");
const inviteManager = require("../utils/inviteManager");
const indicadores = require("../utils/indicadores");
const delay = require("../utils/delay");
const timeout = require("../utils/timeout");
const messageReader = require("../utils/messageReader");
const MessageType = require("../config/messageType");
const { debug } = require("../services/debugService");
const { MessageMedia } = require("whatsapp-web.js");
const path = require("path");
const fs = require("fs");

// Mensagens de fallback
const FALLBACK_MESSAGES = {
  [MessageType.GROUP_SINGLE_INVITE]:
    "✅ Parabéns, *{{nomeCompleto}}*! A sua presença está confirmada!{{dataEvento}}\n\n{{groupLink}}\n\n⏰ Seu horário: *{{horarioSelecionado}}* 😄\n\n*Clique no link para participar!*",

  [MessageType.GROUP_MULTI_INVITE]:
    "✅ Parabéns, *{{nomeCompleto}}*! A sua presença está confirmada!{{dataEvento}}\n\n{{groupLink}}\n\n⏰ Seu horário: *{{horarioSelecionado}}* 😄\n\nAqui está o acesso para o grupo de {{cityName}}:\n*Clique no link para participar!*",

  [MessageType.ALREADY_IN_GROUP]:
    "ℹ️ Olá *{{nomeCompleto}}*! Você já está participando do grupo {{cityName}}. Não é necessário entrar novamente! 😊",

  [MessageType.GROUP_ERROR]:
    "⚠️ Ocorreu um erro ao enviar o(s) link(s) do grupo. Por favor, tente novamente mais tarde.",
};

class NameHandler {
  async process(client, msg, userStates, userNumber, antiSpamManager) {
    const nomeCompleto = msg.body?.trim();
    const horarioSelecionado = userStates[userNumber].selectedTime;

    try {
      timeout.cancelTimeout(userNumber);

      const result = await this.generateInviteMessage(
        client,
        userNumber,
        nomeCompleto,
        horarioSelecionado,
        userStates
      );

      if (result === null) {
        // Usuário já está no grupo - cleanup foi feito internamente
        await antiSpamManager.resetUserAttempts(userNumber);
        delete userStates[userNumber];
        delete chatContext[userNumber];
        return null; // ← Retorna null para o message.js detectar
      }

      // Se o resultado for "sent_with_audio", significa que já enviamos tudo
      if (result === "sent_with_audio") {
        await this.updateCounters();
        await antiSpamManager.resetUserAttempts(userNumber);

        // Cleanup
        delete userStates[userNumber];
        delete chatContext[userNumber];

        return "completed";
      }

      // Caso contrário, enviar mensagem normalmente (fallback)
      await delay.smartDelay({ minMs: 5000, maxMs: 25000 });
      await client.sendMessage(msg.from, result);

      await this.updateCounters();
      await antiSpamManager.resetUserAttempts(userNumber);

      // Cleanup
      delete userStates[userNumber];
      delete chatContext[userNumber];

      return "completed"; // ← Retorna status para indicar conclusão normal
    } catch (error) {
      await this.handleError(msg, userNumber, error, userStates);
      return "error"; // ← Retorna status para indicar erro
    }
  }

  /**
   * Busca e envia áudio AUDIO_INVITE se existir para o locale atual
   */
  async sendAudioInviteIfExists(client, userNumber) {
    try {
      const currentLocale = messageReader.getConfigLocale();

      // Verificar se existe mensagem AUDIO_INVITE para o locale atual
      const audioExists = await messageReader.messageExists(
        MessageType.AUDIO_INVITE,
        currentLocale
      );

      if (!audioExists) {
        // Não há áudio para este locale, não fazer nada
        return false;
      }

      // Buscar o nome do arquivo de áudio
      const audioFileName = await messageReader.getMessage(
        MessageType.AUDIO_INVITE,
        {},
        currentLocale
      );

      if (!audioFileName || audioFileName.includes("[ERRO:")) {
        return false;
      }

      // Construir o caminho completo do arquivo
      const { DATA_DIR } = require("../utils/initialize");
      const audioPath = path.join(DATA_DIR, "audio", audioFileName);

      // Verificar se o arquivo realmente existe
      if (!fs.existsSync(audioPath)) {
        await debug(`⚠️ Arquivo de áudio não encontrado: ${audioPath}`);
        return false;
      }

      // Criar MessageMedia e enviar o áudio
      const audioMedia = MessageMedia.fromFilePath(audioPath);
      await client.sendMessage(userNumber, audioMedia);

      await debug(`🎵 Áudio enviado: ${audioFileName} para ${userNumber}`);
      return true;
    } catch (error) {
      await debug(`❌ Erro ao enviar áudio AUDIO_INVITE: ${error.message}`);
      return false;
    }
  }

  // 🔹 Obter mensagem dinâmica de GROUP_SINGLE_INVITE com fallback
  async getSingleInviteMessage(
    nomeCompleto,
    horarioSelecionado,
    groupLink,
    dataEvento = ""
  ) {
    try {
      const dynamicMessage = await messageReader.getMessage(
        MessageType.GROUP_SINGLE_INVITE,
        { nomeCompleto, horarioSelecionado, groupLink, dataEvento }
      );

      if (!dynamicMessage.includes("[ERRO:")) {
        return dynamicMessage;
      }

      await debug(
        "ℹ️ Mensagem GROUP_SINGLE_INVITE não cadastrada, usando fallback."
      );
    } catch {
      await debug("ℹ️ Erro ao buscar GROUP_SINGLE_INVITE, usando fallback.");
    }

    return FALLBACK_MESSAGES[MessageType.GROUP_SINGLE_INVITE]
      .replace("{{nomeCompleto}}", nomeCompleto)
      .replace("{{horarioSelecionado}}", horarioSelecionado)
      .replace("{{groupLink}}", groupLink)
      .replace("{{dataEvento}}", dataEvento);
  }

  // 🔹 Obter mensagem dinâmica de GROUP_MULTI_INVITE com fallback
  async getMultiInviteMessage(
    nomeCompleto,
    horarioSelecionado,
    groupLink,
    cityName,
    dataEvento = ""
  ) {
    try {
      const dynamicMessage = await messageReader.getMessage(
        MessageType.GROUP_MULTI_INVITE,
        { nomeCompleto, horarioSelecionado, groupLink, cityName, dataEvento }
      );

      if (!dynamicMessage.includes("[ERRO:")) {
        return dynamicMessage;
      }

      await debug(
        "ℹ️ Mensagem GROUP_MULTI_INVITE não cadastrada, usando fallback."
      );
    } catch {
      await debug("ℹ️ Erro ao buscar GROUP_MULTI_INVITE, usando fallback.");
    }

    return FALLBACK_MESSAGES[MessageType.GROUP_MULTI_INVITE]
      .replace("{{nomeCompleto}}", nomeCompleto)
      .replace("{{horarioSelecionado}}", horarioSelecionado)
      .replace("{{groupLink}}", groupLink)
      .replace("{{cityName}}", cityName)
      .replace("{{dataEvento}}", dataEvento);
  }

  // 🔹 Obter mensagem dinâmica de ALREADY_IN_GROUP com fallback
  async getAlreadyInGroupMessage(nomeCompleto, cityName = "") {
    try {
      const dynamicMessage = await messageReader.getMessage(
        MessageType.ALREADY_IN_GROUP,
        { nomeCompleto, cityName }
      );

      if (!dynamicMessage.includes("[ERRO:")) {
        return dynamicMessage;
      }

      await debug(
        "ℹ️ Mensagem ALREADY_IN_GROUP não cadastrada, usando fallback."
      );
    } catch {
      await debug("ℹ️ Erro ao buscar ALREADY_IN_GROUP, usando fallback.");
    }

    return FALLBACK_MESSAGES[MessageType.ALREADY_IN_GROUP]
      .replace("{{nomeCompleto}}", nomeCompleto)
      .replace("{{cityName}}", cityName);
  }

  // 🔹 Obter mensagem dinâmica de GROUP_ERROR com fallback
  async getGroupErrorMessage() {
    try {
      const dynamicMessage = await messageReader.getMessage(
        MessageType.GROUP_ERROR
      );

      if (!dynamicMessage.includes("[ERRO:")) {
        return dynamicMessage;
      }

      await debug("ℹ️ Mensagem GROUP_ERROR não cadastrada, usando fallback.");
    } catch {
      await debug("ℹ️ Erro ao buscar GROUP_ERROR, usando fallback.");
    }

    return FALLBACK_MESSAGES[MessageType.GROUP_ERROR];
  }

  async generateInviteMessage(
    client,
    userNumber,
    nomeCompleto,
    horarioSelecionado,
    userStates
  ) {
    const currentMode = groupService.getCurrentMode();
    const allGroups = await groupService.getAllGroups();

    if (allGroups.length === 0) {
      throw new Error("Nenhum grupo configurado");
    }

    if (currentMode === "SINGLE" || userStates[userNumber].forceSingle) {
      return await this.handleSingleMode(
        client,
        userNumber,
        nomeCompleto,
        horarioSelecionado,
        allGroups
      );
    } else {
      return await this.handleMultiMode(
        client,
        userNumber,
        nomeCompleto,
        horarioSelecionado
      );
    }
  }

  async handleSingleMode(
    client,
    userNumber,
    nomeCompleto,
    horarioSelecionado,
    allGroups
  ) {
    const primaryGroup = allGroups.find((group) => group.isPrimary);

    if (!primaryGroup) {
      const primaryLink = await groupService.getPrimaryGroupLink();
      const dataEvento = "";
      const textMessage = await this.getSingleInviteMessage(
        nomeCompleto,
        horarioSelecionado,
        primaryLink,
        dataEvento
      );

      // Enviar texto primeiro, depois áudio
      await client.sendMessage(userNumber, textMessage);
      await this.sendAudioInviteIfExists(client, userNumber);

      return "sent_with_audio"; // Indicador especial
    }

    // Verifica se usuário já está no grupo
    if (inviteManager.isValidWhatsAppLink(primaryGroup.link)) {
      const checkResult = await inviteManager.isUserInGroup(
        client,
        userNumber,
        primaryGroup.link
      );

      if (checkResult.isInGroup) {
        const alreadyInMessage = await this.getAlreadyInGroupMessage(
          nomeCompleto,
          primaryGroup.name
        );
        await delay.smartDelay({ minMs: 5000, maxMs: 25000 });
        await client.sendMessage(userNumber, alreadyInMessage);
        return null; // Indica que já foi tratado
      }
    }

    const dataEvento = primaryGroup.date
      ? `\n📅 Dia: ${primaryGroup.date}`
      : "";
    const textMessage = await this.getSingleInviteMessage(
      nomeCompleto,
      horarioSelecionado,
      primaryGroup.link,
      dataEvento
    );

    // Enviar texto primeiro, depois áudio
    await client.sendMessage(userNumber, textMessage);
    await this.sendAudioInviteIfExists(client, userNumber);

    return "sent_with_audio"; // Indicador especial
  }

  async handleMultiMode(client, userNumber, nomeCompleto, horarioSelecionado) {
    const selectedCityData = chatContext[userNumber]?.selectedCityData;

    if (selectedCityData) {
      return await this.handleSpecificCity(
        client,
        userNumber,
        nomeCompleto,
        horarioSelecionado,
        selectedCityData
      );
    } else {
      throw new Error("Nenhuma cidade selecionada no modo multi");
    }
  }

  async handleSpecificCity(
    client,
    userNumber,
    nomeCompleto,
    horarioSelecionado,
    selectedCityData
  ) {
    if (inviteManager.isValidWhatsAppLink(selectedCityData.link)) {
      const checkResult = await inviteManager.isUserInGroup(
        client,
        userNumber,
        selectedCityData.link
      );

      if (checkResult.isInGroup) {
        const alreadyInMessage = await this.getAlreadyInGroupMessage(
          nomeCompleto,
          selectedCityData.name
        );
        await delay.smartDelay({ minMs: 5000, maxMs: 25000 });
        await client.sendMessage(userNumber, alreadyInMessage);
        return null;
      }
    }

    const dataEvento = selectedCityData.date
      ? `\n📅 Dia: ${selectedCityData.date}`
      : "";
    const textMessage = await this.getMultiInviteMessage(
      nomeCompleto,
      horarioSelecionado,
      selectedCityData.link,
      selectedCityData.name,
      dataEvento
    );

    // Enviar texto primeiro, depois áudio
    await client.sendMessage(userNumber, textMessage);
    await this.sendAudioInviteIfExists(client, userNumber);

    return "sent_with_audio"; // Indicador especial
  }

  async updateCounters() {
    try {
      await indicadores.incrementarConvidados();
      await debug("✅ Cliente convidado incrementado no banco");
    } catch (error) {
      console.error("Erro ao incrementar convidados:", error);
    }
  }

  async handleError(msg, userNumber, error, userStates) {
    console.error("Erro ao enviar mensagem:", error);

    const errorMessage = await this.getGroupErrorMessage();
    await msg.reply(errorMessage);

    timeout.cancelTimeout(userNumber);
    delete userStates[userNumber];
    delete chatContext[userNumber];
  }
}

module.exports = NameHandler;
