// main/ipc/whatsAppHandlers.js
const { BrowserWindow } = require("electron");
const fs = require("fs").promises;
const path = require("path");

class WhatsAppHandlers {
  constructor(modules) {
    this.client = modules.client;
    this.isInitializing = false;
    this.isDestroying = false;
    console.log("WhatsAppHandlers (Zwei Chat Lite) inicializado");
  }

  register(ipcMain) {
    ipcMain.handle("start-whatsapp", this.startWhatsApp.bind(this));
    ipcMain.handle("stop-whatsapp", this.stopWhatsApp.bind(this));
    ipcMain.handle("get-whatsapp-status", this.getWhatsAppStatus.bind(this));
  }

  unregister(ipcMain) {
    ipcMain.removeHandler("start-whatsapp");
    ipcMain.removeHandler("stop-whatsapp");
    ipcMain.removeHandler("get-whatsapp-status");
  }

  getSessionPath() {
    const { getSessionPath } = require("../../client/client");
    return getSessionPath();
  }

  async clearSessionWithRetry(sessionPath, maxRetries = 5) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🗑️ Tentativa ${attempt}/${maxRetries} de limpar sessão do Zwei Chat...`);

        const exists = await fs
          .access(sessionPath)
          .then(() => true)
          .catch(() => false);

        if (!exists) {
          console.log("✅ Sessão já foi removida");
          return true;
        }

        await fs.rm(sessionPath, {
          recursive: true,
          force: true,
          maxRetries: 3,
        });
        console.log("✅ Sessão limpa com sucesso!");
        return true;
      } catch (error) {
        console.warn(`⚠️ Tentativa ${attempt} falhou: ${error.message}`);
        if (attempt < maxRetries) {
          const delay = 1000 * attempt;
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          console.error("❌ Todas as tentativas de limpar sessão falharam");
          return false;
        }
      }
    }
    return false;
  }

  async destroyClientCompletely() {
    if (this.isDestroying) return;
    this.isDestroying = true;

    try {
      console.log("🔄 Parando cliente WhatsApp...");
      if (this.client) {
        this.client.removeAllListeners();
        if (this.client.pupPage) {
          try {
            await this.client.destroy();
          } catch (error) {
            console.warn("⚠️ Erro ao destruir cliente:", error.message);
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      console.log("✅ Cliente WhatsApp parado.");
    } catch (error) {
      console.error("❌ Erro ao parar cliente:", error);
    } finally {
      this.isDestroying = false;
    }
  }

  async startWhatsApp() {
    try {
      if (this.isInitializing) {
        return { success: false, message: "Inicialização já está rodando" };
      }
      this.isInitializing = true;

      const mainWindow = BrowserWindow.getAllWindows().find((win) => win.webContents);
      if (!mainWindow) {
        throw new Error("Janela principal não encontrada");
      }

      console.log("🚀 Iniciando WhatsApp no Zwei Chat...");

      if (this.client && this.client.pupPage) {
        await this.destroyClientCompletely();
      }

      this.client.removeAllListeners();
      this.setupClientEvents(mainWindow);

      // Inicializa o cliente do WhatsApp
      await this.client.initialize();

      return { success: true, message: "WhatsApp inicializado" };
    } catch (error) {
      console.error("❌ Erro ao inicializar WhatsApp no Zwei Chat:", error);
      return { success: false, message: error.message };
    } finally {
      this.isInitializing = false;
    }
  }

  async stopWhatsApp() {
    try {
      await this.destroyClientCompletely();
      return { success: true, message: "WhatsApp parado" };
    } catch (error) {
      console.error("❌ Erro ao parar WhatsApp:", error);
      return { success: false, message: error.message };
    }
  }

  getWhatsAppStatus() {
    if (!this.client) {
      return { connected: false, status: "not_initialized" };
    }
    return {
      connected: !!this.client.pupPage,
      status: this.client.info ? "ready" : "connecting",
    };
  }

  setupClientEvents(mainWindow) {
    this.client.on("qr", async (qr) => {
      try {
        const QRCode = require("qrcode");
        const qrImage = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
        mainWindow.webContents.send("qr-generated", { qrImage, qrText: qr });
        console.log("📱 QR Code gerado e enviado para a interface");
      } catch (err) {
        console.error("❌ Erro ao gerar QR Code:", err);
        mainWindow.webContents.send("error", "Erro ao gerar QR Code");
      }
    });

    this.client.on("ready", () => {
      console.log("✅ WhatsApp pronto!");
      mainWindow.webContents.send("whatsapp-ready", "WhatsApp conectado!");
    });

    this.client.on("authenticated", () => {
      console.log("✅ WhatsApp autenticado!");
      mainWindow.webContents.send("whatsapp-authenticated", "Autenticado!");
    });

    this.client.on("auth_failure", async (msg) => {
      console.error("❌ Falha na autenticação:", msg);
      mainWindow.webContents.send("error", `Falha na autenticação: ${msg}`);
    });

    this.client.on("disconnected", async (reason) => {
      console.log(`🔌 WhatsApp desconectado: ${reason}`);
      mainWindow.webContents.send("whatsapp-disconnected", reason);
      
      if (reason === "LOGOUT" || reason === "UNPAIRED") {
        try {
          await this.destroyClientCompletely();
          const sessionPath = this.getSessionPath();
          await this.clearSessionWithRetry(sessionPath);
        } catch (error) {
          console.error("❌ Erro ao limpar sessão após logout:", error);
        }
      }
    });

    this.client.on("loading_screen", (percent, message) => {
      console.log(`⏳ Carregando WhatsApp Web: ${percent}% - ${message}`);
      mainWindow.webContents.send("whatsapp-loading", { percent, message });
    });

    this.client.on("message", async (msg) => {
      try {
        if (msg.fromMe) return;
        const { handleIncomingMessage } = require("../../client/flowExecutor");
        await handleIncomingMessage(msg);
      } catch (err) {
        console.error(`❌ Erro no processador de fluxos de mensagens: ${err.message}`);
      }
    });
  }
}

module.exports = WhatsAppHandlers;
