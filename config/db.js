// config/db.js - VERSÃO CORRIGIDA
const sqlite3 = require("sqlite3").verbose();
const { debug } = require("../services/debugService");

// 🔧 CORREÇÃO: Importa o caminho correto do banco
const { DATABASE_PATH } = require("../config/initialize");

console.log("📂 config/db.js - Caminho do banco:", DATABASE_PATH);

const db = new sqlite3.Database(DATABASE_PATH, (err) => {
  if (err) {
    console.error("❌ Erro ao conectar ao banco:", err.message);
    console.error("❌ Caminho tentado:", DATABASE_PATH);
  } else {
    db.serialize(() => {
      db.run("PRAGMA journal_mode = WAL;");
      db.run("PRAGMA busy_timeout = 15000;");
    });
    console.log("✅ Conectado ao banco de dados SQLite.");
    console.log("📂 Caminho do banco:", DATABASE_PATH);
  }
});

module.exports = db;
