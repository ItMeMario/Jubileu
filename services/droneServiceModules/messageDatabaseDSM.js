// services/droneServiceModules/messageDatabaseDSM.js
const { getDatabaseConnection } = require("../../config/initialize");

/**
 * Lista todas as mensagens disponíveis do tipo "drone"
 * @returns {Promise<Array>} - Array de mensagens
 */
async function listarMensagensDisponiveis() {
  const db = await getDatabaseConnection();

  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM messages WHERE message_type = ?",
      ["drone"],
      (err, rows) => {
        db.close();
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      }
    );
  });
}

/**
 * Busca mensagem por ID no banco
 * @param {number} mensagemId - ID da mensagem
 * @returns {Promise<Object|null>} - Mensagem encontrada ou null
 */
async function buscarMensagemPorId(mensagemId) {
  const db = await getDatabaseConnection();

  return new Promise((resolve, reject) => {
    db.get(
      "SELECT * FROM messages WHERE id = ? AND message_type = ?",
      [mensagemId, "drone"],
      (err, row) => {
        db.close();
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      }
    );
  });
}

module.exports = {
  listarMensagensDisponiveis,
  buscarMensagemPorId,
};
