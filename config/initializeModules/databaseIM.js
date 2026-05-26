const fs = require("fs").promises;
const sqlite3 = require("sqlite3").verbose();
const { debug } = require("../../services/debugService");
const { DATABASE_PATH, ensureDatabaseDirectory } = require("./directoriesIM");

/**
 * Verifica se o banco de dados existe
 * @returns {Promise<boolean>}
 */
async function databaseExists() {
  try {
    await fs.access(DATABASE_PATH);
    return true;
  } catch {
    return false;
  }
}

/**
 * Verifica se uma tabela existe no banco
 * @param {sqlite3.Database} db - Conexão do banco
 * @param {string} tableName - Nome da tabela
 * @returns {Promise<boolean>}
 */
function checkTableExists(db, tableName) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      [tableName],
      (err, row) => {
        if (err) reject(err);
        else resolve(!!row);
      }
    );
  });
}

/**
 * Executa uma query no banco
 * @param {sqlite3.Database} db - Conexão do banco
 * @param {string} query - Query SQL
 * @param {Array} params - Parâmetros da query
 * @returns {Promise<any>}
 */
function runQuery(db, query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

/**
 * Obtém uma conexão com o banco de dados
 * @returns {Promise<sqlite3.Database>}
 */
function getDatabaseConnection() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DATABASE_PATH, (err) => {
      if (err) {
        console.error("❌ Erro ao conectar com o banco:", err);
        reject(err);
      } else {
        db.serialize(() => {
          // Ativa o modo WAL e adiciona timeout para evitar SQLITE_BUSY com múltiplas conexões concorrentes (ex: várias instâncias do Drone)
          db.run("PRAGMA journal_mode = WAL;");
          db.run("PRAGMA busy_timeout = 15000;");

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
        });
      }
    });
  });
}

/**
 * Queries de criação das tabelas
 */
const TABLE_QUERIES = [
  `CREATE TABLE IF NOT EXISTS cities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    link TEXT,
    link_id,
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
  `CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    tel TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'pending'
  )`,
  `CREATE TABLE IF NOT EXISTS area_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    priority INTEGER,
    name TEXT,
    ddd TEXT,
    tel TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS calendar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data DATE NOT NULL,
    titulo TEXT NOT NULL,
    cidade TEXT,
    estado TEXT,
    lat REAL,
    lng REAL,
    descricao TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
];

/**
 * Queries de criação dos índices
 */
const INDEX_QUERIES = [
  `CREATE INDEX IF NOT EXISTS idx_cities_isPrimary ON cities(isPrimary)`,
  `CREATE INDEX IF NOT EXISTS idx_messages_locale ON messages(locale)`,
  `CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type)`,
  `CREATE INDEX IF NOT EXISTS idx_indicators_horario ON indicators(horario_escolhido)`,
  `CREATE INDEX IF NOT EXISTS idx_indicators_created_at ON indicators(created_at)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_tel ON clients(tel)`,
  `CREATE INDEX IF NOT EXISTS idx_calendar_data ON calendar(data)`,
];

/**
 * Queries de criação dos triggers
 */
const TRIGGER_QUERIES = [
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

/**
 * Nomes das tabelas para verificação
 */
const TABLE_NAMES = ["cities", "indicators", "messages", "clients", "area_codes", "calendar"];

/**
 * Inicializa o banco de dados com todas as tabelas, índices e triggers
 * @returns {Promise<string>} - Caminho do banco de dados
 */
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
        // Verifica status inicial das tabelas
        const tablesExist = {};
        for (const tableName of TABLE_NAMES) {
          tablesExist[tableName] = await checkTableExists(db, tableName);
        }

        await debug(
          `📊 Status das tabelas: cities=${tablesExist.cities}, indicators=${tablesExist.indicators}, messages=${tablesExist.messages}, clients=${tablesExist.clients}, ddd=${tablesExist.area_codes}, calendar=${tablesExist.calendar}`
        );

        // Cria tabelas
        for (let i = 0; i < TABLE_QUERIES.length; i++) {
          try {
            await runQuery(db, TABLE_QUERIES[i]);
            await debug(`✅ Tabela '${TABLE_NAMES[i]}' criada/verificada`);
          } catch (err) {
            console.error(`❌ Erro ao criar tabela ${TABLE_NAMES[i]}:`, err);
            db.close();
            reject(err);
            return;
          }
        }

        // Cria índices
        for (const indexQuery of INDEX_QUERIES) {
          try {
            await runQuery(db, indexQuery);
          } catch (err) {
            console.error("⚠️ Erro ao criar índice:", err);
          }
        }

        await debug("✅ Índices criados/verificados");

        // Migration para adicionar novas colunas em calendar caso a tabela já exista
        const calendarCols = ["cidade", "estado", "lat", "lng"];
        for (const col of calendarCols) {
          try {
            const colType = (col === "lat" || col === "lng") ? "REAL" : "TEXT";
            await runQuery(db, `ALTER TABLE calendar ADD COLUMN ${col} ${colType}`);
            await debug(`✅ Coluna '${col}' adicionada em calendar`);
          } catch (err) {
            // Ignorar erro se a coluna já existir
          }
        }

        // Cria triggers
        for (const triggerQuery of TRIGGER_QUERIES) {
          try {
            await runQuery(db, triggerQuery);
          } catch (err) {
            console.error("⚠️ Erro ao criar trigger:", err);
          }
        }

        await debug("✅ Triggers criados/verificados");

        // Verificação final
        const finalCheck = {};
        for (const tableName of TABLE_NAMES) {
          finalCheck[tableName] = await checkTableExists(db, tableName);
        }

        await debug(
          `🔍 Verificação final das tabelas: cities=${finalCheck.cities}, indicators=${finalCheck.indicators}, messages=${finalCheck.messages}, clients=${finalCheck.clients}, ddd=${finalCheck.area_codes}, calendar=${finalCheck.calendar}`
        );

        // Valida se todas as tabelas foram criadas
        const missingTables = TABLE_NAMES.filter(
          (tableName) => !finalCheck[tableName]
        );

        if (missingTables.length > 0) {
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

module.exports = {
  databaseExists,
  checkTableExists,
  runQuery,
  getDatabaseConnection,
  initializeDatabase,
};
