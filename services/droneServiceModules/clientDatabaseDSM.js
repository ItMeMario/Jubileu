// services/droneServiceModules/clientDatabaseDSM.js
const { getDatabaseConnection } = require("../../config/initialize");

/**
 * Adiciona um cliente ao banco de dados
 * @param {string} instanceId - ID da instância
 * @param {string} name - Nome do cliente
 * @param {string} tel - Telefone no formato WhatsApp
 * @returns {Promise<Object>} - Resultado da operação
 */
async function adicionarCliente(instanceId, name, tel) {
  if (!instanceId) {
    return {
      success: false,
      error: "instanceId é obrigatório",
    };
  }

  const db = await getDatabaseConnection();

  return new Promise((resolve, reject) => {
    db.run(
      "INSERT OR IGNORE INTO clients (instance_id, name, tel, status) VALUES (?, ?, ?, ?)",
      [instanceId, name || "", tel, "pending"],
      function (err) {
        db.close();
        if (err) {
          reject({
            success: false,
            error: "Erro ao adicionar cliente: " + err.message,
          });
        } else {
          if (this.changes === 0) {
            resolve({
              success: true,
              existed: true,
              message: "Cliente já existe no banco para esta instância",
              tel: tel,
              instanceId: instanceId,
            });
          } else {
            resolve({
              success: true,
              existed: false,
              message: "Cliente adicionado com sucesso",
              id: this.lastID,
              tel: tel,
              instanceId: instanceId,
            });
          }
        }
      }
    );
  });
}

/**
 * Adiciona múltiplos clientes em lote
 * @param {string} instanceId - ID da instância
 * @param {Array<Object>} clientes - Array de objetos {name, tel}
 * @returns {Promise<Object>} - Resultado da operação em lote
 */
async function adicionarClientesEmLote(instanceId, clientes) {
  if (!instanceId) {
    return {
      success: false,
      error: "instanceId é obrigatório",
    };
  }

  const db = await getDatabaseConnection();

  return new Promise((resolve, reject) => {
    let adicionados = 0;
    let jaExistiam = 0;
    let erros = [];

    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      const stmt = db.prepare(
        "INSERT OR IGNORE INTO clients (instance_id, name, tel, status) VALUES (?, ?, ?, ?)"
      );

      for (const cliente of clientes) {
        stmt.run(
          [instanceId, cliente.name || "", cliente.tel, "pending"],
          function (err) {
            if (err) {
              erros.push({
                tel: cliente.tel,
                name: cliente.name,
                error: err.message,
              });
            } else {
              if (this.changes === 0) {
                jaExistiam++;
              } else {
                adicionados++;
              }
            }
          }
        );
      }

      stmt.finalize((err) => {
        if (err) {
          db.run("ROLLBACK");
          db.close();
          reject({
            success: false,
            error: "Erro ao finalizar inserção em lote: " + err.message,
          });
        } else {
          db.run("COMMIT", (err) => {
            db.close();
            if (err) {
              reject({
                success: false,
                error: "Erro ao commitar transação: " + err.message,
              });
            } else {
              resolve({
                success: true,
                message: `Lote processado: ${adicionados} adicionados, ${jaExistiam} já existiam`,
                adicionados: adicionados,
                jaExistiam: jaExistiam,
                erros: erros,
                total: clientes.length,
                instanceId: instanceId,
              });
            }
          });
        }
      });
    });
  });
}

/**
 * Lista clientes por status de uma instância específica
 * @param {string} instanceId - ID da instância
 * @param {string|null} status - Status para filtrar ('pending', 'sent', 'failed', null para todos)
 * @returns {Promise<Object>} - Lista de clientes
 */
async function listarClientesPorStatus(instanceId, status = null) {
  if (!instanceId) {
    return {
      success: false,
      error: "instanceId é obrigatório",
      clients: [],
    };
  }

  const db = await getDatabaseConnection();

  return new Promise((resolve, reject) => {
    let query = "SELECT * FROM clients WHERE instance_id = ?";
    let params = [instanceId];

    if (status) {
      query += " AND status = ?";
      params.push(status);
    }

    query += " ORDER BY id DESC";

    db.all(query, params, (err, rows) => {
      db.close();
      if (err) {
        reject({
          success: false,
          error: "Erro ao listar clientes: " + err.message,
          clients: [],
        });
      } else {
        resolve({
          success: true,
          clients: rows || [],
          total: rows ? rows.length : 0,
          instanceId: instanceId,
        });
      }
    });
  });
}

/**
 * Lista clientes prontos para disparo (pending + failed) de uma instância
 * @param {string} instanceId - ID da instância
 * @returns {Promise<Object>} - Lista de clientes
 */
async function listarClientesParaDisparo(instanceId) {
  if (!instanceId) {
    return {
      success: false,
      error: "instanceId é obrigatório",
      clients: [],
    };
  }

  const db = await getDatabaseConnection();

  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM clients WHERE instance_id = ? AND status IN (?, ?) ORDER BY id ASC",
      [instanceId, "pending", "failed"],
      (err, rows) => {
        db.close();
        if (err) {
          reject({
            success: false,
            error: "Erro ao listar clientes para disparo: " + err.message,
            clients: [],
          });
        } else {
          resolve({
            success: true,
            clients: rows || [],
            total: rows ? rows.length : 0,
            instanceId: instanceId,
          });
        }
      }
    );
  });
}

/**
 * Atualiza o status de um cliente
 * @param {string} instanceId - ID da instância
 * @param {string} tel - Telefone do cliente
 * @param {string} status - Novo status ('pending', 'sent', 'failed')
 * @returns {Promise<Object>} - Resultado da operação
 */
async function atualizarStatusCliente(instanceId, tel, status) {
  if (!instanceId) {
    return {
      success: false,
      error: "instanceId é obrigatório",
    };
  }

  const db = await getDatabaseConnection();

  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE clients SET status = ? WHERE instance_id = ? AND tel = ?",
      [status, instanceId, tel],
      function (err) {
        db.close();
        if (err) {
          reject({
            success: false,
            error: "Erro ao atualizar status: " + err.message,
          });
        } else {
          if (this.changes === 0) {
            resolve({
              success: false,
              message: "Cliente não encontrado nesta instância",
              tel: tel,
              instanceId: instanceId,
            });
          } else {
            resolve({
              success: true,
              message: "Status atualizado com sucesso",
              tel: tel,
              status: status,
              instanceId: instanceId,
            });
          }
        }
      }
    );
  });
}

/**
 * Atualiza o status de um cliente por ID
 * @param {number} id - ID do cliente
 * @param {string} status - Novo status ('pending', 'sent', 'failed')
 * @returns {Promise<Object>} - Resultado da operação
 */
async function atualizarStatusClientePorId(id, status) {
  const db = await getDatabaseConnection();

  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE clients SET status = ? WHERE id = ?",
      [status, id],
      function (err) {
        db.close();
        if (err) {
          reject({
            success: false,
            error: "Erro ao atualizar status: " + err.message,
          });
        } else {
          if (this.changes === 0) {
            resolve({
              success: false,
              message: "Cliente não encontrado",
              id: id,
            });
          } else {
            resolve({
              success: true,
              message: "Status atualizado com sucesso",
              id: id,
              status: status,
            });
          }
        }
      }
    );
  });
}

/**
 * Remove um cliente específico de uma instância
 * @param {string} instanceId - ID da instância
 * @param {number|string} idOuTel - ID ou telefone do cliente
 * @returns {Promise<Object>} - Resultado da operação
 */
async function removerCliente(instanceId, idOuTel) {
  if (!instanceId) {
    return {
      success: false,
      error: "instanceId é obrigatório",
    };
  }

  const db = await getDatabaseConnection();

  return new Promise((resolve, reject) => {
    const query =
      "DELETE FROM clients WHERE instance_id = ? AND (id = ? OR tel = ?)";

    db.run(query, [instanceId, idOuTel, idOuTel], function (err) {
      db.close();
      if (err) {
        reject({
          success: false,
          error: "Erro ao remover cliente: " + err.message,
        });
      } else {
        if (this.changes === 0) {
          resolve({
            success: false,
            message: "Cliente não encontrado nesta instância",
          });
        } else {
          resolve({
            success: true,
            message: "Cliente removido com sucesso",
            removed: this.changes,
            instanceId: instanceId,
          });
        }
      }
    });
  });
}

/**
 * Limpa todos os clientes de uma instância
 * @param {string} instanceId - ID da instância
 * @returns {Promise<Object>} - Resultado da operação
 */
async function limparClientes(instanceId) {
  if (!instanceId) {
    return {
      success: false,
      error: "instanceId é obrigatório",
    };
  }

  const db = await getDatabaseConnection();

  return new Promise((resolve, reject) => {
    db.get(
      "SELECT COUNT(*) as total FROM clients WHERE instance_id = ?",
      [instanceId],
      (err, row) => {
        if (err) {
          db.close();
          reject({
            success: false,
            error: "Erro ao contar clientes: " + err.message,
          });
          return;
        }

        const total = row.total;

        db.run(
          "DELETE FROM clients WHERE instance_id = ?",
          [instanceId],
          function (err) {
            db.close();
            if (err) {
              reject({
                success: false,
                error: "Erro ao limpar clientes: " + err.message,
              });
            } else {
              resolve({
                success: true,
                message: `${total} cliente(s) removido(s)`,
                totalRemoved: total,
                instanceId: instanceId,
              });
            }
          }
        );
      }
    );
  });
}

/**
 * Obtém estatísticas dos clientes de uma instância
 * @param {string} instanceId - ID da instância
 * @returns {Promise<Object>} - Estatísticas
 */
async function obterEstatisticas(instanceId) {
  if (!instanceId) {
    return {
      success: false,
      error: "instanceId é obrigatório",
    };
  }

  const db = await getDatabaseConnection();

  return new Promise((resolve, reject) => {
    db.get(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN name IS NOT NULL AND name != '' THEN 1 ELSE 0 END) as comNome,
        SUM(CASE WHEN name IS NULL OR name = '' THEN 1 ELSE 0 END) as semNome
      FROM clients
      WHERE instance_id = ?`,
      [instanceId],
      (err, row) => {
        db.close();
        if (err) {
          reject({
            success: false,
            error: "Erro ao obter estatísticas: " + err.message,
          });
        } else {
          resolve({
            success: true,
            stats: {
              total: row.total || 0,
              porStatus: {
                pending: row.pending || 0,
                sent: row.sent || 0,
                failed: row.failed || 0,
              },
              comNome: row.comNome || 0,
              semNome: row.semNome || 0,
            },
            instanceId: instanceId,
          });
        }
      }
    );
  });
}

/**
 * Busca um cliente específico por telefone em uma instância
 * @param {string} instanceId - ID da instância
 * @param {string} tel - Telefone do cliente
 * @returns {Promise<Object>} - Cliente encontrado ou null
 */
async function buscarClientePorTel(instanceId, tel) {
  if (!instanceId) {
    return {
      success: false,
      error: "instanceId é obrigatório",
    };
  }

  const db = await getDatabaseConnection();

  return new Promise((resolve, reject) => {
    db.get(
      "SELECT * FROM clients WHERE instance_id = ? AND tel = ?",
      [instanceId, tel],
      (err, row) => {
        db.close();
        if (err) {
          reject({
            success: false,
            error: "Erro ao buscar cliente: " + err.message,
          });
        } else {
          resolve({
            success: true,
            client: row || null,
            found: !!row,
            instanceId: instanceId,
          });
        }
      }
    );
  });
}

/**
 * Limpa clientes por status específico de uma instância
 * @param {string} instanceId - ID da instância
 * @param {string} status - Status para filtrar ('pending', 'sent', 'failed')
 * @returns {Promise<Object>} - Resultado da operação
 */
async function limparClientesPorStatus(instanceId, status) {
  if (!instanceId) {
    return {
      success: false,
      error: "instanceId é obrigatório",
    };
  }

  const db = await getDatabaseConnection();

  return new Promise((resolve, reject) => {
    db.get(
      "SELECT COUNT(*) as total FROM clients WHERE instance_id = ? AND status = ?",
      [instanceId, status],
      (err, row) => {
        if (err) {
          db.close();
          reject({
            success: false,
            error: "Erro ao contar clientes: " + err.message,
          });
          return;
        }

        const total = row.total;

        db.run(
          "DELETE FROM clients WHERE instance_id = ? AND status = ?",
          [instanceId, status],
          function (err) {
            db.close();
            if (err) {
              reject({
                success: false,
                error: "Erro ao limpar clientes: " + err.message,
              });
            } else {
              resolve({
                success: true,
                message: `${total} cliente(s) com status '${status}' removido(s)`,
                totalRemoved: total,
                status: status,
                instanceId: instanceId,
              });
            }
          }
        );
      }
    );
  });
}

module.exports = {
  adicionarCliente,
  adicionarClientesEmLote,
  listarClientesPorStatus,
  listarClientesParaDisparo,
  atualizarStatusCliente,
  atualizarStatusClientePorId,
  removerCliente,
  limparClientes,
  limparClientesPorStatus,
  obterEstatisticas,
  buscarClientePorTel,
};
