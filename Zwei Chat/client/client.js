// client/client.js
const { Client, LocalAuth, Chat } = require("whatsapp-web.js");
const path = require("path");
const pathHelper = require("../utils/pathHelper");
const { debug } = require("../services/debugService");

// 🛡️ PATCH: Desativa globalmente o envio de 'Visto' (Blue Ticks) e estados de digitação
// Sobrescreve métodos do protótipo do Chat para evitar travamentos e erros de presença
if (Chat && Chat.prototype) {
  Chat.prototype.sendSeen = async function () { return Promise.resolve(); };
  Chat.prototype.sendStateTyping = async function () { return Promise.resolve(); };
  Chat.prototype.clearState = async function () { return Promise.resolve(); };
}

// Função para obter o caminho correto da sessão
function getSessionPath(instanceId) {
  const basePath = pathHelper.getSessionPath();
  return instanceId ? path.join(basePath, `instance_${instanceId}`) : basePath;
}

// Função para obter caminho do Chrome com fallbacks
function getChromeExecutablePath() {
  const platform = process.platform;

  if (platform === "win32") {
    const possiblePaths = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe",
    ];
    return possiblePaths[0]; // Deixa o puppeteer validar
  } else if (platform === "darwin") {
    return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  } else {
    return "/usr/bin/google-chrome";
  }
}

// Mapa de instâncias ativas do cliente WhatsApp (instanceId => Client)
const clients = new Map();

// Função para criar uma nova instância de cliente WhatsApp
function createClient(instanceId) {
  if (clients.has(instanceId)) {
    return clients.get(instanceId);
  }

  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: `zwei-chat-bot-${instanceId}`,
      dataPath: getSessionPath(instanceId),
    }),
    puppeteer: {
      executablePath: getChromeExecutablePath(),
      headless: true,
      args: [
        "--window-position=-10000,-10000",
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
      timeout: 60000, // 60 segundos
    },
  });

  // Vincula o ID da instância à sua própria referência
  client.clientId = instanceId;

  clients.set(instanceId, client);
  return client;
}

// Para CLI: Auto-inicialização se não estiver em ambiente Electron
if (!process.versions.electron) {
  debug("🖥️ Modo CLI detectado - inicializando automaticamente...");
  const defaultClient = createClient("default");
  defaultClient.initialize();
}

module.exports = {
  clients,
  createClient,
  getSessionPath,
};
