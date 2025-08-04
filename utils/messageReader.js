// utils/messageReader.js
const fs = require("fs").promises;
const path = require("path");
const { debug } = require("../services/debugService");

const MESSAGES_DIR = path.join(__dirname, "../data/messagesTxt");

/**
 * Lê a mensagem de saudação do primeiro arquivo .txt encontrado na pasta
 * @returns {Promise<string>} - A mensagem lida do arquivo ou mensagem padrão
 */
async function lerMensagemSaudacao() {
  try {
    // Verifica se a pasta existe
    try {
      await fs.access(MESSAGES_DIR);
    } catch (error) {
      console.warn("Pasta messagesTxt não encontrada, usando mensagem padrão");
      return getMensagemPadrao();
    }

    // Lê todos os arquivos da pasta
    const files = await fs.readdir(MESSAGES_DIR);

    // Filtra apenas arquivos .txt
    const txtFiles = files.filter((file) =>
      file.toLowerCase().endsWith(".txt")
    );

    if (txtFiles.length === 0) {
      console.warn(
        "Nenhum arquivo .txt encontrado na pasta messagesTxt, usando mensagem padrão"
      );
      return getMensagemPadrao();
    }

    // Tenta ler o primeiro arquivo .txt encontrado
    for (const txtFile of txtFiles) {
      try {
        const filePath = path.join(MESSAGES_DIR, txtFile);
        const messageContent = (await fs.readFile(filePath, "utf8")).trim();

        // Se tem conteúdo válido
        if (messageContent && messageContent.length > 0) {
          await debug(`Mensagem carregada de: ${txtFile}`);
          return messageContent;
        } else {
          console.warn(`Arquivo ${txtFile} existe mas está vazio`);
        }
      } catch (fileError) {
        console.warn(`Erro ao ler arquivo ${txtFile}:`, fileError.message);
        continue;
      }
    }

    // Se chegou aqui, nenhum arquivo tinha conteúdo válido
    console.warn(
      "Nenhum arquivo .txt com conteúdo válido encontrado, usando mensagem padrão"
    );
    return getMensagemPadrao();
  } catch (error) {
    console.error("Erro ao buscar arquivos .txt na pasta messagesTxt:", error);
    return getMensagemPadrao();
  }
}

/**
 * Retorna a mensagem padrão caso não consiga ler o arquivo
 * @returns {string}
 */
function getMensagemPadrao() {
  return `Aqui é o Léo Rieper, da empresa *Dilson Stein!*\nEstamos organizando um evento para escolher novos modelos...`;
}

/**
 * Processa a mensagem substituindo placeholders
 * @param {string} message - Mensagem template
 * @param {string} name - Nome do contato
 * @returns {string} - Mensagem processada
 */
function processarMensagem(message, name = "") {
  // Substitui placeholders comuns
  return message
    .replace(/\{nome\}/gi, name)
    .replace(/\{name\}/gi, name)
    .replace(/\\n/g, "\n") // Converte \n literais em quebras de linha
    .trim();
}

module.exports = {
  lerMensagemSaudacao,
  processarMensagem,
  getMensagemPadrao,
};
