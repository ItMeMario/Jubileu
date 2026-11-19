// client/client.js
const { Client, LocalAuth, Chat } = require("whatsapp-web.js");
const path = require("path");
const pathHelper = require("../utils/pathHelper");
const { debug } = require("../services/debugService");
const { getPuppeteerOptions, AUTH_TIMEOUT_MS } = require("../services/servicesModules/chromePath");

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
    authTimeoutMs: AUTH_TIMEOUT_MS,
    puppeteer: getPuppeteerOptions(),
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
