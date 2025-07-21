// message.js - Versão Unificada com Modo MULTI também para SINGLE
const client = require("../client/client");
const { enviarMensagemMenu, enviarMenuHorarios, chatContext } = require("../handlers/menuMessage");
const HORARIOS = require("../horarios");
const { normalizarTexto, hasTriggerText, identificarCidadeFuzzy, normalizarTextoHorario } = require("../utils/triggers");
const groupService = require("../services/groupService");
const timeout = require('../utils/timeout');
const indicadores = require('../utils/indicadores');

const userStates = {};

function encontrarHorario(inputUsuario) {
  const inputNormalizado = normalizarTextoHorario(inputUsuario);
  if (/^[1-6]$/.test(inputNormalizado)) {
    const opcao = parseInt(inputNormalizado);
    const horario = Object.values(HORARIOS).find((h) => h.id === opcao);
    return horario ? { ...horario, id: opcao } : null;
  }
  return HORARIOS[inputNormalizado] || null;
}

async function enviarFAQ(client, msg) {
  await client.sendMessage(msg.from, "📋 *FAQ - Perguntas Frequentes*\n\nPara mais informações, digite 'menu' para começar novamente.");
}

module.exports = async function messageHandler(msg) {
  const chat = await msg.getChat();
  const userNumber = msg.from;
  const textoDaMensagem = msg.caption || msg.body || "";

  if (textoDaMensagem.toLowerCase() === "ajuda" || textoDaMensagem.toLowerCase() === "faq") {
    await enviarFAQ(client, msg);
    timeout.cancelTimeout(userNumber);
    return;
  }

  if (hasTriggerText(textoDaMensagem)) {
    timeout.cancelTimeout(userNumber);
    delete userStates[userNumber];
    delete chatContext[userNumber];
    const currentMode = groupService.getCurrentMode();

    await enviarMensagemMenu(client, msg, chat);
    if (currentMode === 'SINGLE') {
  userStates[userNumber] = { step: "awaiting_time", started: true, forceSingle: true };
} else {
  userStates[userNumber] = { step: "awaiting_city", started: true, forceSingle: false };
}
    await timeout.startTimeout(client, userNumber, chat);
    return;
  }

  if (userStates[userNumber]?.step === "awaiting_city") {
    const inputCidade = (msg.body?.trim() || "");
    const inputCidadeNormalizado = normalizarTexto(inputCidade);
    const allGroups = groupService.getAllGroups();
    let selectedCityData = null;

    const numero = parseInt(inputCidade.trim());
    if (!isNaN(numero) && numero >= 1 && numero <= allGroups.length) {
      selectedCityData = allGroups[numero - 1];
    }

    if (!selectedCityData) {
      selectedCityData = allGroups.find(group => 
        normalizarTexto(group.name) === inputCidadeNormalizado
      );
    }

    if (!selectedCityData) {
      selectedCityData = allGroups.find(group => {
        const nomeNormalizado = normalizarTexto(group.name);
        return nomeNormalizado.includes(inputCidadeNormalizado) || 
               inputCidadeNormalizado.includes(nomeNormalizado);
      });
    }

    if (!selectedCityData) {
      const fuzzyNomeCidade = identificarCidadeFuzzy(inputCidade);
      if (fuzzyNomeCidade) {
        selectedCityData = allGroups.find(
          (group) => group.name === fuzzyNomeCidade
        );
      }
    }

    if (selectedCityData) {
      chatContext[userNumber] = { selectedCityData };
      await client.sendMessage(
        msg.from,
        `✅ Cidade selecionada: *${selectedCityData.name}*\n\n${selectedCityData.message || ''}`
      );
      await enviarMenuHorarios(client, msg.from, chat);
      userStates[userNumber].step = "awaiting_time";
      await timeout.startTimeout(client, userNumber, chat);
    } else {
      let errorMessage = "🤔 Desculpe, não encontrei essa cidade.\n\n";
      errorMessage += "📍 *Cidades disponíveis:*\n";

      allGroups.forEach((group, index) => {
        errorMessage += `${index + 1}. ${group.name}\n`;
      });

      errorMessage += "\n💡 Você pode digitar:\n";
      errorMessage += "• O *número* da cidade (1, 2, 3...)\n";
      errorMessage += "• O *nome completo* (São Paulo, Joinville...)\n";
      errorMessage += "• Parte do nome (São, Join...)\n";
      errorMessage += "\nTente novamente! 😊";

      await client.sendMessage(msg.from, errorMessage);
      await timeout.startTimeout(client, userNumber, chat);
    }
    return;
  }

  if (userStates[userNumber]?.step === "awaiting_time") {
    const inputUsuario = msg.body?.trim() || "";
    if (inputUsuario.toLowerCase() === "ajuda") {
      await enviarFAQ(client, msg);
      timeout.cancelTimeout(userNumber);
      return;
    }

    const opcao = encontrarHorario(inputUsuario);
    if (opcao) {
      userStates[userNumber] = {
        step: "awaiting_name",
        selectedTime: `${opcao.horario} - ${opcao.descricao}`,
        selectedTimeObj: opcao,
      };
      await chat.sendStateTyping();
      await client.sendMessage(
        msg.from,
        `Você escolheu *${opcao.horario} - ${opcao.descricao}*.` +
        `\nAgora digite somente o seu *NOME COMPLETO* para confirmar a sua inscrição, por favor!😊`
      );
      await timeout.startTimeout(client, userNumber, chat);
    } else {
      timeout.cancelTimeout(userNumber);
      await client.sendMessage(
        msg.from,
        `🤔 Desculpe, não entendi. Digite apenas o horário que você escolheu.`
      );
      await timeout.startTimeout(client, userNumber, chat);
    }
    return;
  }

  if (userStates[userNumber]?.step === "awaiting_name") {
    const nomeCompleto = msg.body?.trim();
    const horarioSelecionado = userStates[userNumber].selectedTime;

    try {
      timeout.cancelTimeout(userNumber);
      const currentMode = groupService.getCurrentMode();
      const allGroups = groupService.getAllGroups();
      if (allGroups.length === 0) throw new Error("Nenhum grupo configurado");

      let messageText;
      if (userStates[userNumber].forceSingle) {
        const primaryLink = groupService.getPrimaryGroupLink();
        messageText = `✅ Pronto, *${nomeCompleto}*! Aqui está o link para entrar no grupo:\n\n${primaryLink}\n\n⏰ Seu horário: *${horarioSelecionado}* 😁\n\nClique no link para participar!`;
      } else {
        const selectedCityData = chatContext[userNumber]?.selectedCityData;
        if (selectedCityData) {
          messageText = `✅ Pronto, *${nomeCompleto}*! Aqui está o link para ${selectedCityData.name}:\n\n${selectedCityData.link}\n\n⏰ Seu horário: *${horarioSelecionado}* 😁\n\nClique no link para participar!`;
        } else {
          messageText = `✅ Pronto, *${nomeCompleto}*! Aqui estão os links dos grupos disponíveis:\n\n`;
          messageText += allGroups
            .map((group) => `🔗 ${group.descricao || `Grupo ${group.id}`}: ${group.link}`)
            .join("\n\n");
          messageText += `\n\n⏰ Seu horário: *${horarioSelecionado}* 😁\n\nEscolha o grupo que preferir!`;
        }
        delete chatContext[userNumber];
      }

      await client.sendMessage(msg.from, messageText);
      indicadores.incrementarConvidados();
      delete userStates[userNumber];
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      await msg.reply("❌ Ocorreu um erro ao enviar o(s) link(s) do grupo. Por favor, tente novamente mais tarde.");
      timeout.cancelTimeout(userNumber);
      delete userStates[userNumber];
      delete chatContext[userNumber];
    }
  }
};
