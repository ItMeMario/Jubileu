const client = require("../client");
const enviarMensagemMenu = require("./menuMessage");
const HORARIOS = require("../horarios");
const { enviarFAQ } = require("../handlers/faq");
const { normalizarTexto, hasTriggerText } = require("../utils/triggers");
const configService = require("../services/configServices"); // Importação adicionada

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

  // Verifica se é uma mensagem de início de atendimento
  if (hasTriggerText(textoDaMensagem) && msg.from.endsWith("@c.us")) {
    await enviarMensagemMenu(client, msg, chat);
    userStates[userNumber] = { step: "awaiting_time" };
    return;
  }

  // Se o usuário está escolhendo o horário
  if (userStates[userNumber]?.step === "awaiting_time") {
    const inputUsuario = msg.body?.trim() || "";
    
    // Verifica se o usuário digitou "7" para acessar o FAQ
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
        `Você escolheu *${opcao.horario} - ${opcao.descricao}*.\nPor favor, digite seu nome completo para confirmar. 😊`
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

  // Se o usuário está enviando o nome
  if (userStates[userNumber]?.step === "awaiting_name") {
    const nomeCompleto = msg.body?.trim();
    const horarioSelecionado = userStates[userNumber].selectedTime;
    const groupLink = configService.getGroupLink(); // Obtém o link dinamicamente

    try {
      await client.sendMessage(
        msg.from,
        `✅ Pronto, *${nomeCompleto}*! Aqui está o link para entrar no grupo:\n\n${groupLink}\n\n⏰ Seu horário: *${horarioSelecionado}* 😁\n\nClique no link para participar!`
      );
      delete userStates[userNumber];
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      await msg.reply(
        "❌ Ocorreu um erro ao enviar o link do grupo. Por favor, tente novamente mais tarde."
      );
      delete userStates[userNumber];
    }
  }
};