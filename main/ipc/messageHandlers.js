const messageControllerGui = require("../../controllers/messageControllerGui");

class MessageHandlers {
  constructor() {
    console.log("MessageHandlers inicializado");
  }

  async getMessages() {
    try {
      return await messageControllerGui.handleListMessagesGUI();
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
      return await messageControllerGui.handleAddMessageGUI(messageData);
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
      return await messageControllerGui.handleEditMessageGUI(id, messageData);
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
      return await messageControllerGui.handleDeleteMessageGUI(id);
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
      return await messageControllerGui.handleShowLastMessageGUI();
    } catch (error) {
      console.error("Erro em message-get-last-message:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getAvailableOptions() {
    try {
      return await messageControllerGui.getAvailableOptionsGUI();
    } catch (error) {
      console.error("Erro em message-get-available-options:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getMessageTypes() {
    try {
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

  async checkMessageCompleteness(_, specificLocale = null) {
    try {
      return await messageControllerGui.handleCheckMessageCompletenessGUI(
        specificLocale
      );
    } catch (error) {
      console.error("Erro em message-check-completeness:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async addMessageWithAudio(_, messageData, audioFileData = null) {
    try {
      let audioFile = null;
      if (audioFileData) {
        audioFile = {
          buffer: Buffer.from(audioFileData.buffer),
          name: audioFileData.name,
        };
      }

      return await messageControllerGui.handleAddMessageWithAudioGUI(
        messageData,
        audioFile
      );
    } catch (error) {
      console.error("Erro em message-add-message-with-audio:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async updateMessageWithAudio(_, id, messageData, audioFileData = null) {
    try {
      let audioFile = null;
      if (audioFileData) {
        audioFile = {
          buffer: Buffer.from(audioFileData.buffer),
          name: audioFileData.name,
        };
      }

      return await messageControllerGui.handleEditMessageWithAudioGUI(
        id,
        messageData,
        audioFile
      );
    } catch (error) {
      console.error("Erro em message-update-message-with-audio:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getExistingAudioFiles() {
    try {
      return await messageControllerGui.getExistingAudioFilesGUI();
    } catch (error) {
      console.error("Erro em message-get-audio-files:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async validateAudioFile(_, filename) {
    try {
      const isValid = messageControllerGui.isValidAudioFormat(filename);
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
