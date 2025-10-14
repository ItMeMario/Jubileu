const messageReader = require("../../utils/messageReader");
const MessageType = require("../../config/messageType");
const { debug } = require("../../services/debugService");

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

class MessageManager {
  // 📹 Obter mensagem dinâmica de GROUP_SINGLE_INVITE com fallback
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

  // 📹 Obter mensagem dinâmica de GROUP_MULTI_INVITE com fallback
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

  // 📹 Obter mensagem dinâmica de ALREADY_IN_GROUP com fallback
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

  // 📹 Obter mensagem dinâmica de GROUP_ERROR com fallback
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
}

module.exports = new MessageManager();
