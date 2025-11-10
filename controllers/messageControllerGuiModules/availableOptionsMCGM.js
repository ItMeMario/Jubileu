const messageService = require("../../services/messageService");

async function getAvailableOptionsGUI() {
  try {
    const messageTypes = messageService.getAvailableMessageTypes();
    const locales = messageService.getAvailableLocales();

    return {
      success: true,
      data: {
        messageTypes,
        locales,
      },
    };
  } catch (error) {
    console.error("Erro ao obter opções disponíveis:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  getAvailableOptionsGUI,
};
