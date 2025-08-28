const DatabaseService = require("../services/dataBaseService");
const DatabaseView = require("../views/dataBaseView");
const { DATABASE_PATH } = require("../utils/initialize");
const fs = require("fs").promises;

class DatabaseController {
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
            DatabaseView.showTables(await DatabaseService.getAllTables());
            break;
          case "2":
            await this.showTableDetails(rl);
            break;
          case "3":
            const tables = await DatabaseService.getAllTables();
            for (const t of tables) {
              DatabaseView.showIndexes(
                t,
                await DatabaseService.getTableIndexes(t)
              );
            }
            break;
          case "4":
            DatabaseView.showTriggers(await DatabaseService.getAllTriggers());
            break;
          case "5":
            DatabaseView.showPrimaryCity(
              await DatabaseService.getPrimaryCity()
            );
            break;
          case "6":
            DatabaseView.showTableCounts(
              await DatabaseService.getTableCounts()
            );
            break;
          case "7":
            const stats = await fs.stat(DATABASE_PATH);
            DatabaseView.showDatabaseInfo(stats, DATABASE_PATH);
            break;
          case "0":
            return;
          default:
            console.log("❌ Opção inválida. Tente novamente.");
        }
      } catch (error) {
        console.error("❌ Erro:", error.message);
      }

      if (choice !== "0") {
        await new Promise((resolve) =>
          rl.question("\nEnter para continuar...", resolve)
        );
      }
    }
  }

  static async showTableDetails(rl) {
    const tables = await DatabaseService.getAllTables();
    if (tables.length === 0) {
      return DatabaseView.showTables([]);
    }
    console.log("\n📋 === ESCOLHER TABELA ===");
    tables.forEach((t, i) => console.log(`${i + 1}. ${t}`));

    const choice = await new Promise((res) =>
      rl.question("\nEscolha (0 para cancelar): ", res)
    );

    const idx = parseInt(choice) - 1;
    if (choice === "0" || idx < 0 || idx >= tables.length) {
      console.log("❌ Cancelado ou inválido.");
      return;
    }

    const info = await DatabaseService.getTableInfo(tables[idx]);
    DatabaseView.showTableDetails(tables[idx], info);
  }
}

module.exports = DatabaseController;
