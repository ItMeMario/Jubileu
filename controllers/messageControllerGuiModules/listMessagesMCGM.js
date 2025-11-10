const messageService = require("../../services/messageService");

async function handleListMessagesGUI() {
  try {
    const messages = await messageService.getMessages();
    return {
      success: true,
      data: messages,
    };
  } catch (error) {
    console.error("Erro ao listar mensagens:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  handleListMessagesGUI,
};
