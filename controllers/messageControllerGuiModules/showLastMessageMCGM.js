const messageService = require("../../services/messageService");

async function handleShowLastMessageGUI() {
  try {
    const last = await messageService.getLastMessage();

    if (!last) {
      return {
        success: false,
        error: "Nenhuma mensagem encontrada",
      };
    }

    return {
      success: true,
      data: last,
    };
  } catch (error) {
    console.error("Erro ao buscar última mensagem:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  handleShowLastMessageGUI,
};
