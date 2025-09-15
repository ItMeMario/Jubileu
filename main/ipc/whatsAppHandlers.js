const { BrowserWindow } = require("electron");

class WhatsAppHandlers {
  constructor(modules) {
    this.client = modules.client;
    this.startScout = modules.startScout;
    this.messageHandler = modules.messageHandler;

    this.reminderService = modules.reminderService;
    this.ReminderScheduler = modules.ReminderScheduler;
    this.reminderScheduler = null; // Instância do scheduler

    console.log("WhatsAppHandlers inicializado com sistema de lembretes");
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

      // Inicia scout e cliente
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

        // NOVO: Para o scheduler de lembretes
        this.stopReminderSystem();
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
    console.log("Configurando eventos do cliente...");

    // QR Code
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

        console.log("QR Code enviado para GUI");
      } catch (err) {
        console.error("Erro ao gerar QR Code:", err);
        mainWindow.webContents.send("error", "Erro ao gerar QR Code");
      }
    });

    // Ready - com inicialização de lembretes
    this.client.on("ready", () => {
      console.log("WhatsApp conectado!");
      mainWindow.webContents.send(
        "whatsapp-ready",
        "WhatsApp conectado com sucesso!"
      );

      // NOVO: Configura sistema de lembretes
      this.initializeReminderSystem();
    });

    // Authenticated
    this.client.on("authenticated", () => {
      console.log("WhatsApp autenticado!");
      mainWindow.webContents.send(
        "whatsapp-authenticated",
        "WhatsApp autenticado!"
      );
    });

    // Auth failure
    this.client.on("auth_failure", () => {
      console.error("Falha na autenticação");
      mainWindow.webContents.send("error", "Falha na autenticação do WhatsApp");
    });

    // Disconnected
    this.client.on("disconnected", (reason) => {
      console.log(`WhatsApp desconectado: ${reason}`);
      mainWindow.webContents.send(
        "whatsapp-disconnected",
        `WhatsApp desconectado: ${reason}`
      );

      // NOVO: Para lembretes quando desconectar
      this.stopReminderSystem();
    });

    // Message handler
    this.client.on("message", this.messageHandler);

    console.log("Eventos do cliente configurados");
  }

  // NOVO MÉTODO: Inicializa sistema de lembretes
  initializeReminderSystem() {
    try {
      if (!this.reminderService || !this.ReminderScheduler) {
        console.warn(
          "Módulos de lembrete não carregados, pulando inicialização"
        );
        return;
      }

      console.log("Configurando sistema de lembretes...");

      // Configura o cliente no reminderService
      this.reminderService.setWhatsAppClient(this.client);

      // Cria nova instância do scheduler se não existir
      if (!this.reminderScheduler) {
        this.reminderScheduler = new this.ReminderScheduler();
        this.reminderScheduler.start();
      }

      console.log("Sistema de lembretes iniciado com sucesso!");
    } catch (error) {
      console.error("Erro ao iniciar sistema de lembretes:", error);
    }
  }

  
  stopReminderSystem() {
    try {
      if (this.reminderScheduler) {
        this.reminderScheduler = null;
        console.log("Sistema de lembretes parado");
      }
    } catch (error) {
      console.error("Erro ao parar sistema de lembretes:", error);
    }
  }

  // Status do cliente
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
        this.stopReminderSystem();
      }
      return await this.startWhatsApp();
    } catch (error) {
      return {
        success: false,
        message: "Erro ao reconectar: " + error.message,
      };
    }
  }

  // Status detalhado para debug
  async getDetailedStatus() {
    const basicStatus = this.getClientStatus();

    return {
      ...basicStatus,
      hasReminderSystem: !!(this.reminderService && this.ReminderScheduler),
      reminderSchedulerActive: !!this.reminderScheduler,
      clientInfo: this.client?.info || null,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = WhatsAppHandlers;
