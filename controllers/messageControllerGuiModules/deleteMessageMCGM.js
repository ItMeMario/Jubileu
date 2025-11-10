const messageService = require("../../services/messageService");

async function handleDeleteMessageGUI(id) {
  try {
    const success = await messageService.deleteMessage(id);

    if (success) {
      return {
        success: true,
        message: "Mensagem excluída com sucesso",
      };
    } else {
      return {
        success: false,
        error: "Mensagem não encontrada ou erro ao excluir",
      };
    }
  } catch (error) {
    console.error("Erro ao excluir mensagem:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  handleDeleteMessageGUI,
};
