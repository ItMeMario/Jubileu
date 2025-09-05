const { BrowserWindow } = require("electron");

class WhatsAppHandlers {
  constructor(modules) {
    this.client = modules.client;
    this.startScout = modules.startScout;
    this.messageHandler = modules.messageHandler;
  }

  async startWhatsApp() {
    try {
      if (!this.client || !this.startScout || !this.messageHandler) {
        throw new Error("Módulos não carregados corretamente");
      }

      const mainWindow = BrowserWindow.getAllWindows().find(
        (win) => win.webContents
      );
      if (!mainWindow) {
        throw new Error("Janela principal não encontrada");
      }

      // Remove listeners antigos para evitar duplicação
      this.client.removeAllListeners();

      // Configura eventos do cliente
      this.setupClientEvents(mainWindow);

      // Inicia o scout e inicializa o cliente
      this.startScout(this.client);
      await this.client.initialize();

      return { success: true, message: "WhatsApp inicializado" };
    } catch (error) {
      console.error("Erro ao inicializar WhatsApp:", error);
      return {
        success: false,
        message: "Erro ao inicializar WhatsApp: " + error.message,
      };
    }
  }

  async stopWhatsApp() {
    try {
      if (this.client) {
        await this.client.destroy();
      }
      return { success: true, message: "WhatsApp desconectado" };
    } catch (error) {
      console.error("Erro ao parar WhatsApp:", error);
      return {
        success: false,
        message: "Erro ao parar WhatsApp: " + error.message,
      };
    }
  }

  setupClientEvents(mainWindow) {
    this.client.on("qr", async (qr) => {
      try {
        const QRCode = require("qrcode");
        const qrImage = await QRCode.toDataURL(qr, {
          width: 300,
          margin: 2,
        });

        mainWindow.webContents.send("qr-generated", {
          qrImage: qrImage,
          qrText: qr,
        });
      } catch (err) {
        console.error("Erro ao gerar QR Code:", err);
        mainWindow.webContents.send("error", "Erro ao gerar QR Code");
      }
    });

    this.client.on("ready", () => {
      console.log("WhatsApp conectado!");
      mainWindow.webContents.send(
        "whatsapp-ready",
        "WhatsApp conectado com sucesso!"
      );
    });

    this.client.on("authenticated", () => {
      mainWindow.webContents.send(
        "whatsapp-authenticated",
        "WhatsApp autenticado!"
      );
    });

    this.client.on("auth_failure", () => {
      mainWindow.webContents.send("error", "Falha na autenticação do WhatsApp");
    });

    this.client.on("disconnected", (reason) => {
      mainWindow.webContents.send(
        "whatsapp-disconnected",
        `WhatsApp desconectado: ${reason}`
      );
    });

    this.client.on("message", this.messageHandler);
  }

  // Método para obter status do cliente
  getClientStatus() {
    if (!this.client) {
      return { connected: false, status: "not_initialized" };
    }

    return {
      connected: this.client.pupPage ? true : false,
      status: this.client.info ? "ready" : "connecting",
    };
  }

  // Método para forçar reconexão
  async forceReconnect() {
    try {
      if (this.client) {
        await this.client.destroy();
      }
      return await this.startWhatsApp();
    } catch (error) {
      return {
        success: false,
        message: "Erro ao reconectar: " + error.message,
      };
    }
  }
}

module.exports = WhatsAppHandlers;
