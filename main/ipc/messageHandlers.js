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
      console.error("Erro em message-get-messages:", error);
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
      console.error("Erro em message-add-message:", error);
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
      console.error("Erro em message-update-message:", error);
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
      console.error("Erro em message-delete-message:", error);
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
      console.error("Erro em message-get-last-message:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Método original mantido para compatibilidade
  async getAvailableOptions() {
    try {
      const { getAvailableOptionsGUI } = this.getMessageController();
      return await getAvailableOptionsGUI();
    } catch (error) {
      console.error("Erro em message-get-available-options:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Novos métodos específicos (com fallback se não existirem no controller)
  async getMessageTypes() {
    try {
      const controller = this.getMessageController();

      // Tenta usar método específico se existir
      if (controller.getMessageTypesGUI) {
        return await controller.getMessageTypesGUI();
      }

      // Fallback para getAvailableOptions
      const result = await this.getAvailableOptions();
      if (result.success && result.data.messageTypes) {
        return {
          success: true,
          data: result.data.messageTypes,
        };
      }

      return {
        success: false,
        error: "Tipos de mensagem não encontrados",
      };
    } catch (error) {
      console.error("Erro em message-get-types:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getMessageLocales() {
    try {
      const controller = this.getMessageController();

      // Tenta usar método específico se existir
      if (controller.getMessageLocalesGUI) {
        return await controller.getMessageLocalesGUI();
      }

      // Fallback para getAvailableOptions
      const result = await this.getAvailableOptions();
      if (result.success && result.data.locales) {
        return {
          success: true,
          data: result.data.locales,
        };
      }

      return {
        success: false,
        error: "Locales não encontrados",
      };
    } catch (error) {
      console.error("Erro em message-get-locales:", error);
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
