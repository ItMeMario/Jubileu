// groupFilter.js - Middleware para filtrar mensagens de grupos
const { GroupChat } = require("whatsapp-web.js");
const { debug } = require("../services/debugService");

/**
 * Middleware para filtrar mensagens vindas de grupos
 * Retorna true se a mensagem deve ser ignorada (veio de grupo)
 * Retorna false se a mensagem deve ser processada (conversa privada)
 */
async function shouldIgnoreMessage(msg) {
  try {
    // Obtém o chat da mensagem
    const chat = await msg.getChat();

    // 🚫 Verificação 0: Status do WhatsApp (Broadcast)
    // Mensagens vindas de 'status@broadcast' são atualizações de status dos contatos.
    // Responder a isso faz o bot postar no próprio status.
    if (msg.from === "status@broadcast" || msg.isStatus) {
      await debug(
        `🚫 Mensagem ignorada - atualização de status (de: ${msg.from})`
      );
      return true;
    }

    // Verifica se é um grupo
    if (chat.isGroup) {
      await debug(
        `🚫 Mensagem ignorada - veio do grupo: ${chat.name} (ID: ${chat.id._serialized})`
      );
      return true; // Ignorar mensagem de grupo
    }

    // Verificação adicional usando instanceof (backup)
    if (chat instanceof GroupChat) {
      await debug(
        `🚫 Mensagem ignorada - detectado como GroupChat: ${chat.name} (ID: ${chat.id._serialized})`
      );
      return true; // Ignorar mensagem de grupo
    }

    // Verificação pelo ID do chat (grupos sempre têm '-g' no ID)
    if (chat.id._serialized.includes("@g.us")) {
      await debug(
        `🚫 Mensagem ignorada - ID indica grupo: ${chat.id._serialized}`
      );
      return true; // Ignorar mensagem de grupo
    }

    // Se chegou até aqui, é uma conversa privada
    await debug(
      `✅ Mensagem aceita - conversa privada com: ${
        chat.name || "Usuário"
      } (ID: ${chat.id._serialized})`
    );
    return false; // Processar mensagem privada
  } catch (error) {
    console.error("❌ Erro ao verificar tipo de chat:", error);

    // Em caso de erro, assume como grupo por segurança (para não enviar mensagens indevidas)
    await debug("🚫 Mensagem ignorada por precaução devido ao erro");
    return true;
  }
}

/**
 * Função para obter informações detalhadas do chat (útil para debug)
 */
async function getChatInfo(msg) {
  try {
    const chat = await msg.getChat();
    const contact = await msg.getContact();

    return {
      isGroup: chat.isGroup,
      chatType: chat.constructor.name,
      chatId: chat.id._serialized,
      chatName: chat.name || contact.pushname || "Desconhecido",
      participantCount: chat.isGroup ? chat.participants?.length : 1,
      fromNumber: msg.from,
      timestamp: new Date(msg.timestamp * 1000).toLocaleString("pt-BR"),
    };
  } catch (error) {
    console.error("❌ Erro ao obter informações do chat:", error);
    return null;
  }
}

/**
 * Função para logar estatísticas de uso (opcional)
 */
function logChatStats(chatInfo) {
  if (!chatInfo) return;

  debug(`📊 Chat Info:`, {
    tipo: chatInfo.isGroup ? "👥 Grupo" : "👤 Privado",
    nome: chatInfo.chatName,
    id: chatInfo.chatId,
    participantes: chatInfo.participantCount,
    horario: chatInfo.timestamp,
  });
}

module.exports = {
  shouldIgnoreMessage,
  getChatInfo,
  logChatStats,
};
