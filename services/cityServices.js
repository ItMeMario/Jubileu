const { getDatabaseConnection } = require("../utils/initialize");
const {
  saveCityMessage,
  loadCityMessage,
  deleteCityMessage,
} = require("../utils/cityMessageUtils");
const { debug } = require("./debugService");

class CityRepository {
  constructor() {
    // Remove as referências aos arquivos JSON
    // O banco SQLite3 é gerenciado pelo initialize.js
  }

  async getAll() {
    try {
      const db = await getDatabaseConnection();

      return new Promise((resolve, reject) => {
        db.all(
          `SELECT id, name, link, isPrimary, message FROM cities ORDER BY name`,
          [],
          async (err, rows) => {
            if (err) {
              await debug(`❌ Erro ao buscar todas as cidades: ${err.message}`);
              reject(err);
              return;
            }

            try {
              // Carregar mensagens dos arquivos .txt para cada cidade
              for (const city of rows) {
                const messageFromFile = await loadCityMessage(city.id);
                // Prioriza a mensagem do arquivo .txt se existir, senão usa a do banco
                city.message = messageFromFile || city.message || "";
              }

              db.close();
              resolve(rows);
            } catch (messageError) {
              await debug(
                `⚠️ Erro ao carregar mensagens das cidades: ${messageError.message}`
              );
              db.close();
              resolve(rows); // Retorna sem as mensagens dos arquivos em caso de erro
            }
          }
        );
      });
    } catch (error) {
      await debug(
        `❌ Erro na conexão com o banco ao buscar cidades: ${error.message}`
      );
      console.error("❌ Erro ao buscar cidades:", error);
      return [];
    }
  }

  async add(city) {
    try {
      const db = await getDatabaseConnection();

      return new Promise(async (resolve, reject) => {
        db.run(
          `INSERT INTO cities (name, link, isPrimary, message) VALUES (?, ?, ?, ?)`,
          [
            city.name,
            city.link || "",
            city.isPrimary || false,
            city.message || "",
          ],
          async function (err) {
            if (err) {
              await debug(`❌ Erro ao adicionar cidade: ${err.message}`);
              db.close();
              reject(err);
              return;
            }

            try {
              // Salvar mensagem em arquivo separado se existir
              if (city.message) {
                await saveCityMessage(city.id || this.lastID, city.message);
              }

              const newCity = {
                ...city,
                id: city.id || this.lastID,
              };

              await debug(
                `✅ Cidade "${city.name}" adicionada no banco com ID: ${this.lastID}`
              );
              console.log(`✅ Cidade "${city.name}" adicionada com sucesso!`);

              db.close();
              resolve(newCity);
            } catch (messageError) {
              await debug(
                `⚠️ Erro ao salvar mensagem da cidade: ${messageError.message}`
              );
              db.close();
              resolve({ ...city, id: city.id || this.lastID });
            }
          }
        );
      });
    } catch (error) {
      await debug(
        `❌ Erro na conexão com o banco ao adicionar cidade: ${error.message}`
      );
      console.error("❌ Erro ao adicionar cidade:", error);
      throw error;
    }
  }

  async update(updatedCity) {
    try {
      const db = await getDatabaseConnection();

      return new Promise(async (resolve, reject) => {
        db.run(
          `UPDATE cities SET name = ?, link = ?, isPrimary = ?, message = ? WHERE id = ?`,
          [
            updatedCity.name,
            updatedCity.link || "",
            updatedCity.isPrimary || false,
            updatedCity.message || "",
            updatedCity.id,
          ],
          async function (err) {
            if (err) {
              await debug(`❌ Erro ao atualizar cidade: ${err.message}`);
              db.close();
              reject(err);
              return;
            }

            if (this.changes === 0) {
              await debug(
                `⚠️ Nenhuma cidade encontrada com ID ${updatedCity.id} para atualizar`
              );
              console.log(`⚠️ Cidade com ID ${updatedCity.id} não encontrada.`);
              db.close();
              resolve(null);
              return;
            }

            try {
              // Salvar mensagem em arquivo separado
              if (updatedCity.message !== undefined) {
                await saveCityMessage(updatedCity.id, updatedCity.message);
              }

              await debug(
                `✅ Cidade "${updatedCity.name}" atualizada no banco`
              );
              console.log(
                `✅ Cidade "${updatedCity.name}" atualizada com sucesso!`
              );

              db.close();
              resolve(updatedCity);
            } catch (messageError) {
              await debug(
                `⚠️ Erro ao salvar mensagem da cidade: ${messageError.message}`
              );
              db.close();
              resolve(updatedCity);
            }
          }
        );
      });
    } catch (error) {
      await debug(
        `❌ Erro na conexão com o banco ao atualizar cidade: ${error.message}`
      );
      console.error("❌ Erro ao atualizar cidade:", error);
      throw error;
    }
  }

  async delete(id) {
    try {
      const db = await getDatabaseConnection();

      // Primeiro, buscar o nome da cidade para o log
      const cityToDelete = await new Promise((resolve, reject) => {
        db.get(`SELECT name FROM cities WHERE id = ?`, [id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!cityToDelete) {
        await debug(`⚠️ Cidade com ID ${id} não encontrada para exclusão`);
        console.log(`⚠️ Cidade com ID ${id} não encontrada.`);
        db.close();
        return null;
      }

      return new Promise(async (resolve, reject) => {
        db.run(`DELETE FROM cities WHERE id = ?`, [id], async function (err) {
          if (err) {
            await debug(`❌ Erro ao deletar cidade: ${err.message}`);
            db.close();
            reject(err);
            return;
          }

          if (this.changes === 0) {
            await debug(`⚠️ Nenhuma cidade deletada com ID ${id}`);
            db.close();
            resolve(null);
            return;
          }

          try {
            // Deletar arquivo de mensagem
            await deleteCityMessage(id);

            await debug(`✅ Cidade "${cityToDelete.name}" removida do banco`);
            console.log(
              `✅ Cidade "${cityToDelete.name}" removida com sucesso!`
            );

            db.close();
            resolve(id);
          } catch (messageError) {
            await debug(
              `⚠️ Erro ao deletar arquivo de mensagem: ${messageError.message}`
            );
            db.close();
            resolve(id);
          }
        });
      });
    } catch (error) {
      await debug(
        `❌ Erro na conexão com o banco ao deletar cidade: ${error.message}`
      );
      console.error("❌ Erro ao deletar cidade:", error);
      throw error;
    }
  }

  async findById(id) {
    try {
      const db = await getDatabaseConnection();

      return new Promise(async (resolve, reject) => {
        db.get(
          `SELECT id, name, link, isPrimary, message FROM cities WHERE id = ?`,
          [id],
          async (err, row) => {
            if (err) {
              await debug(`❌ Erro ao buscar cidade por ID: ${err.message}`);
              db.close();
              reject(err);
              return;
            }

            if (!row) {
              db.close();
              resolve(null);
              return;
            }

            try {
              // Carregar mensagem do arquivo .txt
              const messageFromFile = await loadCityMessage(row.id);
              row.message = messageFromFile || row.message || "";

              db.close();
              resolve(row);
            } catch (messageError) {
              await debug(
                `⚠️ Erro ao carregar mensagem da cidade: ${messageError.message}`
              );
              db.close();
              resolve(row);
            }
          }
        );
      });
    } catch (error) {
      await debug(
        `❌ Erro na conexão com o banco ao buscar cidade por ID: ${error.message}`
      );
      console.error("❌ Erro ao buscar cidade por ID:", error);
      return null;
    }
  }

  async getPrimary() {
    try {
      const db = await getDatabaseConnection();

      return new Promise(async (resolve, reject) => {
        db.get(
          `SELECT id, name, link, isPrimary, message FROM cities WHERE isPrimary = 1 LIMIT 1`,
          [],
          async (err, row) => {
            if (err) {
              await debug(`❌ Erro ao buscar cidade primária: ${err.message}`);
              db.close();
              reject(err);
              return;
            }

            if (!row) {
              db.close();
              resolve(null);
              return;
            }

            try {
              // Carregar mensagem do arquivo .txt
              const messageFromFile = await loadCityMessage(row.id);
              row.message = messageFromFile || row.message || "";

              db.close();
              resolve(row);
            } catch (messageError) {
              await debug(
                `⚠️ Erro ao carregar mensagem da cidade primária: ${messageError.message}`
              );
              db.close();
              resolve(row);
            }
          }
        );
      });
    } catch (error) {
      await debug(
        `❌ Erro na conexão com o banco ao buscar cidade primária: ${error.message}`
      );
      console.error("❌ Erro ao buscar cidade primária:", error);
      return null;
    }
  }

  // Método adicional para definir cidade primária (remove primary de outras)
  async setPrimary(id) {
    try {
      const db = await getDatabaseConnection();

      return new Promise(async (resolve, reject) => {
        // Usar transação para garantir consistência
        db.serialize(() => {
          db.run("BEGIN TRANSACTION");

          // Remover primary de todas as cidades
          db.run(
            `UPDATE cities SET isPrimary = 0 WHERE isPrimary = 1`,
            [],
            async function (err) {
              if (err) {
                await debug(
                  `❌ Erro ao remover primary das cidades: ${err.message}`
                );
                db.run("ROLLBACK");
                db.close();
                reject(err);
                return;
              }
            }
          );

          // Definir a nova cidade como primária
          db.run(
            `UPDATE cities SET isPrimary = 1 WHERE id = ?`,
            [id],
            async function (err) {
              if (err) {
                await debug(
                  `❌ Erro ao definir cidade como primária: ${err.message}`
                );
                db.run("ROLLBACK");
                db.close();
                reject(err);
                return;
              }

              if (this.changes === 0) {
                await debug(
                  `⚠️ Cidade com ID ${id} não encontrada para definir como primária`
                );
                db.run("ROLLBACK");
                db.close();
                resolve(false);
                return;
              }

              db.run("COMMIT", async (err) => {
                if (err) {
                  await debug(`❌ Erro ao confirmar transação: ${err.message}`);
                  db.close();
                  reject(err);
                  return;
                }

                await debug(`✅ Cidade com ID ${id} definida como primária`);
                db.close();
                resolve(true);
              });
            }
          );
        });
      });
    } catch (error) {
      await debug(
        `❌ Erro na conexão com o banco ao definir cidade primária: ${error.message}`
      );
      console.error("❌ Erro ao definir cidade primária:", error);
      throw error;
    }
  }
}

module.exports = CityRepository;
