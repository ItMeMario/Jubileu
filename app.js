// app.js
const { initializeAllConfigs } = require("./utils/initialize");
const { client, startScout } = require("./client/client");
const { initializeApp } = require("./controllers/configController");
const messageHandler = require("./handlers/message");
require("./services/reminderService");
const { reminderSystem } = require("./services/reminderService");

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
    });

    client.on("message", messageHandler);

    // Agora sim podemos rodar o scout
    startScout(client);

    client.initialize();
  } catch (error) {
    console.error("Erro durante a inicialização:", error);
    process.exit(1);
  }

  client.on("ready", () => {
    reminderSystem.startAutomaticReminders(client);
  });
}

startApp();
