// groupFilter.js - Middleware para filtrar mensagens de grupos
const { debug } = require("../services/debugService");

/**
 * Lista de comandos permitidos em grupos
 * Estes comandos não serão filtrados mesmo em grupos
 */
const ALLOWED_GROUP_COMMANDS = [
  "!reminder",
  "!lembrete",
  // Adicione outros comandos que devem funcionar em grupos
];

/**
 * Middleware para filtrar mensagens vindas de grupos
 * Retorna true se a mensagem deve ser ignorada (veio de grupo)
 * Retorna false se a mensagem deve ser processada
 */
async function shouldIgnoreMessage(msg) {
  try {
    // Obtém o chat da mensagem
    const chat = await msg.getChat();

    // Se NÃO é um grupo, sempre processar
    if (!chat.isGroup && !chat.id._serialized.includes("@g.us")) {
      await debug(
        `✅ Mensagem aceita - conversa privada com: ${
          chat.name || "Usuário"
        } (ID: ${chat.id._serialized})`
      );
      return false; // Processar mensagem privada
    }

    // Se É um grupo, verifica se é comando permitido
    const messageText = msg.body.toLowerCase().trim();

    // Verifica se é um comando permitido em grupos
    const isAllowedCommand = ALLOWED_GROUP_COMMANDS.some(
      (cmd) =>
        messageText === cmd.toLowerCase() ||
        messageText.startsWith(cmd.toLowerCase() + " ")
    );

    if (isAllowedCommand) {
      await debug(
        `✅ Comando permitido em grupo: "${messageText}" no grupo: ${chat.name} (ID: ${chat.id._serialized})`
      );
      return false; // Processar comando permitido
    }

    // Se chegou até aqui, é uma mensagem comum de grupo - ignorar
    await debug(
      `🚫 Mensagem ignorada - veio do grupo: ${chat.name} (ID: ${
        chat.id._serialized
      }) | Conteúdo: "${messageText.substring(0, 30)}..."`
    );
    return true; // Ignorar mensagem de grupo
  } catch (error) {
    console.error("⚠️ Erro ao verificar tipo de chat:", error);

    // Em caso de erro, assume como grupo por segurança (para não enviar mensagens indevidas)
    await debug("🚫 Mensagem ignorada por precaução devido ao erro");
    return true;
  }
}

/**
 * Função para adicionar novos comandos permitidos em grupos
 */
function addAllowedGroupCommand(command) {
  if (!ALLOWED_GROUP_COMMANDS.includes(command)) {
    ALLOWED_GROUP_COMMANDS.push(command);
    console.log(`✅ Comando adicionado à lista de permitidos: ${command}`);
  }
}

/**
 * Função para remover comandos da lista de permitidos
 */
function removeAllowedGroupCommand(command) {
  const index = ALLOWED_GROUP_COMMANDS.indexOf(command);
  if (index > -1) {
    ALLOWED_GROUP_COMMANDS.splice(index, 1);
    console.log(`🗑️ Comando removido da lista de permitidos: ${command}`);
  }
}

/**
 * Função para listar comandos permitidos
 */
function listAllowedGroupCommands() {
  console.log("📋 Comandos permitidos em grupos:", ALLOWED_GROUP_COMMANDS);
  return ALLOWED_GROUP_COMMANDS;
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
      messageContent: msg.body.substring(0, 50) + "...",
    };
  } catch (error) {
    console.error("⚠️ Erro ao obter informações do chat:", error);
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
    conteudo: chatInfo.messageContent,
  });
}

module.exports = {
  shouldIgnoreMessage,
  getChatInfo,
  logChatStats,
  addAllowedGroupCommand,
  removeAllowedGroupCommand,
  listAllowedGroupCommands,
  ALLOWED_GROUP_COMMANDS,
};
