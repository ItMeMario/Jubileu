const { chatContext } = require("./menuMessage");
const indicadores = require("../utils/indicadores");
const delay = require("../utils/delay");
const timeout = require("../utils/timeout");
const { debug } = require("../services/debugService");

// Importar módulos do nameHandlerModules
const messageManagerNHM = require("./nameHandlerModules/messageManagerNHM");
const audioManagerNHM = require("./nameHandlerModules/audioManagerNHM");
const inviteProcessorNHM = require("./nameHandlerModules/inviteProcessorNHM");

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
        horarioSelecionado
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

  async generateInviteMessage(
    client,
    userNumber,
    nomeCompleto,
    horarioSelecionado
  ) {
    // Sempre usa modo MULTI
    return await inviteProcessorNHM.handleMultiMode(
      client,
      userNumber,
      nomeCompleto,
      horarioSelecionado
    );
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

    const errorMessage = await messageManagerNHM.getGroupErrorMessage();
    await msg.reply(errorMessage);

    timeout.cancelTimeout(userNumber);
    delete userStates[userNumber];
    delete chatContext[userNumber];
  }
}

module.exports = NameHandler;
