const messageService = require("../services/messageService");
const fs = require("fs").promises;
const path = require("path");

async function handleListMessagesGUI() {
  try {
    const messages = await messageService.getMessages();
    return {
      success: true,
      data: messages,
    };
  } catch (error) {
    console.error("Erro ao listar mensagens:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

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

// Função para obter tipos de mensagem e locales disponíveis
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

async function handleCheckMessageCompletenessGUI(specificLocale = null) {
  try {
    const report = await messageService.checkMessageCompleteness();

    // Melhorar validação do specificLocale
    if (specificLocale && typeof specificLocale === "string") {
      const cleanLocale = specificLocale.trim();

      if (!cleanLocale) {
        return {
          success: false,
          error: "Locale não pode estar vazio",
        };
      }

      if (!report.byLocale[cleanLocale]) {
        return {
          success: false,
          error: `Locale '${cleanLocale}' não encontrado. Locales disponíveis: ${Object.keys(
            report.byLocale
          ).join(", ")}`,
        };
      }

      return {
        success: true,
        data: {
          locale: cleanLocale,
          stats: report.byLocale[cleanLocale],
          messageTypes: messageService.getAvailableMessageTypes(),
        },
      };
    }

    // Retorna relatório completo se specificLocale for null/undefined
    return {
      success: true,
      data: {
        summary: report.summary,
        byLocale: report.byLocale,
        missing: report.missing,
        locales: messageService.getAvailableLocales(),
        messageTypes: messageService.getAvailableMessageTypes(),
      },
    };
  } catch (error) {
    console.error("Erro ao verificar completude das mensagens:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

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

/**
 * Função para garantir que a pasta data/audio existe
 */
async function ensureAudioDirectoryExists() {
  const audioDir = path.join(process.cwd(), "data", "audio");
  try {
    await fs.access(audioDir);
  } catch (error) {
    // Pasta não existe, criar
    await fs.mkdir(audioDir, { recursive: true });
    console.log("Pasta data/audio/ criada");
  }
  return audioDir;
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

    // Garantir que a pasta existe
    const audioDir = await ensureAudioDirectoryExists();

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

module.exports = {
  handleListMessagesGUI,
  handleAddMessageGUI,
  handleEditMessageGUI,
  handleDeleteMessageGUI,
  handleShowLastMessageGUI,
  getAvailableOptionsGUI,
  handleCheckMessageCompletenessGUI,
  handleAddMessageWithAudioGUI,
  handleEditMessageWithAudioGUI,
  getExistingAudioFilesGUI,
  isValidAudioFormat,
  ensureAudioDirectoryExists,
  handleAudioFileUpload,
};
