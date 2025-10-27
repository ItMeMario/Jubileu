const { getDatabaseConnection } = require("../config/initialize");

class DatabaseService {
  // Obter informações de uma tabela
  static async getTableInfo(tableName) {
    const db = await getDatabaseConnection();
    return new Promise((resolve, reject) => {
      db.all(`PRAGMA table_info(${tableName})`, [], (err, rows) => {
        db.close();
        err ? reject(err) : resolve(rows);
      });
    });
  }

  // Listar todas as tabelas do banco
  static async getAllTables() {
    const db = await getDatabaseConnection();
    return new Promise((resolve, reject) => {
      db.all(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
        [],
        (err, rows) => {
          db.close();
          err ? reject(err) : resolve(rows.map((row) => row.name));
        }
      );
    });
  }

  // Obter índices de uma tabela
  static async getTableIndexes(tableName) {
    const db = await getDatabaseConnection();
    return new Promise((resolve, reject) => {
      db.all(`PRAGMA index_list(${tableName})`, [], (err, rows) => {
        db.close();
        err ? reject(err) : resolve(rows);
      });
    });
  }

  // Obter triggers
  static async getAllTriggers() {
    const db = await getDatabaseConnection();
    return new Promise((resolve, reject) => {
      db.all(
        "SELECT name, tbl_name, sql FROM sqlite_master WHERE type='trigger' ORDER BY name",
        [],
        (err, rows) => {
          db.close();
          err ? reject(err) : resolve(rows);
        }
      );
    });
  }

  // Verificar a cidade primária
  static async getPrimaryCity() {
    const db = await getDatabaseConnection();
    return new Promise((resolve, reject) => {
      db.get("SELECT * FROM cities WHERE isPrimary = 1", [], (err, row) => {
        db.close();
        err ? reject(err) : resolve(row);
      });
    });
  }

  // Contar registros em cada tabela
  static async getTableCounts() {
    const db = await getDatabaseConnection();
    const tables = await this.getAllTables();
    const counts = {};

    return new Promise((resolve) => {
      if (tables.length === 0) {
        db.close();
        resolve(counts);
        return;
      }

      let completed = 0;
      tables.forEach((table) => {
        db.get(`SELECT COUNT(*) as count FROM ${table}`, [], (err, row) => {
          counts[table] = err ? "Erro" : row.count;
          completed++;
          if (completed === tables.length) {
            db.close();
            resolve(counts);
          }
        });
      });
    });
  }
}

module.exports = DatabaseService;
