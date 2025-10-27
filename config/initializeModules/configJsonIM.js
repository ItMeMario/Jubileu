const { debug } = require("../../services/debugService");
const { createJsonFileIfNotExists } = require("./utilsIM");

/**
 * Configuração padrão do arquivo config.json
 */
const DEFAULT_CONFIG = {
  mode: "MULTI",
  locale: "pt-BR",
};

/**
 * Inicializa o arquivo config.json com valores padrão
 * @returns {Promise<string>} - Caminho do arquivo criado/existente
 */
async function initializeConfigJson() {
  try {
    await debug("🔧 Inicializando config.json...");
    const filePath = await createJsonFileIfNotExists(
      "config.json",
      DEFAULT_CONFIG
    );
    await debug("✅ config.json inicializado com sucesso");
    return filePath;
  } catch (error) {
    console.error("❌ Erro ao inicializar config.json:", error);
    throw error;
  }
}

module.exports = {
  initializeConfigJson,
  DEFAULT_CONFIG,
};
