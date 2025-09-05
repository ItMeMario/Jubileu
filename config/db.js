// config/db.js
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { debug } = require("../services/debugService");

// Caminho para o banco existente
const dbPath = path.join(__dirname, "../data/database/system.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ Erro ao conectar ao banco:", err.message);
  } else {
    debug("✅ Conectado ao banco de dados SQLite.");
  }
});

module.exports = db;
