// services/droneService.js
const { getDatabaseConnection } = require("../utils/initialize");

async function listarMensagensDisponiveis() {
  const db = await getDatabaseConnection();

  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM messages WHERE message_type = ?",
      ["drone"],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      }
    );
  });
}

module.exports = {
  listarMensagensDisponiveis,
};
