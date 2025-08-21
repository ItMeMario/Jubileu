class MessageHandlers {
  constructor() {
    // Cache para controllers carregados dinamicamente
    this.controllers = {};
  }

  // Método helper para carregar controller se necessário
  getMessageController() {
    if (!this.controllers.message) {
      this.controllers.message = require("../../controllers/messageController");
    }
    return this.controllers.message;
  }

  async getMessages() {
    try {
      const { handleListMessagesGUI } = this.getMessageController();
      return await handleListMessagesGUI();
    } catch (error) {
      console.error("Erro em config-get-messages:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async addMessage(_, messageData) {
    try {
      const { handleAddMessageGUI } = this.getMessageController();
      return await handleAddMessageGUI(messageData);
    } catch (error) {
      console.error("Erro em config-add-message:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async updateMessage(_, id, messageData) {
    try {
      const { handleEditMessageGUI } = this.getMessageController();
      return await handleEditMessageGUI(id, messageData);
    } catch (error) {
      console.error("Erro em config-update-message:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async deleteMessage(_, id) {
    try {
      const { handleDeleteMessageGUI } = this.getMessageController();
      return await handleDeleteMessageGUI(id);
    } catch (error) {
      console.error("Erro em config-delete-message:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getLastMessage() {
    try {
      const { handleShowLastMessageGUI } = this.getMessageController();
      return await handleShowLastMessageGUI();
    } catch (error) {
      console.error("Erro em config-get-last-message:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getAvailableOptions() {
    try {
      const { getAvailableOptionsGUI } = this.getMessageController();
      return await getAvailableOptionsGUI();
    } catch (error) {
      console.error("Erro em config-get-available-options:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Método para limpar cache do controller (útil para desenvolvimento)
  clearControllerCache() {
    delete this.controllers.message;
    // Remove do cache do require também
    delete require.cache[
      require.resolve("../../controllers/messageController")
    ];
  }

  // Método para validar dados de mensagem
  validateMessageData(messageData) {
    const required = ["type", "content"];
    const missing = required.filter((field) => !messageData[field]);

    if (missing.length > 0) {
      throw new Error(`Campos obrigatórios faltando: ${missing.join(", ")}`);
    }

    return true;
  }
}

module.exports = MessageHandlers;
