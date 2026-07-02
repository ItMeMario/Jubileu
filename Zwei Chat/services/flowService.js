// services/flowService.js
const db = require("../config/db");

/**
 * Retorna todos os fluxos cadastrados.
 * Converte a coluna definition (string JSON) para objeto JS.
 */
function getFlows() {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM flows ORDER BY id DESC", [], (err, rows) => {
      if (err) {
        console.error("❌ Erro ao buscar fluxos no banco:", err);
        return reject(err);
      }
      try {
        const flows = rows.map((row) => ({
          id: row.id,
          name: row.name,
          active: !!row.active,
          definition: JSON.parse(row.definition || "{}"),
        }));
        resolve(flows);
      } catch (parseErr) {
        console.error("❌ Erro ao parsear JSON de fluxos:", parseErr);
        reject(parseErr);
      }
    });
  });
}

/**
 * Salva ou atualiza um fluxo no banco.
 * Se o fluxo contiver ID, executa UPDATE, caso contrário executa INSERT.
 */
function saveFlow(flow) {
  return new Promise((resolve, reject) => {
    const definitionStr = JSON.stringify(flow.definition || {});
    if (flow.id) {
      db.run(
        "UPDATE flows SET name = ?, definition = ? WHERE id = ?",
        [flow.name, definitionStr, flow.id],
        function (err) {
          if (err) {
            console.error(`❌ Erro ao atualizar fluxo ID ${flow.id}:`, err);
            return reject(err);
          }
          resolve({ id: flow.id, success: true });
        }
      );
    } else {
      db.run(
        "INSERT INTO flows (name, active, definition) VALUES (?, 1, ?)",
        [flow.name, definitionStr],
        function (err) {
          if (err) {
            console.error("❌ Erro ao inserir novo fluxo:", err);
            return reject(err);
          }
          resolve({ id: this.lastID, success: true });
        }
      );
    }
  });
}

/**
 * Remove um fluxo pelo ID.
 */
function deleteFlow(id) {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM flows WHERE id = ?", [id], function (err) {
      if (err) {
        console.error(`❌ Erro ao deletar fluxo ID ${id}:`, err);
        return reject(err);
      }
      resolve({ success: true });
    });
  });
}

/**
 * Ativa ou desativa um fluxo pelo ID.
 */
function toggleFlow(id, active) {
  return new Promise((resolve, reject) => {
    const activeValue = active ? 1 : 0;
    db.run(
      "UPDATE flows SET active = ? WHERE id = ?",
      [activeValue, id],
      function (err) {
        if (err) {
          console.error(`❌ Erro ao alternar status do fluxo ID ${id}:`, err);
          return reject(err);
        }
        resolve({ success: true });
      }
    );
  });
}

module.exports = {
  getFlows,
  saveFlow,
  deleteFlow,
  toggleFlow,
};
