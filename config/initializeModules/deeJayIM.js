// config/initializeModules/deeJayIM.js
const { debug } = require("../../services/debugService");
const {
  getDatabaseConnection,
  runQuery,
  checkTableExists,
} = require("./databaseIM");

const DEE_JAY_STATUS = {
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  QR_PENDING: "qr_pending",
  AUTH_FAILURE: "auth_failure",
};

/**
 * Query de criação da tabela dee_jay_instances
 */
const CREATE_DEE_JAY_INSTANCES_TABLE = `
  CREATE TABLE IF NOT EXISTS dee_jay_instances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instance_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'disconnected',
    phone_number TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_connected_at DATETIME
  )
`;

const DEE_JAY_TRIGGER = `
  CREATE TRIGGER IF NOT EXISTS update_dee_jay_timestamp
  AFTER UPDATE ON dee_jay_instances
  BEGIN
    UPDATE dee_jay_instances SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END
`;

/**
 * Inicializa a tabela de instâncias do Dee Jay
 * @returns {Promise<boolean>}
 */
async function initializeDeeJayInstancesTable() {
  let db;
  try {
    db = await getDatabaseConnection();

    const tableExists = await checkTableExists(db, "dee_jay_instances");
    if (tableExists) {
      db.close();
      return true;
    }

    await runQuery(db, CREATE_DEE_JAY_INSTANCES_TABLE);
    await debug("✅ Tabela 'dee_jay_instances' criada");

    try {
        await runQuery(db, DEE_JAY_TRIGGER);
    } catch (err) {
        console.warn("⚠️ Erro ao criar trigger Dee Jay:", err.message);
    }

    db.close();
    return true;
  } catch (error) {
    console.error("❌ Erro ao inicializar tabela dee_jay_instances:", error);
    if (db) db.close();
    throw error;
  }
}

/**
 * Obtém todas as instâncias do Dee Jay
 */
async function getAllDeeJayInstances() {
    return new Promise(async (resolve, reject) => {
        let db;
        try {
            db = await getDatabaseConnection();
            db.all("SELECT * FROM dee_jay_instances ORDER BY created_at ASC", [], (err, rows) => {
                db.close();
                if (err) reject(err);
                else resolve(rows || []);
            });
        } catch (error) {
            if (db) db.close();
            reject(error);
        }
    });
}


/**
 * Cria uma nova instância Dee Jay
 */
async function createDeeJayInstance(name) {
    const instanceId = `dj-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    return new Promise(async (resolve, reject) => {
        let db;
        try {
            db = await getDatabaseConnection();
            db.run(
                "INSERT INTO dee_jay_instances (instance_id, name, status) VALUES (?, ?, ?)",
                [instanceId, name, DEE_JAY_STATUS.DISCONNECTED],
                function(err) {
                    if (err) {
                        db.close();
                        reject(err);
                        return;
                    }
                    const insertedId = this.lastID;
                    db.get("SELECT * FROM dee_jay_instances WHERE id = ?", [insertedId], (err, row) => {
                        db.close();
                        if (err) reject(err);
                        else resolve(row);
                    });
                }
            );
        } catch (error) {
            if (db) db.close();
            reject(error);
        }
    });
}

/**
 * Atualiza status da instância Dee Jay
 */
async function updateDeeJayInstanceStatus(instanceId, status, phoneNumber = null) {
  return new Promise(async (resolve, reject) => {
    let db;
    try {
      db = await getDatabaseConnection();
      let query = "UPDATE dee_jay_instances SET status = ?";
      let params = [status];

      if (phoneNumber) {
        query += ", phone_number = ?";
        params.push(phoneNumber);
      }

      if (status === DEE_JAY_STATUS.CONNECTED) {
        query += ", last_connected_at = CURRENT_TIMESTAMP";
      }

      query += " WHERE instance_id = ?";
      params.push(instanceId);

      db.run(query, params, function(err) {
        db.close();
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    } catch (error) {
        if(db) db.close();
        reject(error);
    }
  });
}

/**
 * Remove instância Dee Jay
 */
async function deleteDeeJayInstance(instanceId) {
    return new Promise(async (resolve, reject) => {
        let db;
        try {
            db = await getDatabaseConnection();
            db.run("DELETE FROM dee_jay_instances WHERE instance_id = ?", [instanceId], function(err) {
                db.close();
                if (err) reject(err);
                else resolve(this.changes > 0);
            });
        } catch (error) {
            if (db) db.close();
            reject(error);
        }
    });
}

/**
 * Reseta o status de todas as instâncias Dee Jay para disconnected
 * Útil na inicialização da aplicação para limpar estados "fantasma"
 * @returns {Promise<boolean>}
 */
async function resetAllDeeJayInstancesStatus() {
    return new Promise(async (resolve, reject) => {
        let db;
        try {
            db = await getDatabaseConnection();
            db.run(
                `UPDATE dee_jay_instances SET status = ?`,
                [DEE_JAY_STATUS.DISCONNECTED],
                function(err) {
                    db.close();
                    if (err) reject(err);
                    else {
                        console.log(`🔄 ${this.changes} instância(s) Dee Jay resetada(s) para disconnected`);
                        resolve(true);
                    }
                }
            );
        } catch (error) {
            if (db) db.close();
            reject(error);
        }
    });
}

module.exports = {
  initializeDeeJayInstancesTable,
  getAllDeeJayInstances,
  createDeeJayInstance,
  updateDeeJayInstanceStatus,
  deleteDeeJayInstance,
  resetAllDeeJayInstancesStatus,
  DEE_JAY_STATUS
};
