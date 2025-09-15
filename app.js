// app.js
const { initializeAllConfigs } = require("./utils/initialize");
const { client, startScout } = require("./client/client");
const { initializeApp } = require("./controllers/configController");
const messageHandler = require("./handlers/message");
const { debug } = require("./services/debugService");

// 🆕 IMPORTAÇÕES DO SISTEMA DE LEMBRETES
const ReminderScheduler = require("./utils/reminderScheduler");
const reminderService = require("./services/reminderService");

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

    client.on("ready", async () => {
      await debug("Tudo certo! WhatsApp conectado.");

      // 🆕 CONFIGURA O SISTEMA DE LEMBRETES QUANDO O CLIENT ESTIVER PRONTO
      try {
        await debug("⏰ Configurando sistema de lembretes...");

        // Configura o cliente no reminderService
        reminderService.setWhatsAppClient(client);

        // Inicia o scheduler
        const scheduler = new ReminderScheduler();
        scheduler.start();

        await debug("✅ Sistema de lembretes iniciado com sucesso!");
      } catch (error) {
        await debug("❌ Erro ao iniciar sistema de lembretes:", error);
      }
    });

    client.on("message", messageHandler);

    // Agora sim podemos rodar o scout
    startScout(client);

    client.initialize();
  } catch (error) {
    await debug("Erro durante a inicialização:", error);
    process.exit(1);
  }
}

startApp();
