const { handleConfigMenu } = require("../views/configViews");
const { handleDroneMenu } = require("../views/droneViews");
const { createInterface } = require("readline");
const { initializeAllConfigs } = require("../utils/initialize");

async function initializeApp() {
  // Inicializa arquivos, pastas e banco de dados primeiro
  try {
    await initializeAllConfigs();
  } catch (err) {
    console.error("Erro ao inicializar arquivos/pastas/banco de dados:", err);
    // Interrompe a inicialização do app se ocorrer erro crítico
    return false;
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise((resolve) => {
    rl.question(
      'Pressione Enter para continuar, digite "config" para configurar ou "drone" para acessar o menu drone: ',
      resolve
    );
  });

  const normalized = (answer || "").toString().trim().toLowerCase();

  if (normalized === "config") {
    try {
      await handleConfigMenu(rl);
    } catch (err) {
      console.error("Erro no menu de configuração:", err);
    } finally {
      rl.close();
    }
    return false; // Indica que o app não deve continuar após configuração
  }

  if (normalized === "drone") {
    try {
      await handleDroneMenu(rl);
    } catch (err) {
      console.error("Erro no menu drone:", err);
    } finally {
      rl.close();
    }
    return false; // Indica que o app não deve continuar após usar o drone
  }

  rl.close();
  return true; // Indica que o app pode continuar
}

module.exports = {
  initializeApp,
  handleConfigMenu,
};
