// config/db.js
const sqlite3 = require("sqlite3").verbose();
const { DATABASE_PATH } = require("./initialize");

console.log("📂 db.js - Conectando ao banco de dados em:", DATABASE_PATH);

const db = new sqlite3.Database(DATABASE_PATH, (err) => {
  if (err) {
    console.error("❌ Erro ao conectar ao banco:", err.message);
  } else {
    db.serialize(() => {
      db.run("PRAGMA journal_mode = WAL;");
      db.run("PRAGMA busy_timeout = 15000;");
    });
    console.log("✅ Conectado ao banco de dados SQLite (Zwei Chat).");
  }
});

module.exports = db;
