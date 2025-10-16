// services/droneServiceModules/clientDatabaseDSM.js
const { getDatabaseConnection } = require("../../utils/initialize");

/**
 * Adiciona um cliente ao banco de dados
 * @param {string} name - Nome do cliente
 * @param {string} tel - Telefone no formato WhatsApp
 * @returns {Promise<Object>} - Resultado da operação
 */
async function adicionarCliente(name, tel) {
  const db = await getDatabaseConnection();

  return new Promise((resolve, reject) => {
    db.run(
      "INSERT OR IGNORE INTO clients (name, tel, status) VALUES (?, ?, ?)",
      [name || "", tel, "pending"],
      function (err) {
        db.close();
        if (err) {
          reject({
            success: false,
            error: "Erro ao adicionar cliente: " + err.message,
          });
        } else {
          // this.changes indica quantas linhas foram afetadas
          // Se for 0, o cliente já existia (IGNORE)
          if (this.changes === 0) {
            resolve({
              success: true,
              existed: true,
              message: "Cliente já existe no banco",
              tel: tel,
            });
          } else {
            resolve({
              success: true,
              existed: false,
              message: "Cliente adicionado com sucesso",
              id: this.lastID,
              tel: tel,
            });
          }
        }
      }
    );
  });
}

/**
 * Adiciona múltiplos clientes em lote
 * @param {Array<Object>} clientes - Array de objetos {name, tel}
 * @returns {Promise<Object>} - Resultado da operação em lote
 */
async function adicionarClientesEmLote(clientes) {
  const db = await getDatabaseConnection();

  return new Promise((resolve, reject) => {
    let adicionados = 0;
    let jaExistiam = 0;
    let erros = [];

    // Inicia transação para melhor performance
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      const stmt = db.prepare(
        "INSERT OR IGNORE INTO clients (name, tel, status) VALUES (?, ?, ?)"
      );

      for (const cliente of clientes) {
        stmt.run([cliente.name || "", cliente.tel, "pending"], function (err) {
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
        });
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
              });
            }
          });
        }
      });
    });
  });
}

/**
 * Lista clientes por status
 * @param {string|null} status - Status para filtrar ('pending', 'sent', 'failed', null para todos)
 * @returns {Promise<Object>} - Lista de clientes
 */
async function listarClientesPorStatus(status = null) {
  const db = await getDatabaseConnection();

  return new Promise((resolve, reject) => {
    let query = "SELECT * FROM clients";
    let params = [];

    if (status) {
      query += " WHERE status = ?";
      params.push(status);
    }

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
        });
      }
    });
  });
}

/**
 * Lista clientes prontos para disparo (pending + failed)
 * @returns {Promise<Object>} - Lista de clientes
 */
async function listarClientesParaDisparo() {
  const db = await getDatabaseConnection();

  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM clients WHERE status IN (?, ?)",
      ["pending", "failed"],
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
          });
        }
      }
    );
  });
}

/**
 * Atualiza o status de um cliente
 * @param {string} tel - Telefone do cliente
 * @param {string} status - Novo status ('pending', 'sent', 'failed')
 * @returns {Promise<Object>} - Resultado da operação
 */
async function atualizarStatusCliente(tel, status) {
  const db = await getDatabaseConnection();

  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE clients SET status = ? WHERE tel = ?",
      [status, tel],
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
              tel: tel,
            });
          } else {
            resolve({
              success: true,
              message: "Status atualizado com sucesso",
              tel: tel,
              status: status,
            });
          }
        }
      }
    );
  });
}

/**
 * Remove um cliente específico
 * @param {number|string} idOuTel - ID ou telefone do cliente
 * @returns {Promise<Object>} - Resultado da operação
 */
async function removerCliente(idOuTel) {
  const db = await getDatabaseConnection();

  return new Promise((resolve, reject) => {
    // Tenta remover por ID ou por telefone
    const query = "DELETE FROM clients WHERE id = ? OR tel = ?";

    db.run(query, [idOuTel, idOuTel], function (err) {
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
            message: "Cliente não encontrado",
          });
        } else {
          resolve({
            success: true,
            message: "Cliente removido com sucesso",
            removed: this.changes,
          });
        }
      }
    });
  });
}

/**
 * Limpa todos os clientes da tabela
 * @returns {Promise<Object>} - Resultado da operação
 */
async function limparClientes() {
  const db = await getDatabaseConnection();

  return new Promise((resolve, reject) => {
    // Primeiro conta quantos existem
    db.get("SELECT COUNT(*) as total FROM clients", (err, row) => {
      if (err) {
        db.close();
        reject({
          success: false,
          error: "Erro ao contar clientes: " + err.message,
        });
        return;
      }

      const total = row.total;

      // Depois limpa a tabela
      db.run("DELETE FROM clients", function (err) {
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
          });
        }
      });
    });
  });
}

/**
 * Obtém estatísticas dos clientes
 * @returns {Promise<Object>} - Estatísticas
 */
async function obterEstatisticas() {
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
      FROM clients`,
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
          });
        }
      }
    );
  });
}

/**
 * Busca um cliente específico por telefone
 * @param {string} tel - Telefone do cliente
 * @returns {Promise<Object>} - Cliente encontrado ou null
 */
async function buscarClientePorTel(tel) {
  const db = await getDatabaseConnection();

  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM clients WHERE tel = ?", [tel], (err, row) => {
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
        });
      }
    });
  });
}

module.exports = {
  adicionarCliente,
  adicionarClientesEmLote,
  listarClientesPorStatus,
  listarClientesParaDisparo,
  atualizarStatusCliente,
  removerCliente,
  limparClientes,
  obterEstatisticas,
  buscarClientePorTel,
};
