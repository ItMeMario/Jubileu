const fs = require("fs").promises;
const path = require("path");
const messageService = require("../services/messageService");

// Importar todos os módulos
const {
  handleListMessagesGUI,
} = require("./messageControllerGuiModules/listMessagesMCGM");
const {
  handleAddMessageGUI,
} = require("./messageControllerGuiModules/addMessageMCGM");
const {
  handleEditMessageGUI,
} = require("./messageControllerGuiModules/editMessageMCGM");
const {
  handleDeleteMessageGUI,
} = require("./messageControllerGuiModules/deleteMessageMCGM");
const {
  handleShowLastMessageGUI,
} = require("./messageControllerGuiModules/showLastMessageMCGM");
const {
  getAvailableOptionsGUI,
} = require("./messageControllerGuiModules/availableOptionsMCGM");
const {
  handleCheckMessageCompletenessGUI,
} = require("./messageControllerGuiModules/checkCompletenessMCGM");

// ============================================
// FUNÇÕES DE ÁUDIO (mantidas temporariamente)
// ============================================

function isValidAudioFormat(filename) {
  const validExtensions = [
    ".mp3",
    ".wav",
    ".ogg",
    ".opus",
    ".m4a",
    ".aac",
    ".flac",
  ];
  const ext = path.extname(filename).toLowerCase();
  return validExtensions.includes(ext);
}

async function handleAudioFileUpload(fileBuffer, originalName) {
  try {
    // Validar formato
    if (!isValidAudioFormat(originalName)) {
      return {
        success: false,
        error:
          "Formato de arquivo não suportado. Use: mp3, wav, ogg, m4a, aac, flac",
      };
    }

    const audioDir = path.join(process.cwd(), "data", "audio");

    // Gerar nome único se arquivo já existir
    let finalFileName = originalName;
    let counter = 1;
    const nameWithoutExt = path.parse(originalName).name;
    const ext = path.parse(originalName).ext;

    while (true) {
      const filePath = path.join(audioDir, finalFileName);
      try {
        await fs.access(filePath);
        // Arquivo existe, gerar novo nome
        finalFileName = `${nameWithoutExt}_${counter}${ext}`;
        counter++;
      } catch (error) {
        // Arquivo não existe, podemos usar este nome
        break;
      }
    }

    // Salvar o arquivo
    const finalFilePath = path.join(audioDir, finalFileName);
    await fs.writeFile(finalFilePath, fileBuffer);

    return {
      success: true,
      data: {
        filename: finalFileName,
        path: finalFilePath,
        size: fileBuffer.length,
      },
    };
  } catch (error) {
    console.error("Erro ao salvar arquivo de áudio:", error);
    return {
      success: false,
      error: "Erro ao salvar arquivo de áudio: " + error.message,
    };
  }
}

async function handleAddMessageWithAudioGUI(messageData, audioFile = null) {
  try {
    const { locale, message_type, message_content } = messageData;

    if (!locale || !message_type) {
      return {
        success: false,
        error: "Locale e tipo de mensagem são obrigatórios",
      };
    }

    let finalMessageContent = message_content;

    // Se for audio_invite e tiver arquivo, processar upload
    if (message_type === "audio_invite" && audioFile) {
      const uploadResult = await handleAudioFileUpload(
        audioFile.buffer,
        audioFile.name
      );

      if (!uploadResult.success) {
        return uploadResult;
      }

      // Para audio_invite, o conteúdo é o nome do arquivo
      finalMessageContent = uploadResult.data.filename;
    } else if (message_type === "audio_invite" && !audioFile) {
      return {
        success: false,
        error:
          "Arquivo de áudio é obrigatório para mensagens do tipo AUDIO_INVITE",
      };
    } else if (!message_content) {
      return {
        success: false,
        error: "Conteúdo da mensagem é obrigatório",
      };
    }

    const result = await messageService.addMessage({
      locale,
      message_type,
      message_content: finalMessageContent,
    });

    return {
      success: true,
      data: result,
      message:
        message_type === "audio_invite"
          ? `Mensagem de áudio adicionada com sucesso. Arquivo: ${finalMessageContent}`
          : "Mensagem adicionada com sucesso",
    };
  } catch (error) {
    console.error("Erro ao adicionar mensagem:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

async function handleEditMessageWithAudioGUI(
  id,
  messageData,
  audioFile = null
) {
  try {
    const { locale, message_type, message_content } = messageData;

    if (!locale || !message_type) {
      return {
        success: false,
        error: "Locale e tipo de mensagem são obrigatórios",
      };
    }

    const existing = await messageService.getMessageById(id);
    if (!existing) {
      return {
        success: false,
        error: "Mensagem não encontrada",
      };
    }

    let finalMessageContent = message_content;

    // Se for audio_invite e tiver novo arquivo, processar upload
    if (message_type === "audio_invite") {
      if (audioFile) {
        const uploadResult = await handleAudioFileUpload(
          audioFile.buffer,
          audioFile.name
        );

        if (!uploadResult.success) {
          return uploadResult;
        }

        finalMessageContent = uploadResult.data.filename;
      } else if (!message_content) {
        // Manter o arquivo existente se não foi fornecido novo
        finalMessageContent = existing.message_content;
      }
    } else if (!message_content) {
      return {
        success: false,
        error: "Conteúdo da mensagem é obrigatório",
      };
    }

    const success = await messageService.updateMessage(id, {
      locale,
      message_type,
      message_content: finalMessageContent,
    });

    if (success) {
      return {
        success: true,
        message:
          message_type === "audio_invite" && audioFile
            ? `Mensagem de áudio atualizada! Novo arquivo: ${finalMessageContent}`
            : "Mensagem atualizada com sucesso",
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

async function getExistingAudioFilesGUI() {
  try {
    const audioDir = path.join(process.cwd(), "data", "audio");

    try {
      await fs.access(audioDir);
    } catch (error) {
      // Pasta não existe
      return {
        success: true,
        data: [],
      };
    }

    const files = await fs.readdir(audioDir);
    const audioFiles = files.filter((file) => isValidAudioFormat(file));

    return {
      success: true,
      data: audioFiles,
    };
  } catch (error) {
    console.error("Erro ao listar arquivos de áudio:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================
// EXPORTAÇÕES
// ============================================

module.exports = {
  // Funções dos módulos
  handleListMessagesGUI,
  handleAddMessageGUI,
  handleEditMessageGUI,
  handleDeleteMessageGUI,
  handleShowLastMessageGUI,
  getAvailableOptionsGUI,
  handleCheckMessageCompletenessGUI,

  // Funções de áudio (temporariamente aqui)
  handleAddMessageWithAudioGUI,
  handleEditMessageWithAudioGUI,
  getExistingAudioFilesGUI,
  isValidAudioFormat,
  handleAudioFileUpload,
};
