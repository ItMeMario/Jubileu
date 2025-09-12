// client.js
const { Client, LocalAuth } = require("whatsapp-web.js");
const path = require("path");
const startScout = require("../utils/scout");
// 🆕 Importa a função de extração de IDs
const { startBackgroundExtraction } = require("../utils/groupIdExtractor");

// DEBUG - adicione no topo do client.js
console.log("DEBUG: client.js carregado");
console.log(
  "DEBUG: startBackgroundExtraction importada?",
  typeof startBackgroundExtraction
);

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

// 🆕 FUNÇÃO DE INICIALIZAÇÃO DOS EVENT LISTENERS
function setupClientEventListeners() {
  console.log("📡 Configurando event listeners do cliente...");

  // Remove listeners existentes para evitar duplicação
  client.removeAllListeners();

  // Event listeners para o client
  client.on("qr", (qr) => {
    console.log("📱 QR Code recebido");
    // O QR code será tratado pelo scout ou pela GUI
  });

  client.on("ready", async () => {
    console.log("DEBUG: evento ready disparado no client.js");
    console.log("DEBUG: extractionStarted =", extractionStarted);
    console.log("✅ Cliente WhatsApp está pronto!");

    // 🆕 Inicia a extração automática apenas uma vez
    if (!extractionStarted) {
      extractionStarted = true;
      try {
        console.log("🚀 Iniciando extração automática de IDs de grupos...");
        startBackgroundExtraction(client);
      } catch (error) {
        console.error("⚠️ Erro ao iniciar extração de IDs:", error);
      }
    } else {
      console.log("ℹ️ Extração de IDs já foi iniciada, pulando...");
    }
  });

  client.on("authenticated", () => {
    console.log("✅ Cliente autenticado com sucesso!");
  });

  client.on("auth_failure", (msg) => {
    console.error("⚠️ Falha na autenticação:", msg);
  });

  client.on("disconnected", (reason) => {
    console.log("🔌 Cliente desconectado:", reason);
    // Reset da flag quando desconectar
    extractionStarted = false;
  });

  console.log("✅ Event listeners configurados");
}

// 🆕 FUNÇÃO DE INICIALIZAÇÃO COMPLETA
async function initializeClient() {
  console.log("🚀 Inicializando cliente WhatsApp...");

  // Configura os event listeners
  setupClientEventListeners();

  // Inicializa o cliente
  await client.initialize();

  return client;
}

// 🆕 FUNÇÃO PARA RESET (útil para testes)
function resetClientState() {
  extractionStarted = false;
  console.log("🔄 Estado do cliente resetado");
}

// 🆕 FUNÇÃO PARA OBTER STATUS
function getClientStatus() {
  return {
    extractionStarted,
    isReady: client.info ? true : false,
    clientInfo: client.info || null,
  };
}

// 🆕 PARA CLI: Auto-inicialização se não estiver em ambiente Electron
if (!process.versions.electron) {
  console.log("🖥️ Modo CLI detectado - inicializando automaticamente...");
  setupClientEventListeners();
  // No CLI, o client.initialize() será chamado externamente
}

// 🆕 EXPORTAÇÃO COMPLETA COM TODAS AS FUNÇÕES
module.exports = {
  client,
  startScout,
  initializeClient, // 🎯 FUNÇÃO PRINCIPAL PARA GUI
  setupClientEventListeners, // Para uso avançado
  resetClientState, // Para testes/debug
  getClientStatus, // Para monitoramento
};
