const { BrowserWindow } = require("electron");
const fs = require("fs").promises;
const path = require("path");

class WhatsAppHandlers {
  constructor(modules) {
    this.client = modules.client;
    this.startScout = modules.startScout;
    this.messageHandler = modules.messageHandler;

    this.reminderService = modules.reminderService;
    this.ReminderScheduler = modules.ReminderScheduler;
    this.reminderScheduler = null;

    // 🆕 Estados de controle
    this.isInitializing = false;
    this.isDestroying = false;
    this.authRetryCount = 0;
    this.MAX_AUTH_RETRIES = 3;

    console.log("WhatsAppHandlers inicializado com sistema de lembretes");
  }

  // 🆕 Função para obter caminho da sessão
  getSessionPath() {
    try {
      const { app } = require("electron");

      if (app && app.isPackaged) {
        const userDataPath = app.getPath("userData");
        return path.join(userDataPath, "whatsapp-session");
      } else {
        return path.join(__dirname, "../../.wwebjs_auth");
      }
    } catch (error) {
      return path.join(__dirname, "../../.wwebjs_auth");
    }
  }

  // 🆕 Função para limpar sessão com retry (resolve o EBUSY)
  async clearSessionWithRetry(sessionPath, maxRetries = 5) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `🗑️ Tentativa ${attempt}/${maxRetries} de limpar sessão...`
        );

        // Verifica se existe
        const exists = await fs
          .access(sessionPath)
          .then(() => true)
          .catch(() => false);

        if (!exists) {
          console.log("✅ Sessão já foi removida");
          return true;
        }

        // Tenta remover
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
          // Aguarda antes de tentar novamente (aumenta o tempo a cada tentativa)
          const delay = 1000 * attempt;
          console.log(`⏳ Aguardando ${delay}ms antes de tentar novamente...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          console.error("❌ Todas as tentativas de limpar sessão falharam");
          // Não lança erro - permite continuar mesmo sem limpar
          return false;
        }
      }
    }
    return false;
  }

  // 🆕 Função para destruir cliente completamente
  async destroyClientCompletely() {
    if (this.isDestroying) {
      console.log("⏳ Destruição já em andamento, aguardando...");
      return;
    }

    this.isDestroying = true;

    try {
      console.log("🔄 Iniciando destruição completa do cliente...");

      // Para o sistema de lembretes primeiro
      this.stopReminderSystem();

      if (this.client) {
        // Remove todos os listeners
        this.client.removeAllListeners();

        // Verifica se tem pupPage (Chrome aberto)
        if (this.client.pupPage) {
          console.log("🌐 Fechando navegador...");
          try {
            await this.client.destroy();
          } catch (error) {
            console.warn("⚠️ Erro ao destruir cliente:", error.message);
          }
        }

        // Aguarda um pouco para garantir que o Chrome fechou
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      console.log("✅ Cliente destruído completamente");
    } catch (error) {
      console.error("❌ Erro na destruição do cliente:", error);
    } finally {
      this.isDestroying = false;
    }
  }

  // 🔄 MÉTODO MELHORADO: Start WhatsApp
  async startWhatsApp() {
    try {
      // Previne múltiplas inicializações simultâneas
      if (this.isInitializing) {
        console.log("⏳ Inicialização já em andamento...");
        return {
          success: false,
          message: "Inicialização já em andamento",
        };
      }

      this.isInitializing = true;

      if (!this.client || !this.startScout || !this.messageHandler) {
        throw new Error("Módulos não carregados corretamente");
      }

      const mainWindow = BrowserWindow.getAllWindows().find(
        (win) => win.webContents
      );
      if (!mainWindow) {
        throw new Error("Janela principal não encontrada");
      }

      console.log("🚀 Iniciando WhatsApp...");

      // 🆕 Destrói cliente existente se houver
      if (this.client.pupPage) {
        console.log("🔄 Cliente existente detectado, destruindo...");
        await this.destroyClientCompletely();
      }

      // Remove listeners antigos
      this.client.removeAllListeners();

      // Configura eventos
      this.setupClientEvents(mainWindow);

      // Inicia scout e cliente
      this.startScout(this.client);
      await this.client.initialize();

      // Reset contador de retries em caso de sucesso
      this.authRetryCount = 0;

      return { success: true, message: "WhatsApp inicializado" };
    } catch (error) {
      console.error("❌ Erro ao inicializar WhatsApp:", error);

      // 🆕 Tenta limpar sessão se o erro for de autenticação
      if (
        error.message.includes("Failed to launch") ||
        error.message.includes("EBUSY")
      ) {
        console.log("🔄 Tentando limpar sessão corrompida...");
        const sessionPath = this.getSessionPath();
        await this.clearSessionWithRetry(sessionPath);
      }

      return {
        success: false,
        message: "Erro ao inicializar WhatsApp: " + error.message,
      };
    } finally {
      this.isInitializing = false;
    }
  }

  // 🔄 MÉTODO MELHORADO: Stop WhatsApp
  async stopWhatsApp() {
    try {
      console.log("🛑 Parando WhatsApp...");

      if (this.client) {
        await this.destroyClientCompletely();
      }

      return { success: true, message: "WhatsApp desconectado" };
    } catch (error) {
      console.error("❌ Erro ao parar WhatsApp:", error);
      return {
        success: false,
        message: "Erro ao parar WhatsApp: " + error.message,
      };
    }
  }

  // 🔄 MÉTODO MELHORADO: Setup Client Events
  setupClientEvents(mainWindow) {
    console.log("⚙️ Configurando eventos do cliente...");

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

        console.log("📱 QR Code enviado para GUI");
      } catch (err) {
        console.error("❌ Erro ao gerar QR Code:", err);
        mainWindow.webContents.send("error", "Erro ao gerar QR Code");
      }
    });

    // Ready
    this.client.on("ready", () => {
      console.log("✅ WhatsApp conectado!");
      mainWindow.webContents.send(
        "whatsapp-ready",
        "WhatsApp conectado com sucesso!"
      );

      // Reset contador de retries
      this.authRetryCount = 0;

      // Inicializa lembretes
      this.initializeReminderSystem();
    });

    // Authenticated
    this.client.on("authenticated", () => {
      console.log("✅ WhatsApp autenticado!");
      mainWindow.webContents.send(
        "whatsapp-authenticated",
        "WhatsApp autenticado!"
      );
    });

    // 🆕 MELHORADO: Auth failure com recuperação automática
    this.client.on("auth_failure", async (msg) => {
      console.error("❌ Falha na autenticação:", msg);

      this.authRetryCount++;

      if (this.authRetryCount <= this.MAX_AUTH_RETRIES) {
        console.log(
          `🔄 Tentando recuperar... (${this.authRetryCount}/${this.MAX_AUTH_RETRIES})`
        );

        mainWindow.webContents.send(
          "error",
          `Falha na autenticação. Limpando sessão e gerando novo QR Code...`
        );

        try {
          // Destrói cliente
          await this.destroyClientCompletely();

          // Limpa sessão corrompida
          const sessionPath = this.getSessionPath();
          await this.clearSessionWithRetry(sessionPath);

          // Aguarda um pouco
          await new Promise((resolve) => setTimeout(resolve, 2000));

          // Reinicia automaticamente
          console.log("🔄 Reiniciando cliente...");
          await this.startWhatsApp();
        } catch (error) {
          console.error("❌ Erro na recuperação:", error);
          mainWindow.webContents.send(
            "error",
            "Erro ao tentar recuperar. Clique em 'Iniciar WhatsApp' novamente."
          );
        }
      } else {
        console.error("❌ Máximo de tentativas atingido");
        mainWindow.webContents.send(
          "error",
          "Falha na autenticação após múltiplas tentativas. Reinicie a aplicação."
        );
      }
    });

    // 🆕 MELHORADO: Disconnected com limpeza
    this.client.on("disconnected", async (reason) => {
      console.log(`🔌 WhatsApp desconectado: ${reason}`);

      mainWindow.webContents.send(
        "whatsapp-disconnected",
        `WhatsApp desconectado: ${reason}`
      );

      // Para lembretes
      this.stopReminderSystem();

      // 🆕 Se foi desvinculado pelo usuário, limpa a sessão
      if (reason === "LOGOUT" || reason === "UNPAIRED") {
        console.log("🗑️ Detectado logout/desvínculo - limpando sessão...");

        try {
          await this.destroyClientCompletely();

          const sessionPath = this.getSessionPath();
          await this.clearSessionWithRetry(sessionPath);

          mainWindow.webContents.send(
            "error",
            "WhatsApp desvinculado. Clique em 'Iniciar WhatsApp' para gerar novo QR Code."
          );
        } catch (error) {
          console.error("❌ Erro ao limpar sessão após logout:", error);
        }
      }
    });

    // Message handler
    this.client.on("message", this.messageHandler);

    console.log("✅ Eventos do cliente configurados");
  }

  // Inicializa sistema de lembretes
  initializeReminderSystem() {
    try {
      if (!this.reminderService || !this.ReminderScheduler) {
        console.warn(
          "⚠️ Módulos de lembrete não carregados, pulando inicialização"
        );
        return;
      }

      console.log("📅 Configurando sistema de lembretes...");

      this.reminderService.setWhatsAppClient(this.client);

      if (!this.reminderScheduler) {
        this.reminderScheduler = new this.ReminderScheduler();
        this.reminderScheduler.start();
      }

      console.log("✅ Sistema de lembretes iniciado!");
    } catch (error) {
      console.error("❌ Erro ao iniciar sistema de lembretes:", error);
    }
  }

  stopReminderSystem() {
    try {
      if (this.reminderScheduler) {
        this.reminderScheduler = null;
        console.log("🛑 Sistema de lembretes parado");
      }
    } catch (error) {
      console.error("❌ Erro ao parar sistema de lembretes:", error);
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

  // 🆕 MELHORADO: Reconexão forçada com limpeza
  async forceReconnect() {
    try {
      console.log("🔄 Forçando reconexão...");

      if (this.client) {
        await this.destroyClientCompletely();

        // Limpa sessão
        const sessionPath = this.getSessionPath();
        await this.clearSessionWithRetry(sessionPath);
      }

      // Aguarda um pouco
      await new Promise((resolve) => setTimeout(resolve, 2000));

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
      isInitializing: this.isInitializing,
      isDestroying: this.isDestroying,
      authRetryCount: this.authRetryCount,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = WhatsAppHandlers;
