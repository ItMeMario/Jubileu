// main.js
// Processo Principal Electron para Zwei Chat Premium (Meta Official API Edition)

const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const log = require("electron-log");

// Serviços do Backend Premium
const metaConfig = require("./config/metaConfig");
const { metaApiClient } = require("./client/metaApiClient");
const { metaAccountService } = require("./services/metaAccountService");
const { metaTemplateService } = require("./services/metaTemplateService");
const { metaBroadcastService } = require("./services/metaBroadcastService");
const { broadcastHistoryService } = require("./services/broadcastHistoryService");
const { flowService } = require("./services/flowService");
const { window24hService } = require("./services/window24hService");
const { syncService } = require("./services/syncService");
const { botIntegrationService } = require("./services/botIntegrationService");
const { firebaseService } = require("./services/firebaseService");

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: "Zwei Chat Premium - Meta WhatsApp Cloud API",
    backgroundColor: "#0d1117",
    webPreferences: {
      preload: path.join(__dirname, "renderer/preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    autoHideMenuBar: true,
  });

  mainWindow.loadFile(path.join(__dirname, "renderer/html/index.html"));

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

/**
 * Registra todos os manipuladores de IPC (Comunicação Frontend <-> Backend)
 */
function registerIpcHandlers() {
  // 1. Configurações e Diagnóstico Meta
  ipcMain.handle("meta:get-config", () => metaConfig.getConfig());

  ipcMain.handle("meta:save-config", async (_event, newConfig) => {
    metaConfig.updateConfig(newConfig);
    const health = await metaAccountService.checkConnectionStatus();
    return { success: true, health };
  });

  ipcMain.handle("meta:test-connection", async (_event, configToTest) => {
    return metaAccountService.testCredentials(configToTest);
  });

  ipcMain.handle("meta:get-account-health", async () => {
    return metaAccountService.checkConnectionStatus();
  });

  // 2. Message Templates
  ipcMain.handle("templates:sync", async () => {
    return metaTemplateService.syncTemplates();
  });

  ipcMain.handle("templates:get-approved", (_event, language) => {
    return metaTemplateService.getApprovedTemplates(language);
  });

  ipcMain.handle("templates:render-preview", (_event, { templateName, values }) => {
    const template = metaTemplateService.getTemplateByName(templateName);
    return metaTemplateService.renderPreview(template, values);
  });

  // 3. Disparador Oficial (Broadcast)
  ipcMain.handle("broadcast:start", async (_event, params) => {
    return metaBroadcastService.startBroadcast(params);
  });

  ipcMain.handle("broadcast:pause", () => {
    metaBroadcastService.pause();
    return true;
  });

  ipcMain.handle("broadcast:resume", () => {
    metaBroadcastService.resume();
    return true;
  });

  ipcMain.handle("broadcast:stop", () => {
    metaBroadcastService.stop();
    return true;
  });

  ipcMain.handle("broadcast:get-stats", () => {
    return metaBroadcastService.getStats();
  });

  ipcMain.handle("broadcast:get-history", () => {
    return broadcastHistoryService.getAllCampaigns();
  });

  ipcMain.handle("broadcast:export-csv", async (_event, campaignId) => {
    const csvContent = broadcastHistoryService.exportCampaignLogsToCsv(campaignId);
    return { success: true, csv: csvContent };
  });

  // 4. Fluxos e Chatbot
  ipcMain.handle("flows:get-all", () => flowService.getAllFlows());
  ipcMain.handle("flows:get-active", () => flowService.getActiveFlow());
  ipcMain.handle("flows:save", (_event, flow) => flowService.saveFlow(flow));
  ipcMain.handle("flows:set-active", (_event, flowId) => {
    flowService.setActiveFlow(flowId);
    return true;
  });

  ipcMain.handle("bot:get-status", () => botIntegrationService.isEnabled());
  ipcMain.handle("bot:toggle", (_event, enabled) => {
    if (enabled) botIntegrationService.enable();
    else botIntegrationService.disable();
    return botIntegrationService.isEnabled();
  });

  // 5. Janela de 24 Horas
  ipcMain.handle("window24h:check", (_event, phone) => {
    return window24hService.checkWindow(phone);
  });
}

/**
 * Encaminha eventos em tempo real do backend para a janela do Electron
 */
function setupEventForwarding() {
  // Eventos de Progresso do Disparador
  metaBroadcastService.on("broadcast:progress", (stats) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("broadcast:progress", stats);
    }
  });

  metaBroadcastService.on("broadcast:completed", (stats) => {
    broadcastHistoryService.saveCampaignResult(stats);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("broadcast:completed", stats);
    }
  });

  // Eventos de Sincronização em Tempo Real
  syncService.on("message:inbound", (msg) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("message:inbound", msg);
    }
  });

  syncService.on("message:status_updated", (statusData) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("message:status_updated", statusData);
    }
  });

  syncService.on("conversations:updated", (conversations) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("conversations:updated", conversations);
    }
  });
}

// Inicialização do Ciclo de Vida do App
app.whenReady().then(async () => {
  log.info("🚀 Iniciando Zwei Chat Premium...");

  registerIpcHandlers();
  setupEventForwarding();
  createWindow();

  // Inicializa serviços de backend em segundo plano
  try {
    await firebaseService.initialize();
    botIntegrationService.initialize();
    await metaAccountService.checkConnectionStatus();
  } catch (err) {
    log.error("Aviso na inicialização dos serviços:", err.message);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
