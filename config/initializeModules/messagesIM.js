const { debug } = require("../../services/debugService");
const { createJsonFileIfNotExists } = require("./utilsIM");

/**
 * Configuração padrão do arquivo messages.json
 */
const DEFAULT_MESSAGES = [];

/**
 * Inicializa o arquivo messages.json com valores padrão
 * @returns {Promise<string>} - Caminho do arquivo criado/existente
 */
async function initializeMessagesConfig() {
  try {
    await debug("🔧 Inicializando messages.json...");
    const filePath = await createJsonFileIfNotExists(
      "messages.json",
      DEFAULT_MESSAGES
    );
    await debug("✅ messages.json inicializado com sucesso");
    return filePath;
  } catch (error) {
    console.error("❌ Erro ao inicializar messages.json:", error);
    throw error;
  }
}

module.exports = {
  initializeMessagesConfig,
  DEFAULT_MESSAGES,
};
