const messageService = require("../../services/messageService");

async function handleAddMessageGUI(messageData) {
  try {
    const { locale, message_type, message_content } = messageData;

    if (!locale || !message_type || !message_content) {
      return {
        success: false,
        error: "Todos os campos são obrigatórios",
      };
    }

    const result = await messageService.addMessage({
      locale,
      message_type,
      message_content,
    });

    return {
      success: true,
      data: result,
      message: "Mensagem adicionada com sucesso",
    };
  } catch (error) {
    console.error("Erro ao adicionar mensagem:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  handleAddMessageGUI,
};
