// services/messageService.js
// Agora usando SQLite em vez de JSON/TXT
const path = require("path");
const db = require("../config/db");

// Helpers para carregar dinamicamente enums TS
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


// CRUD
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

module.exports = {
  addMessage,
  getMessages,
  getMessageById,
  updateMessage,
  deleteMessage,
  getLastMessage,
  getAvailableMessageTypes,
  getAvailableLocales,
};
