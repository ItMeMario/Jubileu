// messageTypeHandler.js - Gerenciador de tipos de mensagem não suportados
const { antiSpamManager } = require("../utils/antiSpam");

// Configurações para tipos de mensagem não suportados
const UNSUPPORTED_MESSAGE_CONFIG = {
  audio: {
    message:
      "🎵 Desculpe, não consigo escutar áudios! 😅\n\nPor favor, digite sua mensagem por texto para que eu possa te ajudar melhor. 📝\n\nSe precisar de ajuda, digite *AJUDA* ou *FAQ*! 😊",
    incrementSpam: true,
    logMessage: "Usuário enviou áudio",
  },
  video: {
    message:
      "🎥 Desculpe, não consigo visualizar vídeos! 😅\n\nPor favor, digite sua mensagem por texto para que eu possa te ajudar melhor. 📝",
    incrementSpam: true,
    logMessage: "Usuário enviou vídeo",
  },
  document: {
    message:
      "📄 Desculpe, não consigo abrir documentos! 😅\n\nPor favor, digite sua mensagem por texto para que eu possa te ajudar melhor. 📝",
    incrementSpam: false, // Documentos podem ser enviados por engano, não conta como spam
    logMessage: "Usuário enviou documento",
  },
  sticker: {
    message:
      "😄 Que figurinha legal! Mas preciso que você digite sua mensagem por texto para que eu possa te ajudar. 📝",
    incrementSpam: false, // Stickers são mais casuais, não conta como spam
    logMessage: "Usuário enviou sticker",
  },
  emoji: {
    message:
      "😄 Emoji legal! Mas preciso que você digite sua resposta em texto para que eu possa te ajudar. 📝",
    incrementSpam: false, // Emojis são casuais, não contam como spam
    logMessage: "Usuário enviou apenas emoji",
  },
};

// --- Helper robusto para detectar "apenas emoji" ---
function isEmojiOnly(body) {
  if (!body) return false;
  const s = body.trim();
  if (!s) return false;

  // Se houver QUALQUER letra ou número (de qualquer idioma), não é "apenas emoji".
  // Isso evita classificar 2️⃣, 3️⃣ etc. como emoji, pois contêm um dígito.
  if (/[\p{L}\p{N}]/u.test(s)) return false;

  // Remove ZWJ (ligaduras), VS16 (variação emoji) e espaços
  const stripped = s.replace(/[\u200D\uFE0F\s]/g, "");

  // Se depois disso restar apenas pictogramas, consideramos "apenas emoji"
  return (
    stripped.length > 0 && /^[\p{Extended_Pictographic}]+$/u.test(stripped)
  );
}

class MessageTypeHandler {
  /**
   * Verifica se a mensagem é de um tipo não suportado
   * @param {Object} msg - Objeto da mensagem do WhatsApp
   * @returns {string|null} - Retorna o tipo da mensagem se não suportada, null caso contrário
   */
  getUnsupportedMessageType(msg) {
    // Verifica se é áudio (ptt = push to talk, áudio gravado pelo WhatsApp)
    if (msg.type === "ptt" || msg.type === "audio") {
      return "audio";
    }

    // Verifica se é vídeo
    if (msg.type === "video") {
      return "video";
    }

    // Verifica se é documento
    if (msg.type === "document") {
      return "document";
    }

    // Verifica se é sticker
    if (msg.type === "sticker") {
      return "sticker";
    }

    // ✅ Novo: Detecta mensagens compostas APENAS por emoji (com salvaguardas)
    if (
      msg.type === "chat" &&
      typeof msg.body === "string" &&
      isEmojiOnly(msg.body)
    ) {
      return "emoji";
    }

    return null;
  }

  /**
   * Processa mensagem de tipo não suportado
   * @param {Object} client - Cliente do WhatsApp
   * @param {Object} msg - Mensagem recebida
   * @param {string} messageType - Tipo da mensagem não suportada
   * @returns {Promise<Object>} - Resultado do processamento
   */
  async handleUnsupportedMessage(client, msg, messageType) {
    const userNumber = msg.from;
    const config = UNSUPPORTED_MESSAGE_CONFIG[messageType];

    if (!config) {
      console.warn(`⚠️ Tipo de mensagem não configurado: ${messageType}`);
      return { handled: false };
    }

    console.log(`📱 ${config.logMessage} de: ${userNumber}`);

    try {
      // Verifica se deve incrementar contador de spam
      if (config.incrementSpam) {
        // Verifica se usuário já está suspenso
        if (antiSpamManager.isUserSuspended(userNumber)) {
          const remainingMinutes =
            antiSpamManager.getSuspensionTimeRemaining(userNumber);
          await antiSpamManager.handleSpamAction(client, msg, "suspended", {
            remainingMinutes,
          });
          return {
            handled: true,
            action: "suspended",
            remainingMinutes,
          };
        }

        // Incrementa contador de spam
        const spamCheck = await antiSpamManager.incrementAttempts(userNumber);

        // Envia mensagem padrão do tipo não suportado
        await client.sendMessage(userNumber, config.message);

        // Processa ação de spam se necessário
        if (spamCheck.action === "send_faq") {
          await antiSpamManager.handleSpamAction(client, msg, "send_faq");
          return {
            handled: true,
            action: "faq_sent",
            spamCount: spamCheck.count,
          };
        } else if (spamCheck.action === "suspend") {
          await antiSpamManager.handleSpamAction(client, msg, "suspend", {
            suspendDurationMinutes: spamCheck.suspendDurationMinutes,
          });
          return {
            handled: true,
            action: "suspended",
            suspendDurationMinutes: spamCheck.suspendDurationMinutes,
          };
        }

        return {
          handled: true,
          action: "message_sent",
          spamCount: spamCheck.count,
        };
      } else {
        // Apenas envia mensagem informativa sem incrementar spam
        await client.sendMessage(userNumber, config.message);
        return {
          handled: true,
          action: "info_sent",
        };
      }
    } catch (error) {
      console.error(`❌ Erro ao processar mensagem ${messageType}:`, error);
      return {
        handled: false,
        error: error.message,
      };
    }
  }

  /**
   * Método principal para verificar e processar mensagens não suportadas
   * @param {Object} client - Cliente do WhatsApp
   * @param {Object} msg - Mensagem recebida
   * @returns {Promise<Object>} - Resultado do processamento
   */
  async processMessage(client, msg) {
    const unsupportedType = this.getUnsupportedMessageType(msg);

    if (unsupportedType) {
      return await this.handleUnsupportedMessage(client, msg, unsupportedType);
    }

    return { handled: false };
  }

  /**
   * Adiciona novo tipo de mensagem não suportada
   * @param {string} type - Tipo da mensagem
   * @param {Object} config - Configuração do tipo
   */
  addUnsupportedType(type, config) {
    UNSUPPORTED_MESSAGE_CONFIG[type] = {
      message: config.message || "Tipo de mensagem não suportado.",
      incrementSpam:
        config.incrementSpam !== undefined ? config.incrementSpam : true,
      logMessage: config.logMessage || `Usuário enviou ${type}`,
    };
  }

  /**
   * Obtém estatísticas dos tipos de mensagem
   * @returns {Object} - Estatísticas
   */
  getStats() {
    return {
      supportedTypes: Object.keys(UNSUPPORTED_MESSAGE_CONFIG),
      config: UNSUPPORTED_MESSAGE_CONFIG,
    };
  }
}

// Instância singleton
const messageTypeHandler = new MessageTypeHandler();

module.exports = {
  messageTypeHandler,
  UNSUPPORTED_MESSAGE_CONFIG,
};
