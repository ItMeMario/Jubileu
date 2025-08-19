// app.js
const { initializeAllConfigs } = require("./initialize");
const { client, startScout } = require("./client/client");
const { initializeApp } = require("./controllers/configController");
const messageHandler = require("./handlers/message");

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
}

startApp();
