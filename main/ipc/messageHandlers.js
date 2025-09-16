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

  // Nova função para verificar completude das mensagens
  async checkMessageCompleteness(_, specificLocale = null) {
    try {
      const { handleCheckMessageCompletenessGUI } = this.getMessageController();
      return await handleCheckMessageCompletenessGUI(specificLocale);
    } catch (error) {
      console.error("Erro em message-check-completeness:", error);
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

  async addMessageWithAudio(_, messageData, audioFileData = null) {
    try {
      const { handleAddMessageWithAudioGUI } = this.getMessageController();

      let audioFile = null;
      if (audioFileData) {
        audioFile = {
          buffer: Buffer.from(audioFileData.buffer),
          name: audioFileData.name,
        };
      }

      return await handleAddMessageWithAudioGUI(messageData, audioFile);
    } catch (error) {
      console.error("Erro em message-add-message-with-audio:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Editar mensagem com suporte a upload de áudio
   */
  async updateMessageWithAudio(_, id, messageData, audioFileData = null) {
    try {
      const { handleEditMessageWithAudioGUI } = this.getMessageController();

      let audioFile = null;
      if (audioFileData) {
        audioFile = {
          buffer: Buffer.from(audioFileData.buffer),
          name: audioFileData.name,
        };
      }

      return await handleEditMessageWithAudioGUI(id, messageData, audioFile);
    } catch (error) {
      console.error("Erro em message-update-message-with-audio:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Obter lista de arquivos de áudio existentes
   */
  async getExistingAudioFiles() {
    try {
      const { getExistingAudioFilesGUI } = this.getMessageController();
      return await getExistingAudioFilesGUI();
    } catch (error) {
      console.error("Erro em message-get-audio-files:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Validar se um arquivo é de áudio válido
   */
  async validateAudioFile(_, filename) {
    try {
      const controller = this.getMessageController();

      if (controller.isValidAudioFormat) {
        const isValid = controller.isValidAudioFormat(filename);
        return {
          success: true,
          data: { isValid, filename },
        };
      }

      // Fallback simples se a função não existir
      const validExtensions = [
        ".mp3",
        ".wav",
        ".ogg",
        ".opus",
        ".m4a",
        ".aac",
        ".flac",
      ];
      const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();
      const isValid = validExtensions.includes(ext);

      return {
        success: true,
        data: { isValid, filename },
      };
    } catch (error) {
      console.error("Erro em message-validate-audio-file:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = MessageHandlers;
