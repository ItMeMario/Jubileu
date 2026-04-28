// config/initializeModules/droneInstancesIM.js
const { debug } = require("../../services/debugService");
const {
  getDatabaseConnection,
  runQuery,
  checkTableExists,
} = require("./databaseIM");

/**
 * Constantes de configuração
 */
const MAX_INSTANCES = 5;

const INSTANCE_STATUS = {
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  QR_PENDING: "qr_pending",
  AUTH_FAILURE: "auth_failure",
};

/**
 * Query de criação da tabela drone_instances
 */
const CREATE_INSTANCES_TABLE = `
  CREATE TABLE IF NOT EXISTS drone_instances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instance_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'disconnected',
    phone_number TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_connected_at DATETIME,
    is_active BOOLEAN DEFAULT 1
  )
`;

/**
 * Índices para a tabela drone_instances
 */
const INSTANCES_INDEX_QUERIES = [
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_drone_instances_instance_id ON drone_instances(instance_id)`,
  `CREATE INDEX IF NOT EXISTS idx_drone_instances_status ON drone_instances(status)`,
  `CREATE INDEX IF NOT EXISTS idx_drone_instances_is_active ON drone_instances(is_active)`,
];

/**
 * Trigger para atualizar updated_at automaticamente
 */
const INSTANCES_TRIGGER = `
  CREATE TRIGGER IF NOT EXISTS update_drone_instances_timestamp
  AFTER UPDATE ON drone_instances
  BEGIN
    UPDATE drone_instances SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END
`;

/**
 * Inicializa a tabela de instâncias do drone no banco de dados
 * @returns {Promise<boolean>}
 */
async function initializeDroneInstancesTable() {
  let db;
  try {
    db = await getDatabaseConnection();

    // Verifica se tabela já existe
    const tableExists = await checkTableExists(db, "drone_instances");

    if (tableExists) {
      db.close();
      return true;
    }

    // Cria tabela
    await runQuery(db, CREATE_INSTANCES_TABLE);
    await debug("✅ Tabela 'drone_instances' criada com sucesso");

    // Cria índices
    for (const indexQuery of INSTANCES_INDEX_QUERIES) {
      try {
        await runQuery(db, indexQuery);
      } catch (err) {
        console.warn("⚠️ Erro ao criar índice em drone_instances:", err.message);
      }
    }
    await debug("✅ Índices da tabela 'drone_instances' criados");

    // Cria trigger
    try {
      await runQuery(db, INSTANCES_TRIGGER);
      await debug("✅ Trigger de 'drone_instances' criado");
    } catch (err) {
      console.warn("⚠️ Erro ao criar trigger em drone_instances:", err.message);
    }

    db.close();
    return true;
  } catch (error) {
    console.error("❌ Erro ao inicializar tabela drone_instances:", error);
    if (db) db.close();
    throw error;
  }
}

/**
 * Obtém todas as instâncias do drone ativas
 * @returns {Promise<Array>}
 */
async function getAllDroneInstances() {
  return new Promise(async (resolve, reject) => {
    let db;
    try {
      db = await getDatabaseConnection();
      db.all(
        `SELECT * FROM drone_instances WHERE is_active = 1 ORDER BY created_at ASC`,
        [],
        (err, rows) => {
          db.close();
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    } catch (error) {
      if (db) db.close();
      reject(error);
    }
  });
}

/**
 * Obtém uma instância do drone por ID
 * @param {string} instanceId - ID único da instância
 * @returns {Promise<Object|null>}
 */
async function getDroneInstanceById(instanceId) {
  return new Promise(async (resolve, reject) => {
    let db;
    try {
      db = await getDatabaseConnection();
      db.get(
        `SELECT * FROM drone_instances WHERE instance_id = ?`,
        [instanceId],
        (err, row) => {
          db.close();
          if (err) reject(err);
          else resolve(row || null);
        }
      );
    } catch (error) {
      if (db) db.close();
      reject(error);
    }
  });
}

/**
 * Conta instâncias do drone ativas
 * @returns {Promise<number>}
 */
async function countActiveDroneInstances() {
  return new Promise(async (resolve, reject) => {
    let db;
    try {
      db = await getDatabaseConnection();
      db.get(
        `SELECT COUNT(*) as count FROM drone_instances WHERE is_active = 1`,
        [],
        (err, row) => {
          db.close();
          if (err) reject(err);
          else resolve(row?.count || 0);
        }
      );
    } catch (error) {
      if (db) db.close();
      reject(error);
    }
  });
}

/**
 * Cria uma nova instância do drone
 * @param {string} name - Nome da instância
 * @returns {Promise<Object>}
 */
async function createDroneInstance(name) {
  // Verifica limite de instâncias
  const currentCount = await countActiveDroneInstances();
  if (currentCount >= MAX_INSTANCES) {
    throw new Error(`Limite máximo de ${MAX_INSTANCES} instâncias atingido`);
  }

  // Gera ID único automaticamente
  const finalInstanceId = `drone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return new Promise(async (resolve, reject) => {
    let db;
    try {
      db = await getDatabaseConnection();
      db.run(
        `INSERT INTO drone_instances (instance_id, name, status) VALUES (?, ?, ?)`,
        [finalInstanceId, name, INSTANCE_STATUS.DISCONNECTED],
        function (err) {
          if (err) {
            db.close();
            reject(err);
            return;
          }

          const insertedId = this.lastID;

          // Busca o registro inserido
          db.get(
            `SELECT * FROM drone_instances WHERE id = ?`,
            [insertedId],
            (err, row) => {
              db.close();
              if (err) reject(err);
              else resolve(row);
            }
          );
        }
      );
    } catch (error) {
      if (db) db.close();
      reject(error);
    }
  });
}

/**
 * Atualiza o status de uma instância do drone
 * @param {string} instanceId - ID da instância
 * @param {string} status - Novo status
 * @param {string} phoneNumber - Número do telefone (opcional)
 * @returns {Promise<boolean>}
 */
async function updateDroneInstanceStatus(instanceId, status, phoneNumber = null) {
  return new Promise(async (resolve, reject) => {
    let db;
    try {
      db = await getDatabaseConnection();

      let query = `UPDATE drone_instances SET status = ?`;
      let params = [status];

      // Atualiza número do telefone se fornecido
      if (phoneNumber) {
        query += `, phone_number = ?`;
        params.push(phoneNumber);
      }

      // Atualiza last_connected_at se status for connected
      if (status === INSTANCE_STATUS.CONNECTED) {
        query += `, last_connected_at = CURRENT_TIMESTAMP`;
      }

      query += ` WHERE instance_id = ?`;
      params.push(instanceId);

      db.run(query, params, function (err) {
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
 * Atualiza o nome de uma instância do drone
 * @param {string} instanceId - ID da instância
 * @param {string} name - Novo nome
 * @returns {Promise<boolean>}
 */
async function updateDroneInstanceName(instanceId, name) {
  return new Promise(async (resolve, reject) => {
    let db;
    try {
      db = await getDatabaseConnection();
      db.run(
        `UPDATE drone_instances SET name = ? WHERE instance_id = ?`,
        [name, instanceId],
        function (err) {
          db.close();
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    } catch (error) {
      if (db) db.close();
      reject(error);
    }
  });
}

/**
 * Remove uma instância do drone (soft delete)
 * @param {string} instanceId - ID da instância
 * @returns {Promise<boolean>}
 */
async function deleteDroneInstance(instanceId) {
  return new Promise(async (resolve, reject) => {
    let db;
    try {
      db = await getDatabaseConnection();
      db.run(
        `UPDATE drone_instances SET is_active = 0 WHERE instance_id = ?`,
        [instanceId],
        function (err) {
          db.close();
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    } catch (error) {
      if (db) db.close();
      reject(error);
    }
  });
}

/**
 * Reseta o status de todas as instâncias do drone para disconnected
 * @returns {Promise<boolean>}
 */
async function resetAllDroneInstancesStatus() {
  return new Promise(async (resolve, reject) => {
    let db;
    try {
      db = await getDatabaseConnection();
      db.run(
        `UPDATE drone_instances SET status = ? WHERE is_active = 1`,
        [INSTANCE_STATUS.DISCONNECTED],
        function (err) {
          db.close();
          if (err) reject(err);
          else resolve(true);
        }
      );
    } catch (error) {
      if (db) db.close();
      reject(error);
    }
  });
}

module.exports = {
  // Inicialização
  initializeDroneInstancesTable,

  // CRUD
  getAllDroneInstances,
  getDroneInstanceById,
  countActiveDroneInstances,
  createDroneInstance,
  updateDroneInstanceStatus,
  updateDroneInstanceName,
  deleteDroneInstance,

  // Utilitários
  resetAllDroneInstancesStatus,
};
