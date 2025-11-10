const messageService = require("../../services/messageService");

async function handleEditMessageGUI(id, messageData) {
  try {
    const { locale, message_type, message_content } = messageData;

    if (!locale || !message_type || !message_content) {
      return {
        success: false,
        error: "Todos os campos são obrigatórios",
      };
    }

    const existing = await messageService.getMessageById(id);
    if (!existing) {
      return {
        success: false,
        error: "Mensagem não encontrada",
      };
    }

    const success = await messageService.updateMessage(id, {
      locale,
      message_type,
      message_content,
    });

    if (success) {
      return {
        success: true,
        message: "Mensagem atualizada com sucesso",
      };
    } else {
      return {
        success: false,
        error: "Erro ao atualizar mensagem",
      };
    }
  } catch (error) {
    console.error("Erro ao editar mensagem:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  handleEditMessageGUI,
};
