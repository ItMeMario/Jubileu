const messageController = require("../controllers/messageController");

async function handleMessageMenu(rl) {
  while (true) {
    console.log("\n=== MENU DE MENSAGENS ===");
    console.log("1. Adicionar nova mensagem");
    console.log("2. Listar todas as mensagens");
    console.log("3. Editar mensagem");
    console.log("4. Excluir mensagem");
    console.log("5. Ver última mensagem");
    console.log("6. Verificar completude das mensagens");
    console.log("0. Voltar ao menu principal");

    const choice = await new Promise((resolve) => {
      rl.question("Escolha uma opção: ", resolve);
    });

    switch (choice) {
      case "1":
        await messageController.handleAddMessage(rl);
        break;
      case "2":
        await messageController.handleListMessages();
        break;
      case "3":
        await messageController.handleEditMessage(rl);
        break;
      case "4":
        await messageController.handleDeleteMessage(rl);
        break;
      case "5":
        await messageController.handleShowLastMessage();
        break;
      case "6":
        await messageController.handleCheckMessageCompleteness();
        break;
      case "0":
        return;
      default:
        console.log("Opção inválida. Tente novamente.");
    }
  }
}

module.exports = {
  handleMessageMenu,
};
