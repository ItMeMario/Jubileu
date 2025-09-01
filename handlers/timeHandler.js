// handlers/timeHandler.js
const HORARIOS = require("../aliases/horariosIdAliases");
const { normalizarTextoHorario } = require("../utils/triggers");
const delay = require("../utils/delay");
const indicadores = require("../utils/indicadores");
const { debug } = require("../services/debugService");

class timeHandler {
  async process(client, msg, userStates, userNumber, antiSpamManager) {
    const inputUsuario = msg.body?.trim() || "";
    const opcao = this.encontrarHorario(inputUsuario);

    if (opcao) {
      await this.handleTimeFound(
        client,
        msg,
        userStates,
        userNumber,
        opcao,
        antiSpamManager
      );
    } else {
      await this.handleTimeNotFound(client, msg, userNumber, antiSpamManager);
    }
  }

  encontrarHorario(inputUsuario) {
    const inputNormalizado = normalizarTextoHorario(inputUsuario);

    if (/^[1-6]$/.test(inputNormalizado)) {
      const opcao = parseInt(inputNormalizado);
      const horario = Object.values(HORARIOS).find((h) => h.id === opcao);
      return horario ? { ...horario, id: opcao } : null;
    }

    return HORARIOS[inputNormalizado] || null;
  }

  async handleTimeFound(
    client,
    msg,
    userStates,
    userNumber,
    opcao,
    antiSpamManager
  ) {
    await antiSpamManager.resetUserAttempts(userNumber);

    try {
      await indicadores.incrementarHorario(opcao.id);
      await debug(`✅ Horário ${opcao.id} incrementado no banco`);
    } catch (error) {
      console.error("Erro ao incrementar horário:", error);
    }

    userStates[userNumber] = {
      ...userStates[userNumber],
      step: "awaiting_name",
      selectedTime: `${opcao.horario} - ${opcao.descricao}`,
      selectedTimeObj: opcao,
    };

    const chat = await msg.getChat();
    await chat.sendStateTyping();
    await delay.smartDelay({ minMs: 5000, maxMs: 25000 });

    await client.sendMessage(
      msg.from,
      `Você escolheu *${opcao.horario} - ${opcao.descricao}*.\nAgora digite somente o seu *NOME COMPLETO* para confirmar a sua inscrição, por favor!😊`
    );
  }

  async handleTimeNotFound(client, msg, userNumber, antiSpamManager) {
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

    await client.sendMessage(
      msg.from,
      `🤔 Desculpe, horário não reconhecido. Digite apenas o horário que você escolheu.\n\nE se precisar de ajuda, digite a palavra *AJUDA* ou *FAQ* que vou te enviar a lista com as dúvidas mais comuns sobre a nossa seleção.`
    );
  }
}

// Função movida dos menus para cá
async function enviarMenuHorarios(client, chatId, chat) {
  await chat.sendStateTyping();

  const timeMenu = `⚠*IMPORTANTE: Escolha seu horário:*
_Horarios disponíveis_
1️⃣ - 10:00h (Manhã)
2️⃣ - 12:00h (Meio-dia)
3️⃣ - 14:00h (Depois do almoço)
4️⃣ - 15:30h (Tarde)
5️⃣ - 17:30h (Final da tarde)
6️⃣ - 19:30h (Noite)`;

  // Delay antes do menu de horários
  await delay.smartDelay({ minMs: 5000, maxMs: 25000 });
  await client.sendMessage(chatId, timeMenu);
}

module.exports = { timeHandler, enviarMenuHorarios };
