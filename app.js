// app.js
const { initializeAllConfigs } = require("./utils/initialize");
const { client, startScout } = require("./client/client");
const { initializeApp } = require("./controllers/configController");
const messageHandler = require("./handlers/message");

// Importa o sistema de lembretes
const ReminderScheduler = require("./reminderScheduler");
const reminderService = require("./reminderService");

async function startApp() {
  try {
    // 🔧 Cria pastas, arquivos e banco antes de qualquer coisa
    await initializeAllConfigs();

    const shouldContinue = await initializeApp();
    if (!shouldContinue) return;

    // Configura handlers
    client.on("qr", (qr) => {
      const qrcode = require("qrcode-terminal");
      qrcode.generate(qr, { small: true });
    });

    client.on("ready", () => {
      console.log("✅ Tudo certo! WhatsApp conectado.");

      // 🔔 Configura o sistema de lembretes após o WhatsApp estar pronto
      setupReminderSystem();
    });

    client.on("message", messageHandler);

    // Agora sim podemos rodar o scout
    startScout(client);

    client.initialize();
  } catch (error) {
    console.error("❌ Erro durante a inicialização:", error);
    process.exit(1);
  }
}

// Função para configurar o sistema de lembretes
function setupReminderSystem() {
  try {
    console.log("🔔 Configurando sistema de lembretes...");

    // Configura o cliente WhatsApp no reminderService
    reminderService.setWhatsAppClient(client);

    // Inicia o scheduler
    const reminderScheduler = new ReminderScheduler();
    reminderScheduler.start();

    // Testa a conexão com o banco (opcional)
    testReminderSystem();

    console.log("✅ Sistema de lembretes configurado com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao configurar sistema de lembretes:", error);
  }
}

// Função para testar o sistema de lembretes
async function testReminderSystem() {
  try {
    await reminderService.testDatabaseConnection();
    console.log("🧪 Sistema de lembretes testado com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao testar sistema de lembretes:", error);
  }
}

// Para testes manuais - descomente se quiser forçar execução
// function testRemindersManually() {
//   setTimeout(async () => {
//     console.log("🧪 Executando teste manual de lembretes...");
//     try {
//       await reminderService.checkAndExecuteReminders();
//     } catch (error) {
//       console.error("❌ Erro no teste manual:", error);
//     }
//   }, 10000); // Executa após 10 segundos
// }

startApp();

// Para testes - descomente a linha abaixo se quiser testar manualmente
// testRemindersManually();
