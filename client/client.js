// client.js
const { Client, LocalAuth } = require("whatsapp-web.js");
const path = require("path");
const startScout = require("../utils/scout");
const { startBackgroundExtraction } = require("../utils/groupIdExtractor");
const { debug } = require("../services/debugService");

// Flag para controlar a extração automática
let extractionStarted = false;

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

// 🆕 Função para obter caminho do Chrome com fallbacks
function getChromeExecutablePath() {
  const platform = process.platform;

  if (platform === "win32") {
    // Windows - tenta múltiplos caminhos
    const possiblePaths = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe",
    ];

    // Retorna o primeiro que existir (será validado pelo puppeteer)
    return possiblePaths[0]; // Deixa o puppeteer validar
  } else if (platform === "darwin") {
    return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  } else {
    // Linux
    return "/usr/bin/google-chrome";
  }
}

// Configuração do cliente WhatsApp usando Chromium do sistema
const client = new Client({
  authStrategy: new LocalAuth({
    clientId: "whatsapp-bot",
    dataPath: getSessionPath(),
  }),
  puppeteer: {
    executablePath: getChromeExecutablePath(),
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
      // 🆕 Argumentos adicionais para estabilidade
      "--disable-software-rasterizer",
      "--disable-dev-tools",
      "--disable-webgl",
      "--disable-threaded-animation",
      "--disable-threaded-scrolling",
      "--disable-in-process-stack-traces",
      "--disable-histogram-customizer",
      "--disable-gl-extensions",
      "--disable-composited-antialiasing",
      "--disable-canvas-aa",
      "--disable-3d-apis",
      "--disable-breakpad",
      "--disable-component-update",
      "--disable-print-preview",
      "--disable-features=AudioServiceOutOfProcess",
      "--disable-features=IsolateOrigins",
      "--disable-features=site-per-process",
      "--disable-blink-features=AutomationControlled",
    ],
    // 🆕 Timeouts maiores para evitar erros de conexão
    timeout: 60000, // 60 segundos
  },
});

// Função de inicialização dos event listeners
function setupClientEventListeners() {
  // Remove listeners existentes para evitar duplicação
  client.removeAllListeners();

  client.on("qr", async (qr) => {
    await debug("📱 QR Code recebido");
  });

  client.on("ready", async () => {
    await debug("✅ Cliente WhatsApp está pronto!");

    // Inicia a extração automática apenas uma vez
    if (!extractionStarted) {
      extractionStarted = true;
      try {
        await debug("🚀 Iniciando extração automática de IDs de grupos...");
        startBackgroundExtraction(client);
      } catch (error) {
        await debug(`⚠️ Erro ao iniciar extração de IDs: ${error.message}`);
      }
    } else {
      await debug("ℹ️ Extração de IDs já foi iniciada, pulando...");
    }
  });

  client.on("authenticated", async () => {
    await debug("✅ Cliente autenticado com sucesso!");
  });

  client.on("auth_failure", async (msg) => {
    await debug(`⚠️ Falha na autenticação: ${msg}`);
    // Reset da flag quando falhar autenticação
    extractionStarted = false;
  });

  client.on("disconnected", async (reason) => {
    await debug(`🔌 Cliente desconectado: ${reason}`);
    // Reset da flag quando desconectar
    extractionStarted = false;
  });

  // 🆕 Listener para erros do puppeteer
  client.on("loading_screen", async (percent, message) => {
    await debug(`⏳ Carregando WhatsApp Web: ${percent}% - ${message}`);
  });

  // 🆕 Listener para mudanças de estado
  client.on("change_state", async (state) => {
    await debug(`🔄 Estado do cliente mudou para: ${state}`);
  });
}

// Função de inicialização completa
async function initializeClient() {
  await debug("🚀 Inicializando cliente WhatsApp...");

  // Configura os event listeners
  setupClientEventListeners();

  // Inicializa o cliente
  await client.initialize();

  return client;
}

// Para CLI: Auto-inicialização se não estiver em ambiente Electron
if (!process.versions.electron) {
  debug("🖥️ Modo CLI detectado - inicializando automaticamente...");
  setupClientEventListeners();
  // No CLI, o client.initialize() será chamado externamente
}

module.exports = {
  client,
  startScout,
  initializeClient,
  setupClientEventListeners,
  getSessionPath, // 🆕 Exporta função para uso externo
};
