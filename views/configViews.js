const groupController = require("../controllers/groupController");
const cityController = require("../controllers/cityController");
const indicadoresController = require("../controllers/indicadoresController");
const modoDevController = require("../controllers/modoDevController");
const { handleMessageMenu } = require("./messageView");

async function handleConfigMenu(rl) {
    while (true) {
        console.log("\n=== MENU PRINCIPAL ===");
        console.log("1. Gerenciar Mensagens");
        console.log("2. Gerenciar Grupos");
        console.log("3. Gerenciar Cidades");
        console.log("4. Indicadores");
        console.log("5. Modo Dev");
        console.log("0. Sair");

        const choice = await new Promise((resolve) => {
            rl.question("Escolha uma opção: ", resolve);
        });

        switch (choice) {
            case "1":
                await handleMessageMenu(rl);
                break;
            case "2":
                await groupController.handleGroupManagement(rl);
                break;
            case "3":
                await cityController.handleCities(rl);
                break;
            case "4":
                await indicadoresController.handleIndicadoresMenu(rl);
                break;
            case "5":
                await modoDevController.handleModoDevMenu(rl);
                break;
            case "0":
                console.log("Saindo do sistema...");
                return;
            default:
                console.log("Opção inválida. Tente novamente.");
        }
    }
}

module.exports = {
    handleConfigMenu
};