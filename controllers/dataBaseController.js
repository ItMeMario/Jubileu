const { getDatabaseConnection } = require("../utils/initialize");

class DatabaseController {
  // Função para obter informações das tabelas
  static async getTableInfo(tableName) {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await getDatabaseConnection();

        db.all(`PRAGMA table_info(${tableName})`, [], (err, rows) => {
          if (err) {
            reject(err);
          } else {
            db.close();
            resolve(rows);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Função para listar todas as tabelas do banco
  static async getAllTables() {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await getDatabaseConnection();

        db.all(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
          [],
          (err, rows) => {
            if (err) {
              reject(err);
            } else {
              db.close();
              resolve(rows.map((row) => row.name));
            }
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  // Função para obter índices de uma tabela
  static async getTableIndexes(tableName) {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await getDatabaseConnection();

        db.all(`PRAGMA index_list(${tableName})`, [], (err, rows) => {
          if (err) {
            reject(err);
          } else {
            db.close();
            resolve(rows);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Função para obter triggers do banco
  static async getAllTriggers() {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await getDatabaseConnection();

        db.all(
          "SELECT name, tbl_name, sql FROM sqlite_master WHERE type='trigger' ORDER BY name",
          [],
          (err, rows) => {
            if (err) {
              reject(err);
            } else {
              db.close();
              resolve(rows);
            }
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  // Função para verificar a cidade primária atual
  static async getPrimaryCity() {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await getDatabaseConnection();

        db.get("SELECT * FROM cities WHERE isPrimary = 1", [], (err, row) => {
          if (err) {
            reject(err);
          } else {
            db.close();
            resolve(row);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Função para contar registros em cada tabela
  static async getTableCounts() {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await getDatabaseConnection();
        const tables = await this.getAllTables();
        const counts = {};

        let completed = 0;

        if (tables.length === 0) {
          db.close();
          resolve(counts);
          return;
        }

        tables.forEach((table) => {
          db.get(`SELECT COUNT(*) as count FROM ${table}`, [], (err, row) => {
            if (err) {
              counts[table] = "Erro";
            } else {
              counts[table] = row.count;
            }

            completed++;
            if (completed === tables.length) {
              db.close();
              resolve(counts);
            }
          });
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Menu principal do database
  static async handleDatabaseMenu(rl) {
    while (true) {
      console.log("\n=== ESTRUTURA DO BANCO DE DADOS ===");
      console.log("1. Mostrar Todas as Tabelas");
      console.log("2. Detalhes de uma Tabela Específica");
      console.log("3. Mostrar Índices");
      console.log("4. Mostrar Triggers");
      console.log("5. Verificar Cidade Primária");
      console.log("6. Contagem de Registros");
      console.log("7. Informações Gerais do Banco");
      console.log("0. Voltar ao Menu Principal");

      const choice = await new Promise((resolve) => {
        rl.question("Escolha uma opção: ", resolve);
      });

      try {
        switch (choice) {
          case "1":
            await this.showAllTables();
            break;
          case "2":
            await this.showTableDetails(rl);
            break;
          case "3":
            await this.showAllIndexes();
            break;
          case "4":
            await this.showAllTriggers();
            break;
          case "5":
            await this.showPrimaryCity();
            break;
          case "6":
            await this.showTableCounts();
            break;
          case "7":
            await this.showDatabaseInfo();
            break;
          case "0":
            return;
          default:
            console.log("❌ Opção inválida. Tente novamente.");
        }
      } catch (error) {
        console.error("❌ Erro ao executar operação:", error.message);
      }

      // Pausa para ver o resultado
      if (choice !== "0") {
        await new Promise((resolve) => {
          rl.question("\nPressione Enter para continuar...", resolve);
        });
      }
    }
  }

  // Mostrar todas as tabelas
  static async showAllTables() {
    try {
      console.log("\n📋 === TABELAS DO BANCO DE DADOS ===");

      const tables = await this.getAllTables();

      if (tables.length === 0) {
        console.log("❌ Nenhuma tabela encontrada no banco.");
        return;
      }

      console.log(`\n📊 Total de tabelas: ${tables.length}\n`);

      tables.forEach((table, index) => {
        console.log(`${index + 1}. ${table}`);
      });
    } catch (error) {
      console.error("❌ Erro ao listar tabelas:", error.message);
    }
  }

  // Mostrar detalhes de uma tabela específica
  static async showTableDetails(rl) {
    try {
      const tables = await this.getAllTables();

      if (tables.length === 0) {
        console.log("❌ Nenhuma tabela encontrada no banco.");
        return;
      }

      console.log("\n📋 === ESCOLHER TABELA ===");
      tables.forEach((table, index) => {
        console.log(`${index + 1}. ${table}`);
      });

      const choice = await new Promise((resolve) => {
        rl.question(
          "\nEscolha o número da tabela (0 para cancelar): ",
          resolve
        );
      });

      const tableIndex = parseInt(choice) - 1;

      if (choice === "0" || tableIndex < 0 || tableIndex >= tables.length) {
        console.log("❌ Operação cancelada ou opção inválida.");
        return;
      }

      const tableName = tables[tableIndex];
      const tableInfo = await this.getTableInfo(tableName);

      console.log(
        `\n🔍 === ESTRUTURA DA TABELA: ${tableName.toUpperCase()} ===`
      );

      tableInfo.forEach((column) => {
        let columnInfo = `📌 ${column.name} (${column.type})`;

        if (column.pk === 1) {
          columnInfo += " 🔑 PRIMARY KEY";
        }

        if (column.notnull === 1) {
          columnInfo += " ⚠️ NOT NULL";
        }

        if (column.dflt_value !== null) {
          columnInfo += ` 🔧 DEFAULT: ${column.dflt_value}`;
        }

        console.log(columnInfo);
      });
    } catch (error) {
      console.error("❌ Erro ao mostrar detalhes da tabela:", error.message);
    }
  }

  // Mostrar todos os índices
  static async showAllIndexes() {
    try {
      console.log("\n🔍 === ÍNDICES DO BANCO DE DADOS ===");

      const tables = await this.getAllTables();

      for (const table of tables) {
        const indexes = await this.getTableIndexes(table);

        if (indexes.length > 0) {
          console.log(`\n📊 Tabela: ${table}`);
          indexes.forEach((index) => {
            let indexInfo = `   🔍 ${index.name}`;
            if (index.unique === 1) {
              indexInfo += " (UNIQUE)";
            }
            console.log(indexInfo);
          });
        }
      }
    } catch (error) {
      console.error("❌ Erro ao listar índices:", error.message);
    }
  }

  // Mostrar todos os triggers
  static async showAllTriggers() {
    try {
      console.log("\n⚡ === TRIGGERS DO BANCO DE DADOS ===");

      const triggers = await this.getAllTriggers();

      if (triggers.length === 0) {
        console.log("❌ Nenhum trigger encontrado no banco.");
        return;
      }

      triggers.forEach((trigger, index) => {
        console.log(`\n${index + 1}. 📛 Nome: ${trigger.name}`);
        console.log(`   📊 Tabela: ${trigger.tbl_name}`);
        console.log(`   🔧 SQL:`);
        console.log(`   ${trigger.sql}`);
      });
    } catch (error) {
      console.error("❌ Erro ao listar triggers:", error.message);
    }
  }

  // Mostrar cidade primária atual
  static async showPrimaryCity() {
    try {
      console.log("\n⭐ === CIDADE PRIMÁRIA ===");

      const primaryCity = await this.getPrimaryCity();

      if (!primaryCity) {
        console.log("❌ Nenhuma cidade está marcada como primária.");
        return;
      }

      console.log(`🏙️ Cidade Primária Atual:`);
      console.log(`   ID: ${primaryCity.id}`);
      console.log(`   Nome: ${primaryCity.name}`);
      console.log(`   Link: ${primaryCity.link || "Não informado"}`);
      console.log(`   Mensagem: ${primaryCity.message || "Sem mensagem"}`);
      console.log(
        `\n✅ Sistema garante que apenas UMA cidade pode ser primária por vez.`
      );
    } catch (error) {
      console.error("❌ Erro ao verificar cidade primária:", error.message);
    }
  }

  // Mostrar contagem de registros
  static async showTableCounts() {
    try {
      console.log("\n📊 === CONTAGEM DE REGISTROS ===");

      const counts = await this.getTableCounts();

      Object.keys(counts).forEach((table) => {
        console.log(`📋 ${table}: ${counts[table]} registro(s)`);
      });
    } catch (error) {
      console.error("❌ Erro ao contar registros:", error.message);
    }
  }

  // Mostrar informações gerais do banco
  static async showDatabaseInfo() {
    const { DATABASE_PATH } = require("../utils/initialize");
    const fs = require("fs").promises;

    try {
      console.log("\n🗃️ === INFORMAÇÕES GERAIS DO BANCO ===");

      const stats = await fs.stat(DATABASE_PATH);

      console.log(`📁 Localização: ${DATABASE_PATH}`);
      console.log(`📊 Tamanho: ${(stats.size / 1024).toFixed(2)} KB`);
      console.log(`📅 Criado em: ${stats.birthtime.toLocaleString()}`);
      console.log(`🔄 Última modificação: ${stats.mtime.toLocaleString()}`);
      console.log(`🔧 Tipo: SQLite Database`);
      console.log(`🔐 Versão SQLite: 3.x`);
    } catch (error) {
      console.error("❌ Erro ao obter informações do banco:", error.message);
    }
  }
}

module.exports = DatabaseController;
