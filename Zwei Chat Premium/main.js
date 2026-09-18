// main.js
// Processo Principal Electron para Zwei Chat Premium (Meta Official API Edition)

const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const log = require("electron-log");

// Serviços do Backend Premium
const metaConfig = require("./config/metaConfig");
const { metaApiClient } = require("./client/metaApiClient");
const { metaAccountService } = require("./services/metaAccountService");
const { metaOnboardingService } = require("./services/metaOnboardingService");
const { oauthDialogManager } = require("./services/oauthDialogManager");
const { metaTemplateService } = require("./services/metaTemplateService");
const { metaBroadcastService } = require("./services/metaBroadcastService");
const { broadcastRecipientsService } = require("./services/broadcastRecipientsService");
const { broadcastHistoryService } = require("./services/broadcastHistoryService");
const { flowService } = require("./services/flowService");
const { window24hService } = require("./services/window24hService");
const { syncService } = require("./services/syncService");
const { botIntegrationService } = require("./services/botIntegrationService");
const { antiLoopService } = require("./services/antiLoopService");
const { firebaseService } = require("./services/firebaseService");
const { cloudGatewayService } = require("./cloud-gateway/server");

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

  // 🛡️ Segurança: Bloqueia navegações internas indevidas e abre links externos no navegador padrão do SO
  mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
    try {
      const parsedUrl = new URL(navigationUrl);
      if (parsedUrl.protocol !== "file:") {
        event.preventDefault();
        shell.openExternal(navigationUrl);
      }
    } catch (err) {
      event.preventDefault();
    }
  });

  // 🛡️ Segurança: Intercepta window.open() do renderer, impedindo popups arbitrários e abrindo links externos no browser
  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    if (targetUrl.startsWith("http:") || targetUrl.startsWith("https:")) {
      shell.openExternal(targetUrl);
    }
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

/**
 * Registra todos os manipuladores de IPC (Comunicação Frontend <-> Backend)
 */
function registerIpcHandlers() {
  // 1. Configurações e Diagnóstico Meta
  ipcMain.handle("meta:get-config", () => metaConfig.getConfig({ safeForClient: true }));

  ipcMain.handle("meta:save-config", async (_event, newConfig) => {
    metaConfig.saveToEnvFile(newConfig);
    const health = await metaAccountService.checkConnectionStatus();
    return { success: true, health };
  });

  ipcMain.handle("meta:test-connection", async (_event, configToTest) => {
    return metaAccountService.testCredentials(configToTest);
  });

  ipcMain.handle("meta:get-account-health", async () => {
    return metaAccountService.checkConnectionStatus();
  });

  // Onboarding Oficial Meta (Embedded Signup)
  ipcMain.handle("meta:get-embedded-signup-url", () => {
    return metaOnboardingService.getEmbeddedSignupUrl();
  });

  ipcMain.handle("meta:start-embedded-signup", async () => {
    try {
      const authResult = await oauthDialogManager.openMetaAuthDialog(mainWindow);

      if (!authResult.success) {
        return {
          success: false,
          cancelled: !!authResult.cancelled,
          error: authResult.error || "Operação cancelada ou falha na autenticação.",
        };
      }

      // Troca o código obtido pelas credenciais completas e ativa a conta
      const onboardingResult = await metaOnboardingService.completeOnboarding(
        authResult.code,
        authResult.redirectUri
      );

      return onboardingResult;
    } catch (err) {
      console.error("Erro no fluxo do Embedded Signup:", err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle("meta:complete-onboarding", async (_event, { authCode, redirectUri }) => {
    return metaOnboardingService.completeOnboarding(authCode, redirectUri);
  });

  ipcMain.handle("meta:disconnect-account", async () => {
    return metaOnboardingService.disconnectAccount();
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
    return broadcastRecipientsService.getStats();
  });

  ipcMain.handle("broadcast:get-recipients", () => {
    return broadcastRecipientsService.getRecipients();
  });

  ipcMain.handle("broadcast:add-recipient", (_event, contact) => {
    return broadcastRecipientsService.addRecipient(contact);
  });

  ipcMain.handle("broadcast:add-recipients-batch", (_event, contacts) => {
    return broadcastRecipientsService.addRecipientsBatch(contacts);
  });

  ipcMain.handle("broadcast:remove-recipient", (_event, id) => {
    return broadcastRecipientsService.removeRecipient(id);
  });

  ipcMain.handle("broadcast:clear-recipients", (_event, type) => {
    return broadcastRecipientsService.clearRecipients(type);
  });

  ipcMain.handle("broadcast:get-config", () => {
    return broadcastRecipientsService.getConfig();
  });

  ipcMain.handle("broadcast:save-config", (_event, config) => {
    return broadcastRecipientsService.saveConfig(config);
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
  ipcMain.handle("flows:get-by-id", (_event, flowId) => flowService.getFlowById(flowId));
  ipcMain.handle("flows:create-empty", (_event, name) => flowService.createEmptyFlow(name));
  ipcMain.handle("flows:save", (_event, flow) => flowService.saveFlow(flow));
  ipcMain.handle("flows:delete", (_event, flowId) => flowService.deleteFlow(flowId));
  ipcMain.handle("flows:duplicate", (_event, flowId) => flowService.duplicateFlow(flowId));
  ipcMain.handle("flows:set-active", (_event, flowId) => {
    flowService.setActiveFlow(flowId);
    return true;
  });

  ipcMain.handle("bot:get-status", () => botIntegrationService.isEnabled());
  ipcMain.handle("bot:toggle", (_event, enabled) => {
    if (enabled) {
      botIntegrationService.enable();
    } else {
      botIntegrationService.disable();
    }
    return botIntegrationService.isBotEnabled;
  });

  // 6. Gateway e Webhook Status
  ipcMain.handle("gateway:get-status", () => ({
    isRunning: cloudGatewayService.isRunning,
    publicUrl: cloudGatewayService.publicUrl,
    port: cloudGatewayService.port,
  }));

  // 5. Janela de 24 Horas
  ipcMain.handle("window24h:check", (_event, phone) => {
    return window24hService.checkWindow(phone);
  });

  // 7. Proteção Anti-Loop & Guerra de Robôs
  ipcMain.handle("anti-loop:get-status", () => {
    return antiLoopService.getAllActiveCooldowns();
  });

  ipcMain.handle("anti-loop:release", (_event, phone) => {
    return antiLoopService.releaseCooldown(phone);
  });
}

/**
 * Encaminha eventos em tempo real do backend para a janela do Electron
 */
function setupEventForwarding() {
  // Eventos de Progresso e Logs do Disparador
  metaBroadcastService.on("broadcast:log", (logEntry) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("broadcast:log", logEntry);
    }
  });

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

  metaBroadcastService.on("broadcast:recipient_updated", (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("broadcast:recipient_updated", data);
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

  // Evento de Alerta de Loop Infinito / Bot vs Bot
  syncService.on("bot:anti_loop_triggered", (data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("bot:anti_loop_triggered", data);
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
    await cloudGatewayService.start();
  } catch (err) {
    log.error("Aviso na inicialização dos serviços:", err.message);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("before-quit", async () => {
  await cloudGatewayService.stop();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
