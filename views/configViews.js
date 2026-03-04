const cityController = require("../controllers/cityController");
const indicadoresController = require("../controllers/indicadoresController");
const modoDevController = require("../controllers/modoDevController");
const DatabaseController = require("../controllers/dataBaseController");
const { handleMessageMenu } = require("./messageView");

async function handleConfigMenu(rl) {
  while (true) {
    console.log("\n=== MENU PRINCIPAL ===");
    console.log("1. Gerenciar Mensagens");
    console.log("2. Gerenciar Cidades");
    console.log("3. Indicadores");
    console.log("4. Modo Dev");
    console.log("5. Banco de Dados");
    console.log("0. Sair");

    const choice = await new Promise((resolve) => {
      rl.question("Escolha uma opção: ", resolve);
    });

    switch (choice) {
      case "1":
        await handleMessageMenu(rl);
        break;
      case "2":
        await cityController.handleCities(rl);
        break;
      case "3":
        await indicadoresController.handleIndicadoresMenu(rl);
        break;
      case "4":
        await modoDevController.handleModoDevMenu(rl);
        break;
      case "5":
        await DatabaseController.handleDatabaseMenu(rl);
        break;
      case "0":
        console.log("Saindo do sistema...");
        rl.close();
        process.exit(0);
      default:
        console.log("Opção inválida. Tente novamente.");
    }
  }
}

module.exports = {
  handleConfigMenu,
};
