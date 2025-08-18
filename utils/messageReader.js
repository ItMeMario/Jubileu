// utils/messageService.js
const fs = require("fs");
const path = require("path");
const db = require("../config/db");

function getConfigLocale() {
  const configPath = path.join(__dirname, "../data/config.json");
  const configRaw = fs.readFileSync(configPath, "utf-8");
  const config = JSON.parse(configRaw);
  return config.locale || "pt-BR"; // fallback se não tiver definido
}

async function getWelcomeMessage() {
  return new Promise((resolve, reject) => {
    const locale = getConfigLocale();
    const sql = `SELECT message_content 
                 FROM messages 
                 WHERE message_type = ? AND locale = ? 
                 ORDER BY created_at DESC LIMIT 1`;

    db.get(sql, ["welcome", locale], (err, row) => {
      if (err) {
        return reject(err);
      }
      if (!row) {
        return resolve("Mensagem de boas-vindas não configurada no banco.");
      }
      resolve(row.message_content);
    });
  });
}

function processarMensagem(template, name) {
  // mantém a lógica de substituir placeholders, se já existia
  return template.replace(/\{\{name\}\}/g, name);
}

module.exports = {
  getWelcomeMessage,
  processarMensagem,
};
