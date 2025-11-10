// services/messageService.js
// Agora usando SQLite em vez de JSON/TXT
const path = require("path");
const fs = require("fs").promises;
const db = require("../config/db");

// 🔧 CORREÇÃO: Importa o caminho correto da pasta de áudio
const { AUDIO_DIR } = require("../config/initialize");

console.log("📂 messageService.js - Caminho de áudio:", AUDIO_DIR);

// ============================================
// HELPERS PARA ENUMS
// ============================================

function getEnumValues(modulePath) {
  const mod = require(modulePath);
  return Object.values(mod);
}

function getAvailableMessageTypes() {
  return getEnumValues(path.join(__dirname, "../config/messageType.js"));
}

function getAvailableLocales() {
  return getEnumValues(path.join(__dirname, "../config/locale.js"));
}

// ============================================
// FUNÇÕES DE ÁUDIO
// ============================================

function getAudioDir() {
  return AUDIO_DIR;
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

    const audioDir = getAudioDir();
    console.log("📂 Salvando áudio em:", audioDir);

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
    console.log("💾 Salvando arquivo:", finalFilePath);
    await fs.writeFile(finalFilePath, fileBuffer);
    console.log("✅ Arquivo salvo com sucesso!");

    return {
      success: true,
      data: {
        filename: finalFileName,
        path: finalFilePath,
        size: fileBuffer.length,
      },
    };
  } catch (error) {
    console.error("❌ Erro ao salvar arquivo de áudio:", error);
    return {
      success: false,
      error: "Erro ao salvar arquivo de áudio: " + error.message,
    };
  }
}

async function getExistingAudioFiles() {
  try {
    const audioDir = getAudioDir();

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
// CRUD BÁSICO DE MENSAGENS
// ============================================

async function addMessage({ locale, message_type, message_content }) {
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO messages (locale, message_type, message_content) 
                 VALUES (?, ?, ?)`;
    db.run(sql, [locale, message_type, message_content], function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, locale, message_type, message_content });
    });
  });
}

async function getMessages() {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM messages ORDER BY created_at DESC", (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function getMessageById(id) {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM messages WHERE id = ?", [id], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

async function updateMessage(id, { locale, message_type, message_content }) {
  return new Promise((resolve, reject) => {
    const sql = `UPDATE messages 
                 SET locale = ?, message_type = ?, message_content = ? 
                 WHERE id = ?`;
    db.run(sql, [locale, message_type, message_content, id], function (err) {
      if (err) return reject(err);
      resolve(this.changes > 0);
    });
  });
}

async function deleteMessage(id) {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM messages WHERE id = ?", [id], function (err) {
      if (err) return reject(err);
      resolve(this.changes > 0);
    });
  });
}

async function getLastMessage() {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT * FROM messages ORDER BY created_at DESC LIMIT 1",
      (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      }
    );
  });
}

// ============================================
// FUNÇÕES ESPECIALIZADAS PARA MENSAGENS COM ÁUDIO
// ============================================

async function addMessageWithAudio(
  { locale, message_type, message_content },
  audioFile = null
) {
  try {
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

    const result = await addMessage({
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

async function updateMessageWithAudio(
  id,
  { locale, message_type, message_content },
  audioFile = null
) {
  try {
    if (!locale || !message_type) {
      return {
        success: false,
        error: "Locale e tipo de mensagem são obrigatórios",
      };
    }

    const existing = await getMessageById(id);
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

    const success = await updateMessage(id, {
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

// ============================================
// VERIFICAÇÃO DE COMPLETUDE
// ============================================

async function checkMessageCompleteness() {
  return new Promise((resolve, reject) => {
    try {
      // Obter todos os tipos e locales disponíveis
      const messageTypes = getAvailableMessageTypes();
      const locales = getAvailableLocales();

      // Buscar todas as mensagens existentes
      db.all("SELECT locale, message_type FROM messages", (err, rows) => {
        if (err) return reject(err);

        // Criar set das combinações existentes para busca rápida
        const existingCombinations = new Set(
          rows.map((row) => `${row.locale}:${row.message_type}`)
        );

        const report = {
          summary: {
            totalLocales: locales.length,
            totalMessageTypes: messageTypes.length,
            totalExpectedMessages: locales.length * messageTypes.length,
            totalExistingMessages: existingCombinations.size,
            completionPercentage: 0,
          },
          byLocale: {},
          missing: [],
        };

        // Verificar cada combinação locale + message type
        locales.forEach((locale) => {
          report.byLocale[locale] = {
            total: messageTypes.length,
            existing: 0,
            missing: [],
            percentage: 0,
          };

          messageTypes.forEach((messageType) => {
            const combination = `${locale}:${messageType}`;

            if (existingCombinations.has(combination)) {
              report.byLocale[locale].existing++;
            } else {
              report.byLocale[locale].missing.push(messageType);
              report.missing.push({ locale, messageType });
            }
          });

          // Calcular percentual para este locale
          report.byLocale[locale].percentage =
            (report.byLocale[locale].existing / report.byLocale[locale].total) *
            100;
        });

        // Calcular percentual geral
        report.summary.completionPercentage =
          (report.summary.totalExistingMessages /
            report.summary.totalExpectedMessages) *
          100;

        resolve(report);
      });
    } catch (error) {
      reject(error);
    }
  });
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // CRUD básico
  addMessage,
  getMessages,
  getMessageById,
  updateMessage,
  deleteMessage,
  getLastMessage,

  // Helpers
  getAvailableMessageTypes,
  getAvailableLocales,
  checkMessageCompleteness,

  // Funções de áudio
  addMessageWithAudio,
  updateMessageWithAudio,
  getExistingAudioFiles,
  isValidAudioFormat,
  handleAudioFileUpload,
  getAudioDir,
};
