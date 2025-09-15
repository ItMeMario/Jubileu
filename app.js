// app.js
const { initializeAllConfigs } = require("./utils/initialize");
const { client, startScout } = require("./client/client");
const { initializeApp } = require("./controllers/configController");
const messageHandler = require("./handlers/message");

// 🆕 IMPORTAÇÕES DO SISTEMA DE LEMBRETES
const ReminderScheduler = require("./utils/reminderScheduler");
const reminderService = require("./services/reminderService");

async function startApp() {
  try {
    // 🔑 Cria pastas, arquivos e banco antes de qualquer coisa
    await initializeAllConfigs();

    const shouldContinue = await initializeApp();
    if (!shouldContinue) return;

    // Configura handlers
    client.on("qr", (qr) => {
      const qrcode = require("qrcode-terminal");
      qrcode.generate(qr, { small: true });
    });

    client.on("ready", () => {
      console.log("Tudo certo! WhatsApp conectado.");

      // 🆕 CONFIGURA O SISTEMA DE LEMBRETES QUANDO O CLIENT ESTIVER PRONTO
      try {
        console.log("⏰ Configurando sistema de lembretes...");

        // Configura o cliente no reminderService
        reminderService.setWhatsAppClient(client);

        // Inicia o scheduler
        const scheduler = new ReminderScheduler();
        scheduler.start();

        console.log("✅ Sistema de lembretes iniciado com sucesso!");
      } catch (error) {
        console.error("❌ Erro ao iniciar sistema de lembretes:", error);
      }
    });

    client.on("message", messageHandler);

    // Agora sim podemos rodar o scout
    startScout(client);

    client.initialize();
  } catch (error) {
    console.error("Erro durante a inicialização:", error);
    process.exit(1);
  }
}

startApp();
