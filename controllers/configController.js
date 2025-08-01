const { handleConfigMenu } = require("../views/configViews");
const messageController = require("../controllers/messageController");
const groupController = require("../controllers/groupController");
const { createInterface } = require("readline");

async function initializeApp() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise((resolve) => {
    rl.question(
      'Pressione Enter para continuar ou digite "config" para configurar: ',
      resolve
    );
  });

  if (answer.toLowerCase() === "config") {
    await handleConfigMenu(rl);
    rl.close();
    return false; // Indica que o app não deve continuar
  }

  rl.close();
  return true; // Indica que o app pode continuar
}

module.exports = {
  initializeApp,
  handleConfigMenu,
};
