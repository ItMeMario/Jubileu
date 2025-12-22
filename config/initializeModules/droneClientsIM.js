// config/initializeModules/droneClientsIM.js
const { getDatabaseConnection } = require("./databaseIM");
const { debug } = require("../../services/debugService");

/**
 * Inicializa a tabela de clientes do Drone com suporte a múltiplas instâncias
 * @returns {Promise<void>}
 */
async function initializeDroneClientsTable() {
  const db = await getDatabaseConnection();

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Verifica se a tabela antiga 'clients' existe
      db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='clients'",
        async (err, row) => {
          if (err) {
            db.close();
            reject(err);
            return;
          }

          if (row) {
            // Tabela antiga existe - precisa migrar
            debug("📦 Tabela 'clients' encontrada, verificando estrutura...");

            // Verifica se já tem a coluna instance_id
            db.all("PRAGMA table_info(clients)", (err, columns) => {
              if (err) {
                db.close();
                reject(err);
                return;
              }

              const hasInstanceId = columns.some(
                (col) => col.name === "instance_id"
              );

              if (hasInstanceId) {
                debug("✅ Tabela 'clients' já possui coluna instance_id");
                db.close();
                resolve();
              } else {
                // Precisa adicionar a coluna instance_id
                debug(
                  "🔄 Migrando tabela 'clients' para suporte multi-instância..."
                );

                // Adiciona coluna instance_id (NOT NULL com default temporário)
                db.run(
                  `ALTER TABLE clients ADD COLUMN instance_id TEXT NOT NULL DEFAULT ''`,
                  (err) => {
                    if (err) {
                      db.close();
                      reject(err);
                      return;
                    }

                    // Remove registros antigos sem instance_id válido
                    db.run(
                      `DELETE FROM clients WHERE instance_id = '' OR instance_id IS NULL`,
                      function (err) {
                        if (err) {
                          debug(
                            "⚠️ Aviso ao limpar registros antigos: " +
                              err.message
                          );
                        } else {
                          debug(
                            `🗑️ ${this.changes} registro(s) antigo(s) removido(s) (sem instance_id)`
                          );
                        }

                        // Cria índice para performance
                        db.run(
                          `CREATE INDEX IF NOT EXISTS idx_clients_instance 
                           ON clients(instance_id)`,
                          (err) => {
                            if (err) {
                              debug("⚠️ Aviso ao criar índice: " + err.message);
                            }

                            // Cria índice único para evitar duplicatas por instância
                            db.run(
                              `CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_instance_tel 
                               ON clients(instance_id, tel)`,
                              (err) => {
                                db.close();
                                if (err) {
                                  debug(
                                    "⚠️ Aviso ao criar índice único: " +
                                      err.message
                                  );
                                }
                                debug(
                                  "✅ Migração da tabela 'clients' concluída"
                                );
                                resolve();
                              }
                            );
                          }
                        );
                      }
                    );
                  }
                );
              }
            });
          } else {
            // Tabela não existe - criar nova com estrutura correta
            debug("📦 Criando tabela 'clients' com suporte multi-instância...");

            db.run(
              `CREATE TABLE IF NOT EXISTS clients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                instance_id TEXT NOT NULL,
                name TEXT,
                tel TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
              )`,
              (err) => {
                if (err) {
                  db.close();
                  reject(err);
                  return;
                }

                // Cria índices
                db.run(
                  `CREATE INDEX IF NOT EXISTS idx_clients_instance 
                   ON clients(instance_id)`,
                  (err) => {
                    if (err) {
                      debug("⚠️ Aviso ao criar índice: " + err.message);
                    }

                    db.run(
                      `CREATE INDEX IF NOT EXISTS idx_clients_status 
                       ON clients(status)`,
                      (err) => {
                        if (err) {
                          debug("⚠️ Aviso ao criar índice: " + err.message);
                        }

                        db.run(
                          `CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_instance_tel 
                           ON clients(instance_id, tel)`,
                          (err) => {
                            db.close();
                            if (err) {
                              debug(
                                "⚠️ Aviso ao criar índice único: " + err.message
                              );
                            }
                            debug("✅ Tabela 'clients' criada com sucesso");
                            resolve();
                          }
                        );
                      }
                    );
                  }
                );
              }
            );
          }
        }
      );
    });
  });
}

/**
 * Obtém estatísticas de clientes por instância
 * @param {string} instanceId - ID da instância (null para todas)
 * @returns {Promise<Object>}
 */
async function getDroneClientsStats(instanceId = null) {
  const db = await getDatabaseConnection();

  return new Promise((resolve, reject) => {
    let query = `
      SELECT 
        instance_id,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM clients
      WHERE instance_id != '' AND instance_id IS NOT NULL
    `;

    const params = [];

    if (instanceId) {
      query += " AND instance_id = ?";
      params.push(instanceId);
    }

    query += " GROUP BY instance_id";

    db.all(query, params, (err, rows) => {
      db.close();
      if (err) {
        reject({ success: false, error: err.message });
      } else {
        resolve({
          success: true,
          stats: rows || [],
        });
      }
    });
  });
}

/**
 * Remove todos os clientes de uma instância específica
 * @param {string} instanceId - ID da instância
 * @returns {Promise<Object>}
 */
async function clearClientsByInstance(instanceId) {
  const db = await getDatabaseConnection();

  return new Promise((resolve, reject) => {
    db.run(
      "DELETE FROM clients WHERE instance_id = ?",
      [instanceId],
      function (err) {
        db.close();
        if (err) {
          reject({ success: false, error: err.message });
        } else {
          resolve({
            success: true,
            message: `${this.changes} cliente(s) removido(s) da instância ${instanceId}`,
            totalRemoved: this.changes,
          });
        }
      }
    );
  });
}

module.exports = {
  initializeDroneClientsTable,
  getDroneClientsStats,
  clearClientsByInstance,
};
