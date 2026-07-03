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

            db.run(`CREATE TABLE IF NOT EXISTS instances (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL
            )`, (err) => {
              if (err) {
                console.error("❌ Erro ao criar tabela instances:", err);
                db.close();
                return reject(err);
              }

              // Criação de tabelas adicionais para o Dee Jay
              db.run(`CREATE TABLE IF NOT EXISTS dee_jay_instances (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                status TEXT DEFAULT 'disconnected',
                phone_number TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_connected_at DATETIME
              )`, (err) => {
                if (err) {
                  console.error("❌ Erro ao criar tabela dee_jay_instances:", err);
                  db.close();
                  return reject(err);
                }

                db.run(`CREATE TABLE IF NOT EXISTS dee_jay_messages (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  message_content TEXT NOT NULL,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`, (err) => {
                  if (err) {
                    console.error("❌ Erro ao criar tabela dee_jay_messages:", err);
                    db.close();
                    return reject(err);
                  }

                   // Povoa mensagens iniciais se estiver vazia
                  db.get("SELECT COUNT(*) as count FROM dee_jay_messages", [], (err, row) => {
                    if (!err && row && row.count === 0) {
                      const defaultMessages = [
                        "Olá, tudo bem?",
                        "Tudo ótimo por aqui, e com você?",
                        "Tudo bem também! O que está fazendo de bom?",
                        "Apenas trabalhando e estudando um pouco.",
                        "Muito bom! Eu estou tomando um café agora.",
                        "Café é sempre excelente! ☕",
                        "Sim! Ajuda a manter o foco haha",
                        "Verdade. Como foi o seu dia ontem?",
                        "Foi bem produtivo, consegui finalizar bastante coisa.",
                        "Show de bola! Eu também tive um dia corrido.",
                        "Faz parte, o importante é progredir.",
                        "Com certeza! Vamos nos falando.",
                        "Beleza, um abraço!",
                        "Outro! 👍"
                      ];
                      const stmt = db.prepare("INSERT INTO dee_jay_messages (message_content) VALUES (?)");
                      defaultMessages.forEach((msg) => {
                        stmt.run(msg);
                      });
                      stmt.finalize();
                      console.log("🌱 Mensagens padrão do Dee Jay inseridas com sucesso.");
                    }

                    // Criação de tabelas para o Drone
                    db.run(`CREATE TABLE IF NOT EXISTS drone_instances (
                      id TEXT PRIMARY KEY,
                      name TEXT NOT NULL,
                      status TEXT DEFAULT 'disconnected',
                      phone_number TEXT,
                      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                      last_connected_at DATETIME
                    )`, (err) => {
                      if (err) {
                        console.error("❌ Erro ao criar tabela drone_instances:", err);
                        db.close();
                        return reject(err);
                      }

                      db.run(`CREATE TABLE IF NOT EXISTS drone_messages (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        message_content TEXT NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                      )`, (err) => {
                        if (err) {
                          console.error("❌ Erro ao criar tabela drone_messages:", err);
                          db.close();
                          return reject(err);
                        }

                        db.run(`CREATE TABLE IF NOT EXISTS drone_clients (
                          id INTEGER PRIMARY KEY AUTOINCREMENT,
                          name TEXT,
                          tel TEXT NOT NULL UNIQUE,
                          status TEXT DEFAULT 'pending',
                          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                        )`, (err) => {
                          if (err) {
                            console.error("❌ Erro ao criar tabela drone_clients:", err);
                            db.close();
                            return reject(err);
                          }

                          // Povoa mensagens padrão do Drone se estiver vazia
                          db.get("SELECT COUNT(*) as count FROM drone_messages", [], (err, row) => {
                            if (!err && row && row.count === 0) {
                              const defaultDroneMessages = [
                                "Olá {{name}}, tudo bem? Passando para te desejar um excelente dia!",
                                "Oi {{name}}! Como estão as coisas por aí?",
                                "Tudo bem, {{name}}? Vi que você demonstrou interesse em nossos serviços e gostaria de tirar suas dúvidas!"
                              ];
                              const stmt = db.prepare("INSERT INTO drone_messages (message_content) VALUES (?)");
                              defaultDroneMessages.forEach((msg) => {
                                stmt.run(msg);
                              });
                              stmt.finalize();
                              console.log("🌱 Mensagens padrão do Drone inseridas com sucesso.");
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
                });
              });
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
