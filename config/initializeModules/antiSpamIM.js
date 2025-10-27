const { debug } = require("../../services/debugService");
const { createJsonFileIfNotExists } = require("./utilsIM");

/**
 * Configuração padrão do arquivo antiSpam.json
 */
const DEFAULT_ANTI_SPAM = {
  userAttempts: {},
  suspendedUsers: {},
  lastCleanup: new Date().toISOString(),
};

/**
 * Inicializa o arquivo antiSpam.json com valores padrão
 * @returns {Promise<string>} - Caminho do arquivo criado/existente
 */
async function initializeAntiSpamConfig() {
  try {
    await debug("🔧 Inicializando antiSpam.json...");
    const filePath = await createJsonFileIfNotExists(
      "antiSpam.json",
      DEFAULT_ANTI_SPAM
    );
    await debug("✅ antiSpam.json inicializado com sucesso");
    return filePath;
  } catch (error) {
    console.error("❌ Erro ao inicializar antiSpam.json:", error);
    throw error;
  }
}

module.exports = {
  initializeAntiSpamConfig,
  DEFAULT_ANTI_SPAM,
};
