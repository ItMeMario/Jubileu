const client = require("../client/client");
const { enviarMensagemMenu, enviarMenuHorarios, chatContext } = require("../handlers/menuMessage");
const HORARIOS = require("../horarios");
const { enviarFAQ } = require("../utils/faq");
const { normalizarTexto, hasTriggerText } = require("../utils/triggers");
const groupService = require("../services/groupService");
const timeout = require('../utils/timeout');

// Estado dos usuários
const userStates = {};

// Encontra o horário baseado no input do usuário
function encontrarHorario(inputUsuario) {
  const inputNormalizado = normalizarTexto(inputUsuario);

  // Se for um número direto (1-6)
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
     0) TRATAMENTO DO FAQ (nova seção)
  ────────────────────────────────────── */
   if (textoDaMensagem.toLowerCase() === "ajuda" || textoDaMensagem.toLowerCase() === "faq") {
    await enviarFAQ(client, msg);
    timeout.cancelTimeout(userNumber);
    return;
  }

  /* ─────────────────────────────────────
     0.1) TRATAMENTO DO MENU (nova seção)
  ────────────────────────────────────── */
  if (textoDaMensagem.toLowerCase() === "menu") {
    timeout.cancelTimeout(userNumber);
    delete userStates[userNumber];
    delete chatContext[userNumber];
    
    const currentMode = groupService.getCurrentMode();
    
    if (currentMode === 'MULTI') {
        await enviarMensagemMenu(client, msg, chat);
        userStates[userNumber] = { step: "awaiting_city", started: true };
        await timeout.startTimeout(client, userNumber, chat); // ADICIONADO - inicia timeout após menu
    } else {
        await enviarMensagemMenu(client, msg, chat);
        userStates[userNumber] = { step: "awaiting_time", started: true };
        await timeout.startTimeout(client, userNumber, chat); // ADICIONADO - inicia timeout após menu
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
      await timeout.startTimeout(client, userNumber, chat); // ADICIONADO - inicia timeout após seleção de cidade
    } else {
      await client.sendMessage(
        msg.from,
        "🤔 Desculpe, não encontrei essa cidade. Tente novamente."
      );
      await timeout.startTimeout(client, userNumber, chat); // ADICIONADO - reinicia timeout se cidade inválida
    }
    return;
  }

  /* ─────────────────────────────────────
     3) ESCOLHA DE HORÁRIO
  ────────────────────────────────────── */
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
        `Você escolheu *${opcao.horario} - ${opcao.descricao}*.
Agora digite somente o seu *NOME COMPLETO* para confirmar a sua inscrição, por favor!😊`
      );
      await timeout.startTimeout(client, userNumber, chat);
    } else {
      timeout.cancelTimeout(userNumber);
      await client.sendMessage(
        msg.from,
        `🤔 Desculpe, não entendi. Digite apenas o horário que você escolheu para darmos sequência ao seu atendimento, por favor!\n\n` +
        `E se precisar de ajuda, digite a palavra *AJUDA* ou *FAQ* que vou te enviar a lista com as dúvidas mais comuns sobre a nossa seleção.`
      );
      await timeout.startTimeout(client, userNumber, chat);
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
      timeout.cancelTimeout(userNumber);
      
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
      timeout.cancelTimeout(userNumber);
      delete userStates[userNumber];
      delete chatContext[userNumber];
    }
  }
};