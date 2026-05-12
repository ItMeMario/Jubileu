// config/initializeModules/instancesIM.js
const { debug } = require("../../services/debugService");
const {
  getDatabaseConnection,
  runQuery,
  checkTableExists,
} = require("./databaseIM");

/**
 * Constantes de configuração
 */
const MAX_INSTANCES = 30;

const INSTANCE_STATUS = {
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  QR_PENDING: "qr_pending",
  AUTH_FAILURE: "auth_failure",
};

/**
 * Query de criação da tabela instances
 */
const CREATE_INSTANCES_TABLE = `
  CREATE TABLE IF NOT EXISTS instances (
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
 * Índices para a tabela instances
 */
const INSTANCES_INDEX_QUERIES = [
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_instances_instance_id ON instances(instance_id)`,
  `CREATE INDEX IF NOT EXISTS idx_instances_status ON instances(status)`,
  `CREATE INDEX IF NOT EXISTS idx_instances_is_active ON instances(is_active)`,
];

/**
 * Trigger para atualizar updated_at automaticamente
 */
const INSTANCES_TRIGGER = `
  CREATE TRIGGER IF NOT EXISTS update_instances_timestamp
  AFTER UPDATE ON instances
  BEGIN
    UPDATE instances SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END
`;

/**
 * Inicializa a tabela de instâncias no banco de dados
 * @returns {Promise<boolean>}
 */
async function initializeInstancesTable() {
  let db;
  try {
    db = await getDatabaseConnection();

    // Verifica se tabela já existe
    const tableExists = await checkTableExists(db, "instances");

    if (tableExists) {
      db.close();
      return true;
    }

    // Cria tabela
    await runQuery(db, CREATE_INSTANCES_TABLE);
    await debug("✅ Tabela 'instances' criada com sucesso");

    // Cria índices
    for (const indexQuery of INSTANCES_INDEX_QUERIES) {
      try {
        await runQuery(db, indexQuery);
      } catch (err) {
        console.warn("⚠️ Erro ao criar índice:", err.message);
      }
    }
    await debug("✅ Índices da tabela 'instances' criados");



    // Cria trigger
    try {
      await runQuery(db, INSTANCES_TRIGGER);
      await debug("✅ Trigger de 'instances' criado");
    } catch (err) {
      console.warn("⚠️ Erro ao criar trigger:", err.message);
    }

    db.close();
    return true;
  } catch (error) {
    console.error("❌ Erro ao inicializar tabela instances:", error);
    if (db) db.close();
    throw error;
  }
}

/**
 * Obtém todas as instâncias ativas
 * @returns {Promise<Array>}
 */
async function getAllInstances() {
  return new Promise(async (resolve, reject) => {
    let db;
    try {
      db = await getDatabaseConnection();
      db.all(
        `SELECT * FROM instances WHERE is_active = 1 ORDER BY created_at ASC`,
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
 * Obtém uma instância por ID
 * @param {string} instanceId - ID único da instância
 * @returns {Promise<Object|null>}
 */
async function getInstanceById(instanceId) {
  return new Promise(async (resolve, reject) => {
    let db;
    try {
      db = await getDatabaseConnection();
      db.get(
        `SELECT * FROM instances WHERE instance_id = ?`,
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
 * Conta instâncias ativas
 * @returns {Promise<number>}
 */
async function countActiveInstances() {
  return new Promise(async (resolve, reject) => {
    let db;
    try {
      db = await getDatabaseConnection();
      db.get(
        `SELECT COUNT(*) as count FROM instances WHERE is_active = 1`,
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
 * Cria uma nova instância
 * @param {string} name - Nome da instância
 * @param {string} type - Tipo da instância ('whatsapp' ou 'crm')
 * @param {string} instanceId - ID único (opcional, será gerado se não fornecido)
 * @returns {Promise<Object>}
 */
async function createInstance(name) {
  // Verifica limite de instâncias
  const currentCount = await countActiveInstances();
  if (currentCount >= MAX_INSTANCES) {
    throw new Error(`Limite máximo de ${MAX_INSTANCES} instâncias atingido`);
  }

  // Gera ID único automaticamente
  const finalInstanceId = `whatsapp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return new Promise(async (resolve, reject) => {
    let db;
    try {
      db = await getDatabaseConnection();
      db.run(
        `INSERT INTO instances (instance_id, name, status) VALUES (?, ?, ?)`,
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
            `SELECT * FROM instances WHERE id = ?`,
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
 * Atualiza o status de uma instância
 * @param {string} instanceId - ID da instância
 * @param {string} status - Novo status
 * @param {string} phoneNumber - Número do telefone (opcional)
 * @returns {Promise<boolean>}
 */
async function updateInstanceStatus(instanceId, status, phoneNumber = null) {
  return new Promise(async (resolve, reject) => {
    let db;
    try {
      db = await getDatabaseConnection();

      let query = `UPDATE instances SET status = ?`;
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
 * Atualiza o nome de uma instância
 * @param {string} instanceId - ID da instância
 * @param {string} name - Novo nome
 * @returns {Promise<boolean>}
 */
async function updateInstanceName(instanceId, name) {
  return new Promise(async (resolve, reject) => {
    let db;
    try {
      db = await getDatabaseConnection();
      db.run(
        `UPDATE instances SET name = ? WHERE instance_id = ?`,
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
 * Remove uma instância (soft delete)
 * @param {string} instanceId - ID da instância
 * @returns {Promise<boolean>}
 */
async function deleteInstance(instanceId) {
  return new Promise(async (resolve, reject) => {
    let db;
    try {
      db = await getDatabaseConnection();
      db.run(
        `UPDATE instances SET is_active = 0 WHERE instance_id = ?`,
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
 * Remove uma instância permanentemente (hard delete)
 * @param {string} instanceId - ID da instância
 * @returns {Promise<boolean>}
 */
async function hardDeleteInstance(instanceId) {
  return new Promise(async (resolve, reject) => {
    let db;
    try {
      db = await getDatabaseConnection();
      db.run(
        `DELETE FROM instances WHERE instance_id = ?`,
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
 * Reseta o status de todas as instâncias para disconnected
 * Útil na inicialização da aplicação
 * @returns {Promise<boolean>}
 */
async function resetAllInstancesStatus() {
  return new Promise(async (resolve, reject) => {
    let db;
    try {
      db = await getDatabaseConnection();
      db.run(
        `UPDATE instances SET status = ? WHERE is_active = 1`,
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
  // Constantes
  MAX_INSTANCES,
  INSTANCE_STATUS,

  // Inicialização
  initializeInstancesTable,

  // CRUD
  getAllInstances,
  getInstanceById,
  countActiveInstances,
  createInstance,
  updateInstanceStatus,
  updateInstanceName,
  deleteInstance,
  hardDeleteInstance,

  // Utilitários
  resetAllInstancesStatus,
};
