const { handleConfigMenu } = require("../views/configViews");
const { handleDroneMenu } = require("../views/droneViews");
const { createInterface } = require("readline");
const { initializeAllConfigs } = require("../config/initialize");

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

  // LOOP PRINCIPAL - permite voltar ao menu inicial
  let continueLoop = true;

  while (continueLoop) {
    const answer = await new Promise((resolve) => {
      rl.question(
        '\nPressione Enter para continuar, digite "config" para configurar ou "drone" para drone: ',
        resolve
      );
    });

    const normalized = (answer || "").toString().trim().toLowerCase();

    if (normalized === "config") {
      try {
        console.log("\n🔧 Abrindo menu de configuração...\n");
        await handleConfigMenu(rl);
        console.log("\n✅ Configuração finalizada.");
        // Volta para o menu inicial (continua o loop)
      } catch (err) {
        console.error("Erro no menu de configuração:", err);
      }
    } else if (normalized === "drone") {
      try {
        console.log("\n🚁 Abrindo menu de drone...\n");
        await handleDroneMenu(rl);
        console.log("\n✅ Menu drone finalizado.");
        // Volta para o menu inicial (continua o loop)
      } catch (err) {
        console.error("Erro no menu de drone:", err);
      }
    } else if (normalized === "exit" || normalized === "sair") {
      console.log("👋 Saindo do sistema...");
      continueLoop = false;
    } else {
      // Enter ou qualquer outra coisa - continua para inicializar o bot
      console.log("🚀 Iniciando bot WhatsApp...");
      rl.close();
      return true; // Continua para inicializar o bot
    }
  }

  rl.close();
  return false; // Sai sem inicializar o bot
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

  showPersistentPrompt();

  persistentRl.on("line", async (input) => {
    const command = input.trim().toLowerCase();

    if (command === "config") {
      console.log("\n🔧 Abrindo menu de configuração...\n");
      try {
        // Remove temporariamente o listener 'line' para evitar conflitos
        persistentRl.removeAllListeners("line");

        await handleConfigMenu(persistentRl);

        console.log("\n✅ Configuração finalizada. Bot continua rodando...");
        showPersistentPrompt();

        // Reativa o listener 'line'
        persistentRl.on("line", arguments.callee);
      } catch (err) {
        console.error("Erro no menu de configuração:", err);
        showPersistentPrompt();
        // Reativa o listener mesmo em caso de erro
        persistentRl.on("line", arguments.callee);
      }
    } else if (command === "drone") {
      console.log("\n🚁 Abrindo menu de drone...\n");
      try {
        // Remove temporariamente o listener 'line' para evitar conflitos
        persistentRl.removeAllListeners("line");

        await handleDroneMenu(persistentRl);

        console.log("\n✅ Menu drone finalizado. Bot continua rodando...");
        showPersistentPrompt();

        // Reativa o listener 'line'
        persistentRl.on("line", arguments.callee);
      } catch (err) {
        console.error("Erro no menu de drone:", err);
        showPersistentPrompt();
        // Reativa o listener mesmo em caso de erro
        persistentRl.on("line", arguments.callee);
      }
    } else if (command === "help" || command === "ajuda") {
      console.log("\n📖 Comandos disponíveis:");
      console.log("  config - Abrir menu de configurações");
      console.log("  drone  - Abrir menu de drone");
      console.log("  help   - Mostrar esta ajuda");
      console.log("  exit   - Sair do programa");
      showPersistentPrompt();
    } else if (command === "exit" || command === "quit" || command === "sair") {
      console.log("\n👋 Finalizando aplicação...");
      if (persistentRl) {
        persistentRl.close();
      }
      process.exit(0);
    } else if (command.trim() !== "") {
      console.log(`❌ Comando não reconhecido: "${command}"`);
      console.log('💡 Digite "help" para ver os comandos disponíveis.');
      showPersistentPrompt();
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

// Função para mostrar o prompt persistente
function showPersistentPrompt() {
  console.log(
    '\n🔄 Terminal interativo ativo. Digite "config", "drone" ou "help":'
  );
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
