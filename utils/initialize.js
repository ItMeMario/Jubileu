const fs = require("fs").promises;
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { debug } = require("../services/debugService");

// Função para detectar se está empacotado e obter caminhos corretos
function getAppPaths() {
  const { app } = require("electron");

  if (app && app.isPackaged) {
    // Quando empacotado, usar userData para dados persistentes
    const userDataPath = app.getPath("userData");
    return {
      DATA_DIR: path.join(userDataPath, "data"),
      DATABASE_DIR: path.join(userDataPath, "data", "database"),
      isPackaged: true,
    };
  } else {
    // Durante desenvolvimento, usar caminhos relativos como antes
    const DATA_DIR = path.join(__dirname, "../data");
    return {
      DATA_DIR,
      DATABASE_DIR: path.join(DATA_DIR, "database"),
      isPackaged: false,
    };
  }
}

// Obter caminhos corretos
const paths = getAppPaths();
const DATA_DIR = paths.DATA_DIR;
const DATABASE_DIR = paths.DATABASE_DIR;
const DATABASE_PATH = path.join(DATABASE_DIR, "system.db");

// Função para garantir que o diretório do banco existe
async function ensureDatabaseDirectory() {
  try {
    await fs.mkdir(DATABASE_DIR, { recursive: true });
    await debug(`✅ Pasta database criada/verificada: ${DATABASE_DIR}`);
  } catch (error) {
    console.error("Erro ao criar diretório database:", error);
    throw error;
  }
}

// Função para verificar se o arquivo do banco existe
async function databaseExists() {
  try {
    await fs.access(DATABASE_PATH);
    return true;
  } catch {
    return false;
  }
}

// Função para verificar se uma tabela existe
function checkTableExists(db, tableName) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      [tableName],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(!!row);
        }
      }
    );
  });
}

// Função para executar uma query com Promise
function runQuery(db, query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
}

// Função para inicializar o banco de dados
async function initializeDatabase() {
  await ensureDatabaseDirectory();

  const dbExists = await databaseExists();
  if (dbExists) {
    await debug(`✅ Banco de dados já existe: ${DATABASE_PATH}`);
  } else {
    await debug(`🔧 Criando novo banco de dados: ${DATABASE_PATH}`);
  }

  return new Promise(async (resolve, reject) => {
    const db = new sqlite3.Database(DATABASE_PATH, async (err) => {
      if (err) {
        console.error("Erro ao conectar com o banco de dados:", err);
        reject(err);
        return;
      }

      if (!dbExists) {
        await debug(`✅ Banco de dados criado e conectado: ${DATABASE_PATH}`);
      } else {
        await debug(`✅ Conectado ao banco existente: ${DATABASE_PATH}`);
      }

      try {
        const tablesExist = {
          cities: await checkTableExists(db, "cities"),
          indicators: await checkTableExists(db, "indicators"),
          messages: await checkTableExists(db, "messages"),
        };

        await debug(
          `📊 Status das tabelas: cities=${tablesExist.cities}, indicators=${tablesExist.indicators}, messages=${tablesExist.messages}`
        );

        const queries = [
          `CREATE TABLE IF NOT EXISTS cities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    link TEXT,
    isPrimary BOOLEAN DEFAULT 0,
    message TEXT,
    date DATE NOT NULL
  )`,
          `CREATE TABLE IF NOT EXISTS indicators (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clientes_atendidos INTEGER DEFAULT 0,
            clientes_convidados INTEGER DEFAULT 0,
            horario_escolhido INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )`,
          `CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            locale TEXT NOT NULL,
            message_type TEXT NOT NULL,
            message_content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )`,
        ];

        for (let i = 0; i < queries.length; i++) {
          try {
            await runQuery(db, queries[i]);
            const tableName = ["cities", "indicators", "messages"][i];
            await debug(`✅ Tabela '${tableName}' criada/verificada`);
          } catch (err) {
            console.error(`❌ Erro ao criar tabela ${i + 1}:`, err);
            db.close();
            reject(err);
            return;
          }
        }

        const indexes = [
          `CREATE INDEX IF NOT EXISTS idx_cities_isPrimary ON cities(isPrimary)`,
          `CREATE INDEX IF NOT EXISTS idx_messages_locale ON messages(locale)`,
          `CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type)`,
          `CREATE INDEX IF NOT EXISTS idx_indicators_horario ON indicators(horario_escolhido)`,
          `CREATE INDEX IF NOT EXISTS idx_indicators_created_at ON indicators(created_at)`,
        ];

        for (const indexQuery of indexes) {
          try {
            await runQuery(db, indexQuery);
          } catch (err) {
            console.error("⚠️ Erro ao criar índice:", err);
          }
        }

        await debug("✅ Índices criados/verificados");

        const triggers = [
          `CREATE TRIGGER IF NOT EXISTS enforce_single_primary_city
           BEFORE UPDATE ON cities
           WHEN NEW.isPrimary = 1 AND OLD.isPrimary = 0
           BEGIN
             UPDATE cities SET isPrimary = 0 WHERE isPrimary = 1 AND id != NEW.id;
           END`,
          `CREATE TRIGGER IF NOT EXISTS enforce_single_primary_city_insert
           BEFORE INSERT ON cities
           WHEN NEW.isPrimary = 1
           BEGIN
             UPDATE cities SET isPrimary = 0 WHERE isPrimary = 1;
           END`,
          `CREATE TRIGGER IF NOT EXISTS update_indicators_timestamp
           AFTER UPDATE ON indicators
           BEGIN
             UPDATE indicators SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
           END`,
        ];

        for (const triggerQuery of triggers) {
          try {
            await runQuery(db, triggerQuery);
          } catch (err) {
            console.error("⚠️ Erro ao criar trigger:", err);
          }
        }

        await debug("✅ Triggers criados/verificados");

        const finalCheck = {
          cities: await checkTableExists(db, "cities"),
          indicators: await checkTableExists(db, "indicators"),
          messages: await checkTableExists(db, "messages"),
        };

        await debug(
          `🔍 Verificação final das tabelas: cities=${finalCheck.cities}, indicators=${finalCheck.indicators}, messages=${finalCheck.messages}`
        );

        if (
          !finalCheck.cities ||
          !finalCheck.indicators ||
          !finalCheck.messages
        ) {
          const missingTables = Object.entries(finalCheck)
            .filter(([table, exists]) => !exists)
            .map(([table]) => table);

          const error = new Error(
            `Tabelas não foram criadas: ${missingTables.join(", ")}`
          );
          console.error("❌ Erro crítico:", error.message);
          db.close();
          reject(error);
          return;
        }

        await debug(
          "✅ Todas as tabelas do banco foram criadas/verificadas com sucesso"
        );

        db.close((err) => {
          if (err) {
            console.error("Erro ao fechar banco:", err);
            reject(err);
          } else {
            resolve(DATABASE_PATH);
          }
        });
      } catch (error) {
        console.error("❌ Erro durante inicialização do banco:", error);
        db.close();
        reject(error);
      }
    });
  });
}

// Função para obter conexão com o banco
function getDatabaseConnection() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DATABASE_PATH, (err) => {
      if (err) {
        console.error("❌ Erro ao conectar com o banco:", err);
        reject(err);
      } else {
        db.get(
          "SELECT name FROM sqlite_master WHERE type='table' LIMIT 1",
          (err) => {
            if (err) {
              console.error("❌ Erro ao testar conexão do banco:", err);
              db.close();
              reject(err);
            } else {
              resolve(db);
            }
          }
        );
      }
    });
  });
}

// Migração de dados dos JSONs para o banco
async function migrateDataFromJsonToDatabase() {
  try {
    const db = await getDatabaseConnection();

    try {
      const messagesData = await readJsonFile("messages.json", []);
      if (messagesData && messagesData.length > 0) {
        await debug("📄 Migrando dados de mensagens para o banco...");

        for (const message of messagesData) {
          try {
            await runQuery(
              db,
              `INSERT OR IGNORE INTO messages (locale, message_type, message_content) VALUES (?, ?, ?)`,
              [
                message.locale || "",
                message.message_type || "",
                message.message_content || "",
              ]
            );
          } catch (err) {
            console.error(
              `⚠️ Erro ao migrar mensagem ${message.message_type}:`,
              err
            );
          }
        }

        await debug("✅ Migração de mensagens concluída");
      }
    } catch (err) {
      await debug(
        "ℹ️ Nenhum dado de mensagens para migrar ou erro na migração"
      );
    }

    db.close();
    await debug("🎉 Migração de dados concluída com sucesso!");
  } catch (error) {
    console.error("❌ Erro durante migração de dados:", error);
  }
}

// Utilidades JSON
async function ensureDataDirectory() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await debug(`✅ Pasta data criada/verificada: ${DATA_DIR}`);
  } catch (error) {
    console.error("Erro ao criar diretório data:", error);
    throw error;
  }
}

async function readJsonFile(filename, defaultValue = null) {
  await ensureDataDirectory();
  const filePath = path.join(DATA_DIR, filename);

  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      return defaultValue;
    }
    console.error(`Erro ao ler ${filename}:`, error);
    throw error;
  }
}

async function saveJsonFile(filename, data) {
  await ensureDataDirectory();
  const filePath = path.join(DATA_DIR, filename);

  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (error) {
    console.error(`Erro ao salvar ${filename}:`, error);
    return false;
  }
}

async function createJsonFileIfNotExists(filename, defaultContent) {
  await ensureDataDirectory();
  const filePath = path.join(DATA_DIR, filename);

  try {
    await fs.access(filePath);
    await debug(`✅ Arquivo ${filename} já existe em ${DATA_DIR}`);
    return filePath;
  } catch (err) {
    if (err.code === "ENOENT") {
      await fs.writeFile(
        filePath,
        JSON.stringify(defaultContent, null, 2),
        "utf8"
      );
      await debug(`✅ Arquivo ${filename} criado em ${DATA_DIR}`);
      return filePath;
    }
    throw err;
  }
}

async function initializeDevModeConfig() {
  // Default alinhado com a estrutura fornecida
  const defaultConfig = {
    isDevMode: true,
    lastChanged: "2025-07-24T15:20:28.466Z",
    debugEnabled: false,
    lastDebugChanged: "2025-08-04T14:45:32.140Z",
    scoutConfig: {
      enabled: true,
      timeSeconds: 3600,
      timeFormatted: "01:00:00",
      lastChanged: "2025-07-25T13:22:28.015Z",
    },
  };
  return await createJsonFileIfNotExists("devMode.json", defaultConfig);
}

async function initializeMessagesConfig() {
  const defaultMessages = [];
  return await createJsonFileIfNotExists("messages.json", defaultMessages);
}

async function initializeAntiSpamConfig() {
  const defaultAntiSpam = {
    userAttempts: {},
    suspendedUsers: {},
    lastCleanup: new Date().toISOString(),
  };
  return await createJsonFileIfNotExists("antiSpam.json", defaultAntiSpam);
}

async function migrateDevModeIfNeeded() {
  try {
    const data = await readJsonFile("devMode.json");

    if (!data) return;

    // Se não houver scoutConfig, cria com padrão alinhado à estrutura pedida
    if (!data.scoutConfig) {
      await debug("📄 Migrando configuração de devMode para incluir Scout...");
      data.scoutConfig = {
        enabled: true,
        timeSeconds: 3600,
        timeFormatted: "01:00:00",
        lastChanged: null,
      };
    } else {
      // Completa campos que possam faltar
      if (typeof data.scoutConfig.enabled === "undefined")
        data.scoutConfig.enabled = true;
      if (typeof data.scoutConfig.timeSeconds === "undefined")
        data.scoutConfig.timeSeconds = 3600;
      if (typeof data.scoutConfig.timeFormatted === "undefined")
        data.scoutConfig.timeFormatted = "01:00:00";
      if (typeof data.scoutConfig.lastChanged === "undefined")
        data.scoutConfig.lastChanged = null;
    }

    if (typeof data.debugEnabled === "undefined") {
      data.debugEnabled = false;
    }
    if (typeof data.lastDebugChanged === "undefined") {
      data.lastDebugChanged = null;
    }

    await saveJsonFile("devMode.json", data);
    await debug("✅ Migração de devMode concluída com sucesso!");
  } catch (error) {
    console.error("Erro durante migração de devMode:", error);
  }
}

async function initializeAllConfigs() {
  debug(
    "🚀 Inicializando arquivos, pastas e banco de dados do sistema...\n"
  );

  try {
    const dbPath = await initializeDatabase();
    debug(`✅ Banco de dados inicializado: ${dbPath}`);
  } catch (error) {
    console.error("❌ Erro crítico ao inicializar banco de dados:", error);
    throw error;
  }

  const results = await Promise.allSettled([
    initializeDevModeConfig(),
    initializeMessagesConfig(),
    initializeAntiSpamConfig(),
  ]);

  await migrateDevModeIfNeeded();
  await migrateDataFromJsonToDatabase();

  const successCount = results.filter((r) => r.status === "fulfilled").length;
  const errorCount = results.filter((r) => r.status === "rejected").length;

  await debug(
    `✅ Inicialização concluída: ${successCount} sucesso(s), ${errorCount} erro(s)\n`
  );

  if (errorCount > 0) {
    await debug("❌ Detalhes dos erros:");
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        const functionNames = [
          "initializeDevModeConfig",
          "initializeMessagesConfig",
          "initializeAntiSpamConfig",
        ];
        console.error(`   ${functionNames[i]}: ${r.reason.message}`);
      }
    });
    await debug("");
  }

  return { success: successCount, errors: errorCount };
}

module.exports = {
  ensureDataDirectory,
  createJsonFileIfNotExists,
  initializeDevModeConfig,
  initializeMessagesConfig,
  initializeAntiSpamConfig,
  initializeAllConfigs,
  migrateDevModeIfNeeded,
  DATA_DIR,
  DATABASE_DIR,
  DATABASE_PATH,
  readJsonFile,
  saveJsonFile,
  ensureDatabaseDirectory,
  initializeDatabase,
  getDatabaseConnection,
  migrateDataFromJsonToDatabase,
  databaseExists,
  checkTableExists,
  runQuery,
};
