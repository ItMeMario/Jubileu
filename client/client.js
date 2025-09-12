// client.js
const { Client, LocalAuth } = require("whatsapp-web.js");
const path = require("path");
const startScout = require("../utils/scout");
// 🆕 Importa a função de extração de IDs
const { startBackgroundExtraction } = require("../utils/groupIdExtractor");

// Função para obter o caminho correto da sessão
function getSessionPath() {
  try {
    const { app } = require("electron");

    if (app && app.isPackaged) {
      // Quando empacotado, usar userData
      const userDataPath = app.getPath("userData");
      return path.join(userDataPath, "whatsapp-session");
    } else {
      // Durante desenvolvimento, usar caminho relativo
      return path.join(__dirname, "../.wwebjs_auth");
    }
  } catch (error) {
    // Fallback se electron não estiver disponível
    return path.join(__dirname, "../.wwebjs_auth");
  }
}

// Configuração do cliente WhatsApp usando Chromium do sistema
const client = new Client({
  authStrategy: new LocalAuth({
    clientId: "whatsapp-bot",
    dataPath: getSessionPath(),
  }),
  puppeteer: {
    // Use o Chromium do sistema em vez do bundled
    executablePath:
      process.platform === "win32"
        ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
        : process.platform === "darwin"
        ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        : "/usr/bin/google-chrome",
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--disable-features=TranslateUI",
      "--disable-ipc-flooding-protection",
      "--disable-extensions",
      "--disable-default-apps",
      "--disable-sync",
      "--disable-translate",
      "--hide-scrollbars",
      "--mute-audio",
    ],
  },
});

// 🆕 Flag para evitar execução duplicada
let extractionStarted = false;

// 🆕 Event listeners para o client
client.on("qr", (qr) => {
  console.log("QR Code recebido");
  // O QR code será tratado pelo scout ou pela GUI
});

client.on("ready", async () => {
  console.log("✅ Cliente WhatsApp está pronto!");
  console.log(`📱 Conectado como: ${client.info.pushname}`);

  // 🆕 Inicia a extração automática apenas uma vez
  if (!extractionStarted) {
    extractionStarted = true;
    try {
      console.log("🚀 Iniciando extração automática de IDs de grupos...");
      startBackgroundExtraction(client);
    } catch (error) {
      console.error("❌ Erro ao iniciar extração de IDs:", error);
    }
  } else {
    console.log("ℹ️ Extração de IDs já foi iniciada, pulando...");
  }
});

client.on("authenticated", () => {
  console.log("✅ Cliente autenticado com sucesso!");
});

client.on("auth_failure", (msg) => {
  console.error("❌ Falha na autenticação:", msg);
});

client.on("disconnected", (reason) => {
  console.log("🔌 Cliente desconectado:", reason);
  // Reset da flag quando desconectar
  extractionStarted = false;
});

module.exports = { client, startScout };
