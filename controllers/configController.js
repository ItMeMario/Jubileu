const { handleConfigMenu } = require("../views/configViews");
const { handleDroneMenu } = require("../views/droneViews");
const { createInterface } = require("readline");
const { initializeAllConfigs } = require("../utils/initialize");

// Variável global para o readline persistente
let persistentRl = null;

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
      'Pressione Enter para continuar, digite "config" para configurar ou "drone" para drone: ',
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
      console.error("Erro no menu de drone:", err);
    } finally {
      rl.close();
    }
    return false; // Indica que o app não deve continuar após drone
  }

  rl.close();
  return true; // Indica que o app pode continuar
}

// Nova função para manter o terminal interativo
function startPersistentTerminal() {
  if (persistentRl) {
    persistentRl.close();
  }

  persistentRl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(
    '\n📝 Terminal interativo ativo. Digite "config" ou "drone" a qualquer momento...\n'
  );

  persistentRl.on("line", async (input) => {
    const command = input.trim().toLowerCase();

    if (command === "config") {
      console.log("\n🔧 Abrindo menu de configuração...\n");
      try {
        await handleConfigMenu(persistentRl);
        console.log("\n✅ Configuração finalizada. Bot continua rodando...");
        console.log(
          '📝 Digite "config" ou "drone" para acessar os menus novamente.\n'
        );
      } catch (err) {
        console.error("Erro no menu de configuração:", err);
      }
    } else if (command === "drone") {
      console.log("\n🚁 Abrindo menu de drone...\n");
      try {
        await handleDroneMenu(persistentRl);
        console.log("\n✅ Menu drone finalizado. Bot continua rodando...");
        console.log(
          '📝 Digite "config" ou "drone" para acessar os menus novamente.\n'
        );
      } catch (err) {
        console.error("Erro no menu de drone:", err);
      }
    }
  });

  // Cleanup quando o processo for finalizado
  process.on("SIGINT", () => {
    console.log("\n👋 Finalizando aplicação...");
    if (persistentRl) {
      persistentRl.close();
    }
    process.exit(0);
  });
}

// Função para fechar o terminal persistente
function closePersistentTerminal() {
  if (persistentRl) {
    persistentRl.close();
    persistentRl = null;
  }
}

module.exports = {
  initializeApp,
  handleConfigMenu,
  startPersistentTerminal,
  closePersistentTerminal,
};
