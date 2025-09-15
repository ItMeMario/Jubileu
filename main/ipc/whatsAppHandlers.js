const { BrowserWindow } = require("electron");

class WhatsAppHandlers {
  constructor(modules) {
    this.client = modules.client;
    this.startScout = modules.startScout;
    this.messageHandler = modules.messageHandler;

    // 🆕 NOVAS FUNÇÕES DO CLIENT.JS
    this.initializeClient = modules.initializeClient;
    this.setupClientEventListeners = modules.setupClientEventListeners;
    this.resetClientState = modules.resetClientState;
    this.getClientStatus = modules.getClientStatus;

    console.log("🔧 WhatsAppHandlers inicializado com funções do client.js");
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

      // 🆕 PRIMEIRO: Configura eventos GUI específicos (SEM messageHandler)
      this.setupGUIEvents(mainWindow);

      // 🆕 SEGUNDO: Usa initializeClient que já configura os event listeners do client.js
      // Isso garante que a extração de IDs funcione igual ao CLI
      if (this.initializeClient) {
        console.log("🚀 Usando initializeClient do client.js...");
        // initializeClient já chama setupClientEventListeners + client.initialize
        await this.initializeClient();
      } else {
        console.log("⚠️ Fallback: usando método antigo...");
        // Fallback para compatibilidade
        this.setupClientEvents(mainWindow);
        this.startScout(this.client);
        await this.client.initialize();
      }

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

        // 🆕 USA resetClientState do client.js se disponível
        if (this.resetClientState) {
          this.resetClientState();
        }
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

  setupGUIEvents(mainWindow) {
    console.log("📱 Configurando eventos GUI específicos...");

    // QR Code para a GUI
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

        console.log("📱 QR Code enviado para GUI");
      } catch (err) {
        console.error("Erro ao gerar QR Code:", err);
        mainWindow.webContents.send("error", "Erro ao gerar QR Code");
      }
    });

    // Notificações para GUI - ready
    this.client.on("ready", () => {
      console.log("✅ WhatsApp conectado! (GUI)");
      mainWindow.webContents.send(
        "whatsapp-ready",
        "WhatsApp conectado com sucesso!"
      );
    });

    // Notificações para GUI - authenticated
    this.client.on("authenticated", () => {
      console.log("🔐 WhatsApp autenticado! (GUI)");
      mainWindow.webContents.send(
        "whatsapp-authenticated",
        "WhatsApp autenticado!"
      );
    });

    // Notificações para GUI - auth_failure
    this.client.on("auth_failure", () => {
      console.error("❌ Falha na autenticação (GUI)");
      mainWindow.webContents.send("error", "Falha na autenticação do WhatsApp");
    });

    // Notificações para GUI - disconnected
    this.client.on("disconnected", (reason) => {
      console.log(`🔌 WhatsApp desconectado: ${reason} (GUI)`);
      mainWindow.webContents.send(
        "whatsapp-disconnected",
        `WhatsApp desconectado: ${reason}`
      );
    });

    console.log(
      "✅ Eventos GUI configurados (sem messageHandler - evitando duplicação)"
    );
  }

  // 📄 MÉTODO ANTIGO MANTIDO PARA COMPATIBILIDADE
  setupClientEvents(mainWindow) {
    console.log("⚠️ Usando setupClientEvents antigo (fallback)");

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

    // ⚠️ MANTIDO no fallback para compatibilidade
    this.client.on("message", this.messageHandler);
  }

  // 🆕 MÉTODO MELHORADO: Usa getClientStatus do client.js se disponível
  getClientStatus() {
    if (this.getClientStatus && typeof this.getClientStatus === "function") {
      // Usa a função do client.js que tem mais informações
      const clientStatus = this.getClientStatus();
      return {
        connected: this.client && this.client.pupPage ? true : false,
        status: this.client && this.client.info ? "ready" : "connecting",
        ...clientStatus, // Adiciona informações extras do client.js
      };
    }

    // Fallback para método antigo
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

        // 🆕 Reset usando função do client.js se disponível
        if (this.resetClientState) {
          this.resetClientState();
        }
      }
      return await this.startWhatsApp();
    } catch (error) {
      return {
        success: false,
        message: "Erro ao reconectar: " + error.message,
      };
    }
  }

  // 🆕 NOVO MÉTODO: Para debug - mostra status completo
  async getDetailedStatus() {
    const basicStatus = this.getClientStatus();

    return {
      ...basicStatus,
      hasInitializeClient: !!this.initializeClient,
      hasResetClientState: !!this.resetClientState,
      clientInfo: this.client?.info || null,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = WhatsAppHandlers;
