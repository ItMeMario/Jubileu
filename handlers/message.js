// message.js - Versão Corrigida para Novo Fluxo MULTI com FAQ modular
const client = require("../client/client");
const {
  enviarMensagemMenu,
  enviarMenuHorarios,
  chatContext,
} = require("../handlers/menuMessage");
const HORARIOS = require("../horarios");
const {
  normalizarTexto,
  hasTriggerText,
  identificarCidadeFuzzy,
  normalizarTextoHorario,
  isRequestingHelp, // Importa a função do triggers.js
  enviarFAQ, // Importa a função do triggers.js
} = require("../utils/triggers");
const groupService = require("../services/groupService");
const timeout = require("../utils/timeout");
const indicadores = require("../utils/indicadores");
const delay = require("../utils/delay");

const userStates = {};

// 🧠 Função auxiliar para encontrar horário
function encontrarHorario(inputUsuario) {
  const inputNormalizado = normalizarTextoHorario(inputUsuario);
  if (/^[1-6]$/.test(inputNormalizado)) {
    const opcao = parseInt(inputNormalizado);
    const horario = Object.values(HORARIOS).find((h) => h.id === opcao);
    return horario ? { ...horario, id: opcao } : null;
  }
  return HORARIOS[inputNormalizado] || null;
}

module.exports = async function messageHandler(msg) {
  const chat = await msg.getChat();
  const userNumber = msg.from;
  const contact = await msg.getContact();
  const name = contact.pushname?.split(" ")[0] || "";

  const textoDaMensagem = msg.caption || msg.body || "";

  // 🔍 Verificação de FAQ/AJUDA usando a função do triggers.js
  if (isRequestingHelp(textoDaMensagem)) {
    await enviarFAQ(client, msg);
    await timeout.startTimeout(client, userNumber, chat, name);
    return;
  }

  if (
    hasTriggerText(textoDaMensagem) &&
    userStates[userNumber]?.step !== "awaiting_name"
  ) {
    timeout.cancelTimeout(userNumber);
    delete userStates[userNumber];
    delete chatContext[userNumber];

    const currentMode = groupService.getCurrentMode();
    await enviarMensagemMenu(client, msg, chat);

    if (currentMode === "SINGLE") {
      const primaryGroup = (await groupService.getAllGroups()).find(
        (group) => group.isPrimary
      );
      if (primaryGroup) {
        chatContext[userNumber] = { selectedCityData: primaryGroup };
      }
      userStates[userNumber] = {
        step: "awaiting_time",
        started: true,
        forceSingle: true,
      };
    } else {
      userStates[userNumber] = {
        step: "awaiting_city",
        started: true,
        forceSingle: false,
      };
    }

    await timeout.startTimeout(client, userNumber, chat, name);
    return;
  }

  if (userStates[userNumber]?.step === "awaiting_city") {
    const inputCidade = msg.body?.trim() || "";
    const inputCidadeNormalizado = normalizarTexto(inputCidade);
    const allGroups = await groupService.getAllGroups();

    let selectedCityData = null;

    const numero = parseInt(inputCidade.trim());
    if (!isNaN(numero) && numero >= 1 && numero <= allGroups.length) {
      selectedCityData = allGroups[numero - 1];
    }

    if (!selectedCityData) {
      selectedCityData = allGroups.find(
        (group) => normalizarTexto(group.name) === inputCidadeNormalizado
      );
    }

    if (!selectedCityData) {
      selectedCityData = allGroups.find((group) => {
        const nomeNormalizado = normalizarTexto(group.name);
        return (
          nomeNormalizado.includes(inputCidadeNormalizado) ||
          inputCidadeNormalizado.includes(nomeNormalizado)
        );
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

      // Delay antes da mensagem de confirmação da cidade
      await delay.smartDelay({ minMs: 5000, maxMs: 25000 });
      await client.sendMessage(
        msg.from,
        `✅ Cidade selecionada: *${selectedCityData.name}*\n\n${
          selectedCityData.message || ""
        }`
      );

      if (!userStates[userNumber]) {
        userStates[userNumber] = {};
      }

      userStates[userNumber].step = "awaiting_time";
      await enviarMenuHorarios(client, msg.from, chat);
    } else {
      let errorMessage =
        "🤔 Ops, cidade não encontrada! Parece que essa cidade não está na nossa lista ou houve um errinho de digitação.\n\n";
      errorMessage += "📍 *Cidades disponíveis:*\n";

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

    await timeout.startTimeout(client, userNumber, chat, name);
    return;
  }

  if (userStates[userNumber]?.step === "awaiting_time") {
    const inputUsuario = msg.body?.trim() || "";
    const opcao = encontrarHorario(inputUsuario);

    if (opcao) {
      indicadores.incrementarHorario(opcao.id);

      userStates[userNumber] = {
        ...userStates[userNumber],
        step: "awaiting_name",
        selectedTime: `${opcao.horario} - ${opcao.descricao}`,
        selectedTimeObj: opcao,
      };

      await chat.sendStateTyping();
      // Delay antes da confirmação do horário
      await delay.smartDelay({ minMs: 5000, maxMs: 25000 });
      await client.sendMessage(
        msg.from,
        `Você escolheu *${opcao.horario} - ${opcao.descricao}*.\nAgora digite somente o seu *NOME COMPLETO* para confirmar a sua inscrição, por favor!😊`
      );
    } else {
      await client.sendMessage(
        msg.from,
        `🤔 Desculpe, horário não reconhecido. Digite apenas o horário que você escolheu.\n\nE se precisar de ajuda, digite a palavra *AJUDA* ou *FAQ* que vou te enviar a lista com as dúvidas mais comuns sobre a nossa seleção.`
      );
    }

    await timeout.startTimeout(client, userNumber, chat, name);
    return;
  }

  if (userStates[userNumber]?.step === "awaiting_name") {
    const nomeCompleto = msg.body?.trim();
    const horarioSelecionado = userStates[userNumber].selectedTime;

    try {
      timeout.cancelTimeout(userNumber);
      const currentMode = groupService.getCurrentMode();
      const allGroups = await groupService.getAllGroups();
      if (allGroups.length === 0) throw new Error("Nenhum grupo configurado");

      let messageText;

      if (currentMode === "SINGLE" || userStates[userNumber].forceSingle) {
        const primaryGroup = allGroups.find((group) => group.isPrimary);
        if (primaryGroup) {
          const dataEvento = primaryGroup.date
            ? `\n📅 Dia: *${primaryGroup.date}*`
            : "";
          messageText = `✅ Pronto, *${nomeCompleto}*! Aqui está o acesso para o grupo de ${primaryGroup.name}:\n\n${primaryGroup.link}\n\n⏰ Seu horário: *${horarioSelecionado}* 😁${dataEvento}\n\nClique no link para participar!`;
        } else {
          const primaryLink = await groupService.getPrimaryGroupLink();
          messageText = `✅ Pronto, *${nomeCompleto}*! Aqui está o acesso para o grupo:\n\n${primaryLink}\n\n⏰ Seu horário: *${horarioSelecionado}* 😁\n\nClique no link para participar!`;
        }
      } else {
        const selectedCityData = chatContext[userNumber]?.selectedCityData;
        if (selectedCityData) {
          const dataEvento = selectedCityData.date
            ? `\n📅 Dia: *${selectedCityData.date}*`
            : "";
          messageText = `✅ Pronto, *${nomeCompleto}*! Aqui está o acesso para o grupo de ${selectedCityData.name}:\n\n${selectedCityData.link}\n\n⏰ Seu horário: *${horarioSelecionado}* 😁${dataEvento}\n\nClique no link para participar!`;
        } else {
          messageText = `✅ Pronto, *${nomeCompleto}*! Aqui está o acesso para os grupos disponíveis:\n\n`;
          messageText += allGroups
            .map(
              (group) => `🔗 ${group.descricao || group.name}: ${group.link}`
            )
            .join("\n\n");
          messageText += `\n\n⏰ Seu horário: *${horarioSelecionado}* 😁\n\nEscolha o grupo que preferir!`;
        }
      }

      // Delay antes da mensagem final com links
      await delay.smartDelay({ minMs: 5000, maxMs: 25000 });
      await client.sendMessage(msg.from, messageText);
      indicadores.incrementarConvidados();

      delete userStates[userNumber];
      delete chatContext[userNumber];
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      // Mensagem de erro - SEM delay
      await msg.reply(
        "❌ Ocorreu um erro ao enviar o(s) link(s) do grupo. Por favor, tente novamente mais tarde."
      );

      timeout.cancelTimeout(userNumber);
      delete userStates[userNumber];
      delete chatContext[userNumber];
    }
  }
};
