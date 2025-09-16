const messageService = require("../services/messageService");
const fs = require("fs").promises;
const path = require("path");


// Versões originais para CLI (mantidas)
async function promptForMessageContent(rl, currentContent = "") {
  console.log(
    "\nDigite o conteúdo da mensagem. Você pode colar várias linhas."
  );
  console.log('Digite "/end" em uma nova linha para finalizar.\n');

  const messageLines = [];

  while (true) {
    const line = await new Promise((resolve) => rl.question("> ", resolve));
    if (line.trim() === "/end") break;
    messageLines.push(line);
  }

  return messageLines.join("\n");
}

async function handleAddMessage(rl) {
  const messageTypes = messageService.getAvailableMessageTypes();
  const locales = messageService.getAvailableLocales();

  console.log("\n=== ADICIONAR NOVA MENSAGEM ===");

  // Escolher o tipo
  console.log("Tipos de mensagem disponíveis:");
  messageTypes.forEach((t, i) => console.log(`${i + 1}. ${t}`));
  const typeIndex = await new Promise((resolve) =>
    rl.question("Escolha o tipo (número): ", resolve)
  );
  const message_type = messageTypes[parseInt(typeIndex) - 1];

  // Escolher o locale
  console.log("\nLocales disponíveis:");
  locales.forEach((l, i) => console.log(`${i + 1}. ${l}`));
  const localeIndex = await new Promise((resolve) =>
    rl.question("Escolha o locale (número): ", resolve)
  );
  const locale = locales[parseInt(localeIndex) - 1];

  let message_content;

  // Lógica especial para audio_invite
  if (message_type === "audio_invite") {
    console.log("\n🎵 === MENSAGEM DE ÁUDIO ===");
    console.log("📁 Pasta de áudios: data/audio/");
    console.log(
      "ℹ️  Coloque seu arquivo de áudio na pasta 'data/audio/' antes de continuar."
    );
    console.log("ℹ️  Digite apenas o nome do arquivo (ex: convite.mp3)");

    message_content = await new Promise((resolve) =>
      rl.question("Nome do arquivo de áudio: ", resolve)
    );
  } else {
    // Conteúdo da mensagem usando entrada multilinha (comportamento original)
    message_content = await promptForMessageContent(rl);
  }

  if (!message_type || !locale || !message_content) {
    console.log("⚠️ Dados inválidos. Operação cancelada.");
    return;
  }

  const result = await messageService.addMessage({
    locale,
    message_type,
    message_content,
  });

  if (message_type === "audio_invite") {
    console.log("✅ Mensagem de áudio adicionada com sucesso:", result);
    console.log(`🎵 Arquivo referenciado: data/audio/${message_content}`);
  } else {
    console.log("✅ Mensagem adicionada com sucesso:", result);
  }
}

async function handleListMessages() {
  const messages = await messageService.getMessages();
  console.log("\n=== LISTA DE MENSAGENS ===");
  messages.forEach((msg) =>
    console.log(
      `[${msg.id}] (${msg.locale} - ${msg.message_type}) => ${msg.message_content}`
    )
  );
}

async function handleEditMessage(rl) {
  const messages = await messageService.getMessages();
  if (!messages.length) {
    console.log("Nenhuma mensagem cadastrada.");
    return;
  }

  console.log("\nMensagens:");
  messages.forEach((msg) =>
    console.log(`[${msg.id}] (${msg.locale}/${msg.message_type})`)
  );

  const id = await new Promise((resolve) =>
    rl.question("Digite o ID da mensagem que deseja editar: ", resolve)
  );

  const existing = await messageService.getMessageById(id);
  if (!existing) {
    console.log("Mensagem não encontrada.");
    return;
  }

  let newContent;

  // Lógica especial para edição de audio_invite
  if (existing.message_type === "audio_invite") {
    console.log("\n🎵 === EDITANDO MENSAGEM DE ÁUDIO ===");
    console.log(`Arquivo atual: ${existing.message_content}`);
    console.log("📁 Pasta de áudios: data/audio/");
    console.log(
      "ℹ️  Coloque seu novo arquivo de áudio na pasta 'data/audio/' antes de continuar."
    );
    console.log("ℹ️  Digite apenas o nome do arquivo (ex: novo_convite.mp3)");
    console.log("ℹ️  Ou pressione Enter para manter o arquivo atual");

    const input = await new Promise((resolve) =>
      rl.question("Nome do arquivo de áudio: ", resolve)
    );

    newContent = input.trim() || existing.message_content;
  } else {
    // Usando entrada multilinha para edição (comportamento original)
    console.log(`\nConteúdo atual da mensagem:`);
    console.log(`"${existing.message_content}"`);
    newContent = await promptForMessageContent(rl, existing.message_content);
  }

  const success = await messageService.updateMessage(id, {
    locale: existing.locale,
    message_type: existing.message_type,
    message_content: newContent,
  });

  if (success) {
    if (existing.message_type === "audio_invite") {
      console.log("✅ Mensagem de áudio atualizada!");
      console.log(`🎵 Novo arquivo referenciado: data/audio/${newContent}`);
    } else {
      console.log("✅ Mensagem atualizada!");
    }
  } else {
    console.log("⚠️ Erro ao atualizar.");
  }
}

async function handleDeleteMessage(rl) {
  const id = await new Promise((resolve) =>
    rl.question("Digite o ID da mensagem a excluir: ", resolve)
  );
  const success = await messageService.deleteMessage(id);
  console.log(success ? "✅ Mensagem excluída." : "⚠ Erro ao excluir.");
}

async function handleShowLastMessage() {
  const last = await messageService.getLastMessage();
  if (!last) {
    console.log("Nenhuma mensagem encontrada.");
    return;
  }
  console.log(
    `Última mensagem (#${last.id} - ${last.locale}/${last.message_type}):\n${last.message_content}`
  );
}

// Nova função para verificar completude das mensagens (CLI)
async function handleCheckMessageCompleteness(rl) {
  try {
    console.log("\n📊 === VERIFICAÇÃO DE COMPLETUDE ===");
    console.log("1. Ver completude de todos os locales");
    console.log("2. Ver completude de um locale específico");

    const option = await new Promise((resolve) => {
      rl.question("Escolha uma opção (1 ou 2): ", resolve);
    });

    const report = await messageService.checkMessageCompleteness();

    if (option === "1") {
      // Mostrar todos os locales
      console.log("\n📊 Verificando completude de todos os locales...\n");

      // Exibir resumo geral
      console.log("=== RESUMO GERAL ===");
      console.log(`📁 Total de locales: ${report.summary.totalLocales}`);
      console.log(
        `📝 Total de tipos de mensagem: ${report.summary.totalMessageTypes}`
      );
      console.log(
        `📊 Mensagens esperadas: ${report.summary.totalExpectedMessages}`
      );
      console.log(
        `✅ Mensagens cadastradas: ${report.summary.totalExistingMessages}`
      );
      console.log(
        `📈 Completude geral: ${report.summary.completionPercentage.toFixed(
          1
        )}%`
      );

      // Exibir detalhes por locale
      console.log("\n=== DETALHES POR LOCALE ===");
      Object.entries(report.byLocale).forEach(([locale, data]) => {
        const status = data.percentage === 100 ? "✅" : "⚠️";
        console.log(
          `${status} ${locale}: ${data.existing}/${
            data.total
          } (${data.percentage.toFixed(1)}%)`
        );

        if (data.missing.length > 0) {
          console.log(`   Faltando: ${data.missing.join(", ")}`);
        }
      });

      // Exibir lista completa de faltantes se houver
      if (report.missing.length > 0) {
        console.log("\n=== MENSAGENS FALTANTES ===");
        report.missing.forEach(({ locale, messageType }) => {
          console.log(`❌ ${locale} -> ${messageType}`);
        });
        console.log(`\nTotal de mensagens faltantes: ${report.missing.length}`);
      } else {
        console.log(
          "\n🎉 Todas as mensagens estão cadastradas para todos os locales!"
        );
      }
    } else if (option === "2") {
      // Mostrar locale específico
      const locales = messageService.getAvailableLocales();

      console.log("\nLocales disponíveis:");
      locales.forEach((locale, index) => {
        console.log(`${index + 1}. ${locale}`);
      });

      const localeIndex = await new Promise((resolve) => {
        rl.question("Escolha o locale (número): ", resolve);
      });

      const selectedLocale = locales[parseInt(localeIndex) - 1];

      if (!selectedLocale) {
        console.log("❌ Opção inválida.");
        return;
      }

      const localeData = report.byLocale[selectedLocale];

      console.log(`\n📊 Verificando completude do locale: ${selectedLocale}\n`);

      // Estatísticas do locale
      console.log("=== ESTATÍSTICAS ===");
      console.log(`📝 Total de tipos de mensagem: ${localeData.total}`);
      console.log(`✅ Mensagens cadastradas: ${localeData.existing}`);
      console.log(`❌ Mensagens faltantes: ${localeData.missing.length}`);
      console.log(`📈 Completude: ${localeData.percentage.toFixed(1)}%`);

      // Lista detalhada dos faltantes
      if (localeData.missing.length > 0) {
        console.log("\n=== TIPOS DE MENSAGEM FALTANTES ===");
        localeData.missing.forEach((messageType) => {
          console.log(`❌ ${messageType}`);
        });
      } else {
        console.log(
          `\n🎉 Todas as mensagens estão cadastradas para o locale ${selectedLocale}!`
        );
      }
    } else {
      console.log("❌ Opção inválida.");
    }
  } catch (error) {
    console.error("❌ Erro ao verificar completude das mensagens:", error);
  }
}

// =========================
// VERSÕES ADAPTADAS PARA GUI
// =========================

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

// =====================================
// FUNÇÕES PARA AUDIO_INVITE GUI
// =====================================

/**
 * Função para validar formatos de áudio suportados
 */
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

/**
 * Função para salvar arquivo de áudio na pasta data/audio
 */
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

/**
 * Função GUI para adicionar mensagem com suporte a upload de áudio
 */
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

/**
 * Função GUI para editar mensagem com suporte a upload de áudio
 */
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

/**
 * Função para listar arquivos de áudio existentes na pasta
 */
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
  // Versões CLI (originais)
  handleAddMessage,
  handleListMessages,
  handleEditMessage,
  handleDeleteMessage,
  handleShowLastMessage,
  handleCheckMessageCompleteness, // Nova função CLI

  // Versões GUI (novas)
  handleListMessagesGUI,
  handleAddMessageGUI,
  handleEditMessageGUI,
  handleDeleteMessageGUI,
  handleShowLastMessageGUI,
  getAvailableOptionsGUI,
  handleCheckMessageCompletenessGUI, // Nova função GUI
  // NOVAS: Versões GUI com suporte a áudio
  handleAddMessageWithAudioGUI,
  handleEditMessageWithAudioGUI,
  getExistingAudioFilesGUI,

  // NOVAS: Funções auxiliares para áudio (para uso interno/debugging)
  isValidAudioFormat,
  ensureAudioDirectoryExists,
  handleAudioFileUpload,
};
