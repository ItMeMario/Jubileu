const delay = require('../utils/delay');

// Tempo de timeout em milissegundos (30 segundos)
const TIMEOUT_DURATION = 1800000 ;

// Mensagem de timeout
const TIMEOUT_MESSAGE = "⏳ *Ops!* Parece que houve algum problema na conversa. Se ainda estiver interessado(a), digite *MENU* e tentamos novamente!";

// Armazena os timeouts ativos
const activeTimeouts = new Map();

/**
 * Inicia um timeout para uma conversa
 * @param {object} client - Instância do cliente do WhatsApp
 * @param {string} userNumber - Número do usuário
 * @param {object} chat - Objeto do chat do WhatsApp
 */
async function startTimeout(client, userNumber, chat) {
  // Cancela qualquer timeout existente para este usuário
  cancelTimeout(userNumber);

  // Configura novo timeout
  const timeoutId = setTimeout(async () => {
    try {
      await client.sendMessage(userNumber, TIMEOUT_MESSAGE);
      activeTimeouts.delete(userNumber);
    } catch (error) {
      console.error('Erro ao enviar mensagem de timeout:', error);
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