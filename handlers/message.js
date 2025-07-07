const client = require("../client");
const enviarMensagemMenu = require("./menuMessage");
const HORARIOS = require("../horarios"); // Importa o novo mapeamento
const faq = require("./faq");

// Defina o link do seu grupo
const LINK_DO_GRUPO =
  "https://chat.whatsapp.com/Lg2h2Yc5p1s38oefhLsWO8?mode=r_c"; // Substitua pelo link real

// Objeto para controlar o estado dos usuários
const userStates = {};

// Função para normalizar o texto de entrada
function normalizarTexto(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-z0-9\s]/g, "") // Remove caracteres especiais
    .trim();
}

// Função para encontrar horário
function encontrarHorario(inputUsuario) {
  const inputNormalizado = normalizarTexto(inputUsuario);

  // Verifica se é um número direto (1-6)
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

  // 1. Pega o texto REAL da mensagem, independente de ser mídia ou não
  const textoDaMensagem = msg.caption || msg.body || "";

  // 2. Verifica triggers (agora funciona para mídia COM OU SEM caption)
  if (hasTriggerText(textoDaMensagem) && msg.from.endsWith("@c.us")) {
    await enviarMensagemMenu(client, msg, chat);
    userStates[userNumber] = { step: "awaiting_time" };
    return;
  }

  // Se for mensagem inicial (menu, oi, etc.)
  const hasTriggerText = (text) => {
    return (
      text.match(/menu/i) ||
      text.match(
        /Olá! Tenho interesse e queria mais informações, por favor/i
      ) ||
      text.match(
        /Link Olá! Tenho interesse e queria mais informações, por favor/i
      ) ||
      text.match(/Olá! Posso saber mais informações sobre isto?/i)
    );
  };

  if (
    ((msg.body && hasTriggerText(msg.body)) ||
      (msg.hasMedia && msg.caption && hasTriggerText(msg.caption)) ||
      (msg.hasMedia && msg.body && hasTriggerText(msg.body))) &&
    msg.from.endsWith("@c.us")
  ) {
    await enviarMensagemMenu(client, msg, chat);
    userStates[userNumber] = { step: "awaiting_time" }; // Define estado
    return;
  }

  // Se o usuário está no estado "awaiting_time" (escolhendo horário)
  if (userStates[userNumber]?.step === "awaiting_time") {
    const opcao = encontrarHorario(msg.body.trim());

    if (opcao) {
      userStates[userNumber] = {
        step: "awaiting_name",
        selectedTime: `${opcao.horario} - ${opcao.descricao}`,
        selectedTimeObj: opcao, // Guarda o objeto completo para referência
      };
      await chat.sendStateTyping();
      await client.sendMessage(
        msg.from,
        `Você escolheu *${opcao.horario} - ${opcao.descricao}*.\nPor favor, digite seu nome completo para confirmar. 😊`
      );
    } else {
      // Mensagem de erro com opção de FAQ
      await client.sendMessage(
        msg.from,
        `🤔 Desculpe, não entendi. Qual horário você gostaria mesmo?\n\n` +
          `Se precisar de ajuda, digite *7* para acessar as *Perguntas Frequentes (FAQ)*`
      );
    }
    return;
  }

  // Se o usuário está no estado "awaiting_name" (enviando nome)
  if (userStates[userNumber]?.step === "awaiting_name") {
    const nomeCompleto = msg.body.trim();
    const horarioSelecionado = userStates[userNumber].selectedTime;

    try {
      // Mensagem no privado com o link do grupo
      await client.sendMessage(
        msg.from,
        `✅ Pronto, *${nomeCompleto}*! Aqui está o link para entrar no grupo:\n\n${LINK_DO_GRUPO}\n\n⏰ Seu horário: *${horarioSelecionado}* 😁\n\nClique no link para participar!`
      );

      // Limpa o estado
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
