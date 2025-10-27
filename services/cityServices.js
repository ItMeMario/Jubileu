const { getDatabaseConnection } = require("../config/initialize");
const { debug } = require("./debugService");

class CityRepository {
  constructor() {}

  async closeDB(db) {
    if (db && typeof db.close === "function") {
      db.close();
    }
  }

  async getAll() {
    let db;
    try {
      db = await getDatabaseConnection();
      const rows = await new Promise((resolve, reject) => {
        db.all(
          `SELECT id, name, link, isPrimary, message, date FROM cities ORDER BY name`,
          [],
          (err, result) => (err ? reject(err) : resolve(result))
        );
      });
      return rows || [];
    } catch (error) {
      await debug(`❌ Erro ao buscar todas as cidades: ${error.message}`);
      return [];
    } finally {
      this.closeDB(db);
    }
  }

  async add(city) {
    let db;
    try {
      db = await getDatabaseConnection();
      const id = await new Promise((resolve, reject) => {
        // garante formato YYYY-MM-DD
        const formattedDate = /^\d{4}-\d{2}-\d{2}$/.test(city.date)
          ? city.date
          : null;

        if (!formattedDate) {
          return reject(new Error("Data inválida. Use o formato YYYY-MM-DD."));
        }

        db.run(
          `INSERT INTO cities (name, link, isPrimary, message, date) VALUES (?, ?, ?, ?, ?)`,
          [
            city.name,
            city.link || "",
            city.isPrimary || false,
            city.message,
            formattedDate,
          ],
          function (err) {
            if (err) return reject(err);
            resolve(city.id || this.lastID);
          }
        );
      });

      await debug(`✅ Cidade "${city.name}" adicionada no banco com ID: ${id}`);
      return { ...city, id };
    } catch (error) {
      await debug(`❌ Erro ao adicionar cidade: ${error.message}`);
      throw error;
    } finally {
      this.closeDB(db);
    }
  }

  async update(updatedCity) {
    let db;
    try {
      db = await getDatabaseConnection();
      const changes = await new Promise((resolve, reject) => {
        // garante formato YYYY-MM-DD
        const formattedDate = /^\d{4}-\d{2}-\d{2}$/.test(updatedCity.date)
          ? updatedCity.date
          : null;

        if (!formattedDate) {
          return reject(new Error("Data inválida. Use o formato YYYY-MM-DD."));
        }

        db.run(
          `UPDATE cities 
         SET name = ?, link = ?, isPrimary = ?, message = ?, date = ? 
         WHERE id = ?`,
          [
            updatedCity.name,
            updatedCity.link || "",
            updatedCity.isPrimary || false,
            updatedCity.message,
            formattedDate,
            updatedCity.id,
          ],
          function (err) {
            if (err) return reject(err);
            resolve(this.changes);
          }
        );
      });

      if (changes === 0) {
        await debug(
          `⚠️ Nenhuma cidade encontrada com ID ${updatedCity.id} para atualizar`
        );
        return null;
      }

      await debug(`✅ Cidade "${updatedCity.name}" atualizada no banco`);
      return updatedCity;
    } catch (error) {
      await debug(`❌ Erro ao atualizar cidade: ${error.message}`);
      throw error;
    } finally {
      this.closeDB(db);
    }
  }

  async delete(id) {
    let db;
    try {
      db = await getDatabaseConnection();
      const cityToDelete = await new Promise((resolve, reject) => {
        db.get(`SELECT name FROM cities WHERE id = ?`, [id], (err, row) =>
          err ? reject(err) : resolve(row)
        );
      });

      if (!cityToDelete) {
        await debug(`⚠️ Cidade com ID ${id} não encontrada para exclusão`);
        return null;
      }

      const changes = await new Promise((resolve, reject) => {
        db.run(`DELETE FROM cities WHERE id = ?`, [id], function (err) {
          if (err) return reject(err);
          resolve(this.changes);
        });
      });

      if (changes === 0) {
        await debug(`⚠️ Nenhuma cidade deletada com ID ${id}`);
        return null;
      }

      await debug(`✅ Cidade "${cityToDelete.name}" removida do banco`);
      return id;
    } catch (error) {
      await debug(`❌ Erro ao deletar cidade: ${error.message}`);
      throw error;
    } finally {
      this.closeDB(db);
    }
  }

  async findById(id) {
    let db;
    try {
      db = await getDatabaseConnection();
      const row = await new Promise((resolve, reject) => {
        db.get(
          `SELECT id, name, link, isPrimary, message, date FROM cities WHERE id = ?`,
          [id],
          (err, result) => (err ? reject(err) : resolve(result))
        );
      });
      return row || null;
    } catch (error) {
      await debug(`❌ Erro ao buscar cidade por ID: ${error.message}`);
      return null;
    } finally {
      this.closeDB(db);
    }
  }

  async getPrimary() {
    let db;
    try {
      db = await getDatabaseConnection();
      const row = await new Promise((resolve, reject) => {
        db.get(
          `SELECT id, name, link, isPrimary, message, date FROM cities WHERE isPrimary = 1 LIMIT 1`,
          [],
          (err, result) => (err ? reject(err) : resolve(result))
        );
      });
      return row || null;
    } catch (error) {
      await debug(`❌ Erro ao buscar cidade primária: ${error.message}`);
      return null;
    } finally {
      this.closeDB(db);
    }
  }

  async setPrimary(id) {
    let db;
    try {
      db = await getDatabaseConnection();
      await new Promise((resolve, reject) => {
        db.serialize(() => {
          db.run("BEGIN TRANSACTION");

          db.run(
            `UPDATE cities SET isPrimary = 0 WHERE isPrimary = 1`,
            [],
            function (err) {
              if (err) return reject(err);
            }
          );

          db.run(
            `UPDATE cities SET isPrimary = 1 WHERE id = ?`,
            [id],
            function (err) {
              if (err) return reject(err);
              if (this.changes === 0) {
                db.run("ROLLBACK");
                return resolve(false);
              }
              db.run("COMMIT", (err) => {
                if (err) return reject(err);
                resolve(true);
              });
            }
          );
        });
      });

      await debug(`✅ Cidade com ID ${id} definida como primária`);
      return true;
    } catch (error) {
      await debug(`❌ Erro ao definir cidade primária: ${error.message}`);
      throw error;
    } finally {
      this.closeDB(db);
    }
  }
}

module.exports = CityRepository;
