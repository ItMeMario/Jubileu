// config/initialize.js
const fs = require("fs").promises;
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { debug } = require("../services/debugService");

// Função para detectar se está empacotado e obter caminhos corretos
function getAppPaths() {
  let app;
  try {
    const electron = require("electron");
    app = electron.app;
  } catch (error) {
    app = null;
  }

  if (app && app.isPackaged) {
    const userDataPath = app.getPath("userData");
    return {
      DATA_DIR: path.join(userDataPath, "data"),
      DATABASE_DIR: path.join(userDataPath, "data", "database"),
      isPackaged: true,
    };
  }

  const DATA_DIR = path.join(__dirname, "../data");
  return {
    DATA_DIR,
    DATABASE_DIR: path.join(DATA_DIR, "database"),
    isPackaged: false,
  };
}

const paths = getAppPaths();
const DATA_DIR = paths.DATA_DIR;
const DATABASE_DIR = paths.DATABASE_DIR;
const DATABASE_PATH = path.join(DATABASE_DIR, "system.db");

async function ensureDirectories() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(DATABASE_DIR, { recursive: true });
    console.log(`✅ Diretórios de dados inicializados: ${DATA_DIR}`);
  } catch (error) {
    console.error("❌ Erro ao criar diretórios:", error);
    throw error;
  }
}

async function initializeDatabase() {
  await ensureDirectories();
  
  let dbExists = false;
  try {
    await fs.access(DATABASE_PATH);
    dbExists = true;
  } catch {}

  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DATABASE_PATH, (err) => {
      if (err) {
        console.error("❌ Erro ao conectar ao banco SQLite:", err);
        return reject(err);
      }

      db.serialize(() => {
        db.run("PRAGMA journal_mode = WAL;");
        db.run("PRAGMA busy_timeout = 15000;");

        // Criação de tabelas mínimas necessárias para o bot lite
        db.run(`CREATE TABLE IF NOT EXISTS config (
          key TEXT PRIMARY KEY,
          value TEXT
        )`, (err) => {
          if (err) {
            console.error("❌ Erro ao criar tabela config:", err);
            db.close();
            return reject(err);
          }

          db.run(`CREATE TABLE IF NOT EXISTS flows (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            active INTEGER DEFAULT 1,
            definition TEXT
          )`, (err) => {
            if (err) {
              console.error("❌ Erro ao criar tabela flows:", err);
              db.close();
              return reject(err);
            }

            db.close((closeErr) => {
              if (closeErr) reject(closeErr);
              else resolve(DATABASE_PATH);
            });
          });
        });
      });
    });
  });
}

async function initializeAllConfigs() {
  console.log("🚀 Inicializando configurações do Zwei Chat...");
  await ensureDirectories();
  await initializeDatabase();
  console.log("✅ Configurações e diretórios do Zwei Chat inicializados com sucesso.");
  return { success: 1, errors: 0 };
}

module.exports = {
  DATA_DIR,
  DATABASE_DIR,
  DATABASE_PATH,
  paths,
  initializeAllConfigs,
  initializeDatabase,
};
