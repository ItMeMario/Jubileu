// timeout.js
const { getMessage } = require("../utils/messageReader");
const MessageType = require("../config/messageType");

// Tempo de timeout em milissegundos (30 minutos)(1800000)
const TIMEOUT_DURATION = 1800000;

// Armazena os timeouts ativos
const activeTimeouts = new Map();

/**
 * Inicia um timeout para uma conversa
 * @param {object} client - Instância do cliente do WhatsApp
 * @param {string} userNumber - Número do usuário
 * @param {object} chat - Objeto do chat do WhatsApp
 * @param {string} name - Nome do usuário
 */
async function startTimeout(client, userNumber, chat, name = "") {
  // Cancela qualquer timeout existente para este usuário
  cancelTimeout(userNumber);

  // Configura novo timeout
  const timeoutId = setTimeout(async () => {
    try {
      // Busca a mensagem de timeout do banco com as variáveis necessárias
      const timeoutMessage = await getMessage(MessageType.TIMEOUT, {
        name: name || "usuário",
      });

      await client.sendMessage(userNumber, timeoutMessage);
      activeTimeouts.delete(userNumber);
    } catch (error) {
      console.error("Erro ao enviar mensagem de timeout:", error);

      // Fallback em caso de erro - mensagem básica padronizada
      try {
        const fallbackMessage =
          `Oi *{{name}}*, eu percebi seu interesse em participar da seleção... Digite *MENU* para fazer a sua inscrição e garantir a sua vaga.`.replace(
            "{{name}}",
            name || "usuário"
          );

        await client.sendMessage(userNumber, fallbackMessage);
        activeTimeouts.delete(userNumber);
      } catch (fallbackError) {
        console.error(
          "Erro no fallback da mensagem de timeout:",
          fallbackError
        );
      }
    }
  }, TIMEOUT_DURATION);

  activeTimeouts.set(userNumber, timeoutId);
}

/**
 * Cancela um timeout ativo
 * @param {string} userNumber
 */
function cancelTimeout(userNumber) {
  if (activeTimeouts.has(userNumber)) {
    clearTimeout(activeTimeouts.get(userNumber));
    activeTimeouts.delete(userNumber);
  }
}

module.exports = {
  startTimeout,
  cancelTimeout,
};
