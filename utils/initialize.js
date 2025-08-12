const fs = require("fs").promises;
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { debug } = require("../services/debugService");

const DATA_DIR = path.join(__dirname, "../data");
const DATABASE_DIR = path.join(DATA_DIR, "database");
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
        // Verificar se as tabelas já existem
        const tablesExist = {
          cities: await checkTableExists(db, "cities"),
          indicators: await checkTableExists(db, "indicators"),
          messages: await checkTableExists(db, "messages"),
        };

        await debug(
          `📊 Status das tabelas: cities=${tablesExist.cities}, indicators=${tablesExist.indicators}, messages=${tablesExist.messages}`
        );

        // Criar tabelas se não existirem
        const queries = [
          // Tabela cities
          `CREATE TABLE IF NOT EXISTS cities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            link TEXT,
            isPrimary BOOLEAN DEFAULT 0,
            message TEXT
          )`,

          // Tabela indicators
          `CREATE TABLE IF NOT EXISTS indicators (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clientes_atendidos INTEGER DEFAULT 0,
            clientes_convidados INTEGER DEFAULT 0,
            horario_escolhido INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )`,

          // Tabela messages
          `CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            locale TEXT NOT NULL,
            message_type TEXT NOT NULL,
            message_content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )`,
        ];

        // Executar queries de criação de tabelas
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

        // Criar índices para otimização
        const indexes = [
          `CREATE INDEX IF NOT EXISTS idx_cities_isPrimary ON cities(isPrimary)`,
          `CREATE INDEX IF NOT EXISTS idx_messages_locale ON messages(locale)`,
          `CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type)`,
        ];

        for (const indexQuery of indexes) {
          try {
            await runQuery(db, indexQuery);
          } catch (err) {
            console.error("⚠️ Erro ao criar índice:", err);
            // Continua mesmo se houver erro nos índices
          }
        }

        await debug("✅ Índices criados/verificados");

        // Criar triggers para garantir que apenas uma cidade seja primária
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
        ];

        for (const triggerQuery of triggers) {
          try {
            await runQuery(db, triggerQuery);
          } catch (err) {
            console.error("⚠️ Erro ao criar trigger:", err);
            // Continua mesmo se houver erro nos triggers
          }
        }

        await debug("✅ Triggers criados/verificados");

        // Verificar novamente se as tabelas foram criadas
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
        // Testar a conexão fazendo uma query simples
        db.get(
          "SELECT name FROM sqlite_master WHERE type='table' LIMIT 1",
          (err, row) => {
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

// Função para migrar dados existentes dos arquivos JSON para o banco
async function migrateDataFromJsonToDatabase() {
  try {
    const db = await getDatabaseConnection();

    // Migrar cidades
    try {
      const citiesData = await readJsonFile("cities.json", []);
      if (citiesData && citiesData.length > 0) {
        await debug("🔄 Migrando dados de cidades para o banco...");

        for (const city of citiesData) {
          try {
            await runQuery(
              db,
              `INSERT OR IGNORE INTO cities (name, link, isPrimary, message) VALUES (?, ?, ?, ?)`,
              [
                city.name || "",
                city.link || "",
                city.isPrimary || false,
                city.message || "",
              ]
            );
          } catch (err) {
            console.error(`⚠️ Erro ao migrar cidade ${city.name}:`, err);
          }
        }

        await debug("✅ Migração de cidades concluída");
      }
    } catch (err) {
      await debug("ℹ️ Nenhum dado de cidades para migrar ou erro na migração");
    }

    // Migrar indicadores
    try {
      const indicatorsData = await readJsonFile("indicadoresData.json", null);
      if (indicatorsData) {
        await debug("🔄 Migrando dados de indicadores para o banco...");

        try {
          await runQuery(
            db,
            `INSERT INTO indicators (clientes_atendidos, clientes_convidados) VALUES (?, ?)`,
            [
              indicatorsData.clientesAtendidos || 0,
              indicatorsData.clientesConvidados || 0,
            ]
          );
        } catch (err) {
          console.error("⚠️ Erro ao migrar indicadores base:", err);
        }

        // Migrar horários escolhidos se existirem
        if (indicatorsData.horariosEscolhidos) {
          for (const [horarioId, horarioData] of Object.entries(
            indicatorsData.horariosEscolhidos
          )) {
            if (horarioData.count > 0) {
              for (let i = 0; i < horarioData.count; i++) {
                try {
                  await runQuery(
                    db,
                    `INSERT INTO indicators (clientes_atendidos, clientes_convidados, horario_escolhido) VALUES (0, 0, ?)`,
                    [parseInt(horarioId)]
                  );
                } catch (err) {
                  console.error(`⚠️ Erro ao migrar horário ${horarioId}:`, err);
                }
              }
            }
          }
        }

        await debug("✅ Migração de indicadores concluída");
      }
    } catch (err) {
      await debug(
        "ℹ️ Nenhum dado de indicadores para migrar ou erro na migração"
      );
    }

    // Migrar mensagens
    try {
      const messagesData = await readJsonFile("messages.json", []);
      if (messagesData && messagesData.length > 0) {
        await debug("🔄 Migrando dados de mensagens para o banco...");

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

async function ensureDataDirectory() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await debug(`✅ Pasta data criada/verificada: ${DATA_DIR}`);
  } catch (error) {
    console.error("Erro ao criar diretório data:", error);
    throw error;
  }
}

async function ensureCityMessageTxtFolder() {
  const folderPath = path.join(DATA_DIR, "cityMessageTxt");
  try {
    await fs.mkdir(folderPath, { recursive: true });
    await debug(`✅ Pasta cityMessageTxt criada/verificada: ${folderPath}`);
    return folderPath;
  } catch (error) {
    console.error("Erro ao criar pasta cityMessageTxt:", error);
    throw error;
  }
}

// Funções adicionadas para corrigir o erro do messageService
async function readJsonFile(filename, defaultValue = null) {
  await ensureDataDirectory();
  const filePath = path.join(DATA_DIR, filename);

  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      // Arquivo não existe, retorna valor padrão
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
    await fs.access(filePath); // Verifica se já existe
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
  const defaultConfig = {
    isDevMode: false,
    debugEnabled: false,
    lastChanged: null,
    lastDebugChanged: null,
    scoutConfig: {
      enabled: false,
      timeSeconds: 300, // 5 minutos padrão
      timeFormatted: "00:05:00",
      lastChanged: null,
    },
  };
  return await createJsonFileIfNotExists("devMode.json", defaultConfig);
}

async function initializeCitiesConfig() {
  const defaultCities = [];
  return await createJsonFileIfNotExists("cities.json", defaultCities);
}

async function initializeGroupsConfig() {
  const defaultGroups = { mode: "SINGLE", groups: [] };
  return await createJsonFileIfNotExists("groups.json", defaultGroups);
}

async function initializeMessagesConfig() {
  const defaultMessages = [];
  return await createJsonFileIfNotExists("messages.json", defaultMessages);
}

// 🆕 NOVA FUNÇÃO: Inicializa arquivo de controle anti-spam
async function initializeAntiSpamConfig() {
  const defaultAntiSpam = {
    userAttempts: {},
    suspendedUsers: {},
    lastCleanup: new Date().toISOString(),
  };
  return await createJsonFileIfNotExists("antiSpam.json", defaultAntiSpam);
}

// FUNÇÃO ATUALIZADA: Nova estrutura de indicadores com horários
async function initializeIndicadoresConfig() {
  const defaultIndicadores = {
    clientesAtendidos: 0,
    clientesConvidados: 0,
    horariosEscolhidos: {
      1: { horario: "10:00h (Manhã)", count: 0 },
      2: { horario: "12:00h (Meio-dia)", count: 0 },
      3: { horario: "14:00h (Depois do almoço)", count: 0 },
      4: { horario: "15:30h (Tarde)", count: 0 },
      5: { horario: "17:30h (Final da tarde)", count: 0 },
      6: { horario: "19:30h (Noite)", count: 0 },
    },
    lastUpdated: new Date().toISOString(),
  };
  return await createJsonFileIfNotExists(
    "indicadoresData.json",
    defaultIndicadores
  );
}

// NOVA FUNÇÃO: Para migrar dados antigos se necessário
async function migrateIndicadoresIfNeeded() {
  const filePath = path.join(DATA_DIR, "indicadoresData.json");

  try {
    const data = await readJsonFile("indicadoresData.json");

    if (data && !data.horariosEscolhidos) {
      await debug("🔄 Migrando estrutura antiga de indicadores...");

      data.horariosEscolhidos = {
        1: { horario: "10:00h (Manhã)", count: 0 },
        2: { horario: "12:00h (Meio-dia)", count: 0 },
        3: { horario: "14:00h (Depois do almoço)", count: 0 },
        4: { horario: "15:30h (Tarde)", count: 0 },
        5: { horario: "17:30h (Final da tarde)", count: 0 },
        6: { horario: "19:30h (Noite)", count: 0 },
      };

      // Remove campos antigos se existirem
      if (data.atendidos !== undefined) {
        data.clientesAtendidos = data.atendidos || 0;
        delete data.atendidos;
      }
      if (data.interessados !== undefined) {
        delete data.interessados;
      }
      if (data.conversoes !== undefined) {
        delete data.conversoes;
      }
      if (data.lastReset !== undefined) {
        delete data.lastReset;
      }

      // Garante que existe clientesConvidados
      if (data.clientesConvidados === undefined) {
        data.clientesConvidados = 0;
      }

      data.lastUpdated = new Date().toISOString();

      await saveJsonFile("indicadoresData.json", data);
      await debug("✅ Migração de indicadores concluída com sucesso!");
    }
  } catch (error) {
    console.error("Erro durante migração de indicadores:", error);
  }
}

// NOVA FUNÇÃO: Para migrar configuração do devMode e adicionar Scout
async function migrateDevModeIfNeeded() {
  try {
    const data = await readJsonFile("devMode.json");

    if (data && !data.scoutConfig) {
      await debug("🔄 Migrando configuração de devMode para incluir Scout...");

      data.scoutConfig = {
        enabled: false,
        timeSeconds: 300, // 5 minutos padrão
        timeFormatted: "00:05:00",
        lastChanged: null,
      };

      // Garante que debugEnabled existe
      if (data.debugEnabled === undefined) {
        data.debugEnabled = false;
      }

      await saveJsonFile("devMode.json", data);
      await debug("✅ Migração de devMode concluída com sucesso!");
    }
  } catch (error) {
    console.error("Erro durante migração de devMode:", error);
  }
}

async function initializeAllConfigs() {
  console.log(
    "🚀 Inicializando arquivos, pastas e banco de dados do sistema...\n"
  );

  // Primeiro inicializa o banco de dados
  try {
    const dbPath = await initializeDatabase();
    console.log(`✅ Banco de dados inicializado: ${dbPath}`);
  } catch (error) {
    console.error("❌ Erro crítico ao inicializar banco de dados:", error);
    throw error;
  }

  const results = await Promise.allSettled([
    initializeDevModeConfig(),
    initializeCitiesConfig(),
    initializeGroupsConfig(),
    initializeMessagesConfig(),
    initializeIndicadoresConfig(),
    initializeAntiSpamConfig(),
    ensureCityMessageTxtFolder(),
  ]);

  // Executa migrações após inicialização
  await migrateIndicadoresIfNeeded();
  await migrateDevModeIfNeeded();

  // Migra dados dos JSONs para o banco (apenas na primeira execução)
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
          "initializeCitiesConfig",
          "initializeGroupsConfig",
          "initializeMessagesConfig",
          "initializeIndicadoresConfig",
          "initializeAntiSpamConfig",
          "ensureCityMessageTxtFolder",
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
  initializeCitiesConfig,
  initializeGroupsConfig,
  initializeMessagesConfig,
  initializeIndicadoresConfig,
  initializeAntiSpamConfig,
  initializeAllConfigs,
  ensureCityMessageTxtFolder,
  migrateIndicadoresIfNeeded,
  migrateDevModeIfNeeded,
  DATA_DIR,
  DATABASE_DIR,
  DATABASE_PATH,
  readJsonFile,
  saveJsonFile,
  // Novas funções do banco
  ensureDatabaseDirectory,
  initializeDatabase,
  getDatabaseConnection,
  migrateDataFromJsonToDatabase,
  databaseExists,
  checkTableExists,
  runQuery,
};
