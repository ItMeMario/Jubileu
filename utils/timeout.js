// timeout.js
const { getMessage } = require("../utils/messageReader");
const MessageType = require("../config/messageType");
const { sendMessageOptions } = require("../config/compatibility/whatsappCompatibility");

// Tempo de timeout em milissegundos (30 minutos)(1800000)
const TIMEOUT_DURATION = 1800000;

// Número máximo de mensagens de timeout a enviar
const MAX_TIMEOUT_MESSAGES = 2;

// Armazena os timeouts ativos
const activeTimeouts = new Map();

// Armazena o contador de mensagens de timeout enviadas por usuário
// Estrutura: { userNumber: { count: number, firstTimeout: timestamp } }
const timeoutMessageCount = new Map();

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
      // Verifica se já enviou o número máximo de mensagens de timeout
      const messageStats = timeoutMessageCount.get(userNumber);

      if (messageStats && messageStats.count >= MAX_TIMEOUT_MESSAGES) {
        // Já enviou 2 mensagens, não envia mais
        console.log(`[TIMEOUT] Limite de mensagens atingido para ${userNumber}`);
        activeTimeouts.delete(userNumber);
        return;
      }

      // Busca a mensagem de timeout do banco com as variáveis necessárias
      const timeoutMessage = await getMessage(MessageType.TIMEOUT, {
        name: name || "usuário",
      });

      await client.sendMessage(userNumber, timeoutMessage, sendMessageOptions);

      // Incrementa o contador de mensagens de timeout
      if (messageStats) {
        messageStats.count++;
      } else {
        timeoutMessageCount.set(userNumber, {
          count: 1,
          firstTimeout: Date.now()
        });
      }

      activeTimeouts.delete(userNumber);
    } catch (error) {
      console.error("Erro ao enviar mensagem de timeout:", error);

      // Fallback em caso de erro - mensagem básica padronizada
      // COMENTADO: Se não tiver no banco, não envia nada (conforme solicitado)
      /*
      try {
        const messageStats = timeoutMessageCount.get(userNumber);

        // Verifica o limite também no fallback
        if (messageStats && messageStats.count >= MAX_TIMEOUT_MESSAGES) {
          console.log(`[TIMEOUT] Limite de mensagens atingido para ${userNumber} (fallback)`);
          activeTimeouts.delete(userNumber);
          return;
        }

        const fallbackMessage =
          `Oi *{{name}}*, eu percebi seu interesse em participar da seleção... Digite *MENU* para fazer a sua inscrição e garantir a sua vaga.`.replace(
            "{{name}}",
            name || "usuário"
          );

        await client.sendMessage(userNumber, fallbackMessage, sendMessageOptions);

        // Incrementa o contador também no fallback
        if (messageStats) {
          messageStats.count++;
        } else {
          timeoutMessageCount.set(userNumber, {
            count: 1,
            firstTimeout: Date.now()
          });
        }

        activeTimeouts.delete(userNumber);
      } catch (fallbackError) {
        console.error(
          "Erro no fallback da mensagem de timeout:",
          fallbackError
        );
      }
      */
      activeTimeouts.delete(userNumber);
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

/**
 * Reseta o contador de mensagens de timeout para um usuário
 * Deve ser chamado quando o usuário interage com o bot
 * @param {string} userNumber
 */
function resetTimeoutCount(userNumber) {
  timeoutMessageCount.delete(userNumber);
}

/**
 * Incrementa o contador de mensagens de timeout para um usuário
 * Usado quando enviamos mensagens de "suspended" do anti-spam
 * @param {string} userNumber
 */
function incrementTimeoutCount(userNumber) {
  const messageStats = timeoutMessageCount.get(userNumber);

  if (messageStats) {
    messageStats.count++;
  } else {
    timeoutMessageCount.set(userNumber, {
      count: 1,
      firstTimeout: Date.now()
    });
  }
}

/**
 * Obtém informações sobre o timeout de um usuário (para debug/monitoramento)
 * @param {string} userNumber
 * @returns {object|null} Informações do timeout ou null se não houver
 */
function getTimeoutInfo(userNumber) {
  return timeoutMessageCount.get(userNumber) || null;
}

module.exports = {
  startTimeout,
  cancelTimeout,
  resetTimeoutCount,
  incrementTimeoutCount,
  getTimeoutInfo,
};
