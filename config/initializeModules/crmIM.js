// config/initializeModules/crmIM.js
const { debug } = require("../../services/debugService");
const {
  getDatabaseConnection,
  runQuery,
  checkTableExists,
} = require("./databaseIM");

const CRM_STATUS = {
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  AUTH_FAILURE: "auth_failure",
};

/**
 * Query de criação da tabela crm_instances
 */
const CREATE_CRM_INSTANCES_TABLE = `
  CREATE TABLE IF NOT EXISTS crm_instances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instance_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'disconnected',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_connected_at DATETIME
  )
`;

const CRM_TRIGGER = `
  CREATE TRIGGER IF NOT EXISTS update_crm_timestamp
  AFTER UPDATE ON crm_instances
  BEGIN
    UPDATE crm_instances SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END
`;

/**
 * Inicializa a tabela de instâncias do CRM
 * @returns {Promise<boolean>}
 */
async function initializeCrmInstancesTable() {
  let db;
  try {
    db = await getDatabaseConnection();

    const tableExists = await checkTableExists(db, "crm_instances");
    if (tableExists) {
      db.close();
      return true;
    }

    await runQuery(db, CREATE_CRM_INSTANCES_TABLE);
    await debug("✅ Tabela 'crm_instances' criada");

    try {
        await runQuery(db, CRM_TRIGGER);
    } catch (err) {
        console.warn("⚠️ Erro ao criar trigger CRM:", err.message);
    }

    db.close();
    return true;
  } catch (error) {
    console.error("❌ Erro ao inicializar tabela crm_instances:", error);
    if (db) db.close();
    throw error;
  }
}

/**
 * Obtém todas as instâncias do CRM
 */
async function getAllCrmInstances() {
    return new Promise(async (resolve, reject) => {
        let db;
        try {
            db = await getDatabaseConnection();
            db.all("SELECT * FROM crm_instances ORDER BY created_at ASC", [], (err, rows) => {
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
 * Cria uma nova instância CRM
 */
async function createCrmInstance(name) {
    const instanceId = `crm-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    return new Promise(async (resolve, reject) => {
        let db;
        try {
            db = await getDatabaseConnection();
            db.run(
                "INSERT INTO crm_instances (instance_id, name, status) VALUES (?, ?, ?)",
                [instanceId, name, CRM_STATUS.DISCONNECTED],
                function(err) {
                    if (err) {
                        db.close();
                        reject(err);
                        return;
                    }
                    const insertedId = this.lastID;
                    db.get("SELECT * FROM crm_instances WHERE id = ?", [insertedId], (err, row) => {
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
 * Atualiza status da instância CRM
 */
async function updateCrmInstanceStatus(instanceId, status) {
  return new Promise(async (resolve, reject) => {
    let db;
    try {
      db = await getDatabaseConnection();
      let query = "UPDATE crm_instances SET status = ?";
      let params = [status];

      if (status === CRM_STATUS.CONNECTED) {
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
 * Remove instância CRM
 */
async function deleteCrmInstance(instanceId) {
    return new Promise(async (resolve, reject) => {
        let db;
        try {
            db = await getDatabaseConnection();
            db.run("DELETE FROM crm_instances WHERE instance_id = ?", [instanceId], function(err) {
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
 * Reseta o status de todas as instâncias CRM para disconnected
 */
async function resetAllCrmInstancesStatus() {
    return new Promise(async (resolve, reject) => {
        let db;
        try {
            db = await getDatabaseConnection();
            db.run(
                `UPDATE crm_instances SET status = ?`,
                [CRM_STATUS.DISCONNECTED],
                function(err) {
                    db.close();
                    if (err) reject(err);
                    else {
                        console.log(`🔄 ${this.changes} instância(s) CRM resetada(s) para disconnected`);
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
  initializeCrmInstancesTable,
  getAllCrmInstances,
  createCrmInstance,
  updateCrmInstanceStatus,
  deleteCrmInstance,
  resetAllCrmInstancesStatus,
  CRM_STATUS
};
