const fs = require("fs").promises;
const path = require("path");
const { debug } = require("../../services/debugService");
const { DATA_DIR, ensureDataDirectory } = require("./directoriesIM");

/**
 * Lê um arquivo JSON do diretório de dados
 * @param {string} filename - Nome do arquivo JSON
 * @param {*} defaultValue - Valor padrão caso o arquivo não exista
 * @returns {Promise<*>} - Conteúdo do arquivo parseado ou valor padrão
 */
async function readJsonFile(filename, defaultValue = null) {
  await ensureDataDirectory();
  const filePath = path.join(DATA_DIR, filename);

  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      return defaultValue;
    }
    console.error(`Erro ao ler ${filename}:`, error);
    throw error;
  }
}

/**
 * Salva dados em um arquivo JSON no diretório de dados
 * @param {string} filename - Nome do arquivo JSON
 * @param {*} data - Dados a serem salvos
 * @returns {Promise<boolean>} - True se salvou com sucesso, False caso contrário
 */
async function saveJsonFile(filename, data) {
  await ensureDataDirectory();
  const filePath = path.join(DATA_DIR, filename);

  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (error) {
    console.error(`Erro ao salvar ${filename}:`, error);
    return false;
  }
}

/**
 * Cria um arquivo JSON caso ele não exista
 * @param {string} filename - Nome do arquivo JSON
 * @param {*} defaultContent - Conteúdo padrão do arquivo
 * @returns {Promise<string>} - Caminho do arquivo criado/existente
 */
async function createJsonFileIfNotExists(filename, defaultContent) {
  await ensureDataDirectory();
  const filePath = path.join(DATA_DIR, filename);

  try {
    await fs.access(filePath);
    await debug(`✅ Arquivo ${filename} já existe em ${DATA_DIR}`);
    return filePath;
  } catch (err) {
    if (err.code === "ENOENT") {
      await fs.writeFile(
        filePath,
        JSON.stringify(defaultContent, null, 2),
        "utf8"
      );
      await debug(`✅ Arquivo ${filename} criado em ${DATA_DIR}`);
      return filePath;
    }
    throw err;
  }
}

module.exports = {
  readJsonFile,
  saveJsonFile,
  createJsonFileIfNotExists,
};
