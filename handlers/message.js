const client = require("../client");
const { enviarMensagemMenu, enviarMenuHorarios, chatContext } = require("../handlers/menuMessage");
const HORARIOS = require("../horarios");
const { enviarFAQ } = require("../handlers/faq");
const { normalizarTexto, hasTriggerText } = require("../utils/triggers");
const groupService = require("../services/groupService");

// Estado dos usuários
const userStates = {};

// Encontra o horário baseado no input do usuário
function encontrarHorario(inputUsuario) {
  const inputNormalizado = normalizarTexto(inputUsuario);

  // Se for um número direto (1‑6)
  if (/^[1-6]$/.test(inputNormalizado)) {
    const opcao = parseInt(inputNormalizado);
    const horario = Object.values(HORARIOS).find((h) => h.id === opcao);
    return horario ? { ...horario, id: opcao } : null;
  }

  return HORARIOS[inputNormalizado] || null;
}

// Handler principal
module.exports = async function messageHandler(msg) {
  const chat = await msg.getChat();
  const userNumber = msg.from;

  // Extrai o texto da mensagem (se for texto puro, imagem ou vídeo com legenda)
  const textoDaMensagem = msg.caption || msg.body || "";

  /* ─────────────────────────────────────
     1) INÍCIO DO ATENDIMENTO
  ────────────────────────────────────── */
  if (!userStates[userNumber] && hasTriggerText(textoDaMensagem) && msg.from.endsWith("@c.us")) {
    const currentMode = groupService.getCurrentMode();

    if (currentMode === 'MULTI') {
      await enviarMensagemMenu(client, msg, chat);
      userStates[userNumber] = { step: "awaiting_city", started: true };
    } else {
      await enviarMensagemMenu(client, msg, chat);
      userStates[userNumber] = { step: "awaiting_time", started: true };
    }
    return;
  }

  if (hasTriggerText(textoDaMensagem) && msg.from.endsWith("@c.us")) {
    if (userStates[userNumber]?.started) {
      // Já iniciou o fluxo, ignora novo gatilho
      return;
    }

    const currentMode = groupService.getCurrentMode();

    if (currentMode === 'MULTI') {
      await enviarMensagemMenu(client, msg, chat);
      userStates[userNumber] = { step: "awaiting_city", started: true };
    } else {
      await enviarMensagemMenu(client, msg, chat);
      userStates[userNumber] = { step: "awaiting_time", started: true };
    }
    return;
  }

  /* ─────────────────────────────────────
     2) ESCOLHA DE CIDADE (apenas MULTI)
  ────────────────────────────────────── */
  if (userStates[userNumber]?.step === "awaiting_city") {
    const inputCidade = normalizarTexto(msg.body?.trim() || "");
    const allGroups = groupService.getAllGroups();
    const selectedCityData = groupService.findCityByInput(inputCidade, allGroups);

    if (selectedCityData) {
      chatContext[userNumber] = { selectedCityData };
      await enviarMenuHorarios(client, msg.from, chat); 
      userStates[userNumber].step = "awaiting_time";
    } else {
      await client.sendMessage(
        msg.from,
        "🤔 Desculpe, não encontrei essa cidade. Tente novamente."
      );
    }
    return;
  }

  /* ─────────────────────────────────────
     3) ESCOLHA DE HORÁRIO
  ────────────────────────────────────── */
  if (userStates[userNumber]?.step === "awaiting_time") {
    const inputUsuario = msg.body?.trim() || "";

    if (inputUsuario === "7") {
      await enviarFAQ(client, msg);
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
        `Você escolheu *${opcao.horario} - ${opcao.descricao}*.
Por favor, digite seu nome completo para confirmar. 😊`
      );
    } else {
      await client.sendMessage(
        msg.from,
        `🤔 Desculpe, não entendi. Qual horário você gostaria mesmo?\n\n` +
        `Se precisar de ajuda, digite *7* para acessar as *Perguntas Frequentes (FAQ)*`
      );
    }
    return;
  }

  /* ─────────────────────────────────────
     4) NOME E ENVIO DE LINK(S)
  ────────────────────────────────────── */
  if (userStates[userNumber]?.step === "awaiting_name") {
    const nomeCompleto = msg.body?.trim();
    const horarioSelecionado = userStates[userNumber].selectedTime;

    try {
      const currentMode = groupService.getCurrentMode();
      const allGroups = groupService.getAllGroups();

      if (allGroups.length === 0) {
        throw new Error("Nenhum grupo configurado");
      }

      let messageText;

      if (currentMode === "SINGLE") {
        const primaryLink = groupService.getPrimaryGroupLink();
        messageText = `✅ Pronto, *${nomeCompleto}*! Aqui está o link para entrar no grupo:\n\n${primaryLink}\n\n⏰ Seu horário: *${horarioSelecionado}* 😁\n\nClique no link para participar!`;
      } else {
        const selectedCityData = chatContext[userNumber]?.selectedCityData;

        if (selectedCityData) {
          messageText = `✅ Pronto, *${nomeCompleto}*! Aqui está o link para ${selectedCityData.name}:\n\n${selectedCityData.link}\n\n⏰ Seu horário: *${horarioSelecionado}* 😁\n\nClique no link para participar!`;
          delete chatContext[userNumber];
        } else {
          messageText = `✅ Pronto, *${nomeCompleto}*! Aqui estão os links dos grupos disponíveis:\n\n`;
          messageText += allGroups
            .map(
              (group) =>
                `🔗 ${group.descricao || `Grupo ${group.id}`}: ${group.link}`
            )
            .join("\n\n");
          messageText += `\n\n⏰ Seu horário: *${horarioSelecionado}* 😁\n\nEscolha o grupo que preferir!`;
        }
      }

      await client.sendMessage(msg.from, messageText);
      delete userStates[userNumber];
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      await msg.reply(
        "❌ Ocorreu um erro ao enviar o(s) link(s) do grupo. Por favor, tente novamente mais tarde."
      );
      delete userStates[userNumber];
      delete chatContext[userNumber];
    }
  }
};
