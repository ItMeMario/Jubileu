// main/ipc/whatsAppHandlers.js
const { BrowserWindow } = require("electron");
const fs = require("fs").promises;
const path = require("path");
const db = require("../../config/db");

class WhatsAppHandlers {
  constructor(modules) {
    this.clients = modules.client; // Map of clients
    this.createClient = modules.createClient;
    this.isInitializingMap = new Map();
    this.isDestroyingMap = new Map();
    console.log("WhatsAppHandlers (Zwei Chat Lite) inicializado com suporte a múltiplas instâncias");
  }

  register(ipcMain) {
    ipcMain.handle("start-whatsapp", (event, instanceId) => this.startWhatsApp(instanceId));
    ipcMain.handle("stop-whatsapp", (event, instanceId) => this.stopWhatsApp(instanceId));
    ipcMain.handle("get-whatsapp-status", (event, instanceId) => this.getWhatsAppStatus(instanceId));

    // Novas rotas para instâncias
    ipcMain.handle("get-instances", () => this.getInstances());
    ipcMain.handle("create-instance", (event, name) => this.createInstance(name));
    ipcMain.handle("delete-instance", (event, id) => this.deleteInstance(id));
    ipcMain.handle("rename-instance", (event, { id, name }) => this.renameInstance(id, name));
  }

  unregister(ipcMain) {
    ipcMain.removeHandler("start-whatsapp");
    ipcMain.removeHandler("stop-whatsapp");
    ipcMain.removeHandler("get-whatsapp-status");
    ipcMain.removeHandler("get-instances");
    ipcMain.removeHandler("create-instance");
    ipcMain.removeHandler("delete-instance");
    ipcMain.removeHandler("rename-instance");
  }

  getSessionPath(instanceId) {
    const { getSessionPath } = require("../../client/client");
    return getSessionPath(instanceId);
  }

  async clearSessionWithRetry(sessionPath, maxRetries = 5) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🗑️ Tentativa ${attempt}/${maxRetries} de limpar sessão...`);

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

  async destroyClientCompletely(instanceId) {
    if (this.isDestroyingMap.get(instanceId)) return;
    this.isDestroyingMap.set(instanceId, true);

    try {
      console.log(`🔄 Parando cliente WhatsApp ${instanceId}...`);
      const client = this.clients.get(instanceId);
      if (client) {
        client.removeAllListeners();
        if (client.pupPage) {
          try {
            await client.destroy();
          } catch (error) {
            console.warn(`⚠️ Erro ao destruir cliente ${instanceId}:`, error.message);
          }
        }
        this.clients.delete(instanceId);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      console.log(`[Instance ${instanceId}] ✅ Cliente WhatsApp parado.`);
    } catch (error) {
      console.error(`❌ Erro ao parar cliente ${instanceId}:`, error);
    } finally {
      this.isDestroyingMap.set(instanceId, false);
    }
  }

  async startWhatsApp(instanceId) {
    try {
      if (this.isInitializingMap.get(instanceId)) {
        return { success: false, message: "Inicialização já está rodando" };
      }
      this.isInitializingMap.set(instanceId, true);

      const mainWindow = BrowserWindow.getAllWindows().find((win) => win.webContents);
      if (!mainWindow) {
        throw new Error("Janela principal não encontrada");
      }

      // Busca o nome da instância
      const instance = await new Promise((resolve) => {
        db.get("SELECT name FROM instances WHERE id = ?", [instanceId], (err, row) => {
          resolve(row || { name: `WhatsApp ${instanceId}` });
        });
      });

      console.log(`🚀 Iniciando WhatsApp da instância ${instance.name}...`);

      let client = this.clients.get(instanceId);
      if (client && client.pupPage) {
        await this.destroyClientCompletely(instanceId);
      }

      client = this.createClient(instanceId);

      client.removeAllListeners();
      this.setupClientEvents(instanceId, instance.name, client, mainWindow);

      // Inicializa o cliente do WhatsApp
      await client.initialize();

      return { success: true, message: `WhatsApp ${instance.name} inicializado` };
    } catch (error) {
      console.error(`❌ Erro ao inicializar WhatsApp na instância ${instanceId}:`, error);
      return { success: false, message: error.message };
    } finally {
      this.isInitializingMap.set(instanceId, false);
    }
  }

  async stopWhatsApp(instanceId) {
    try {
      await this.destroyClientCompletely(instanceId);
      return { success: true, message: "WhatsApp parado" };
    } catch (error) {
      console.error(`❌ Erro ao parar WhatsApp da instância ${instanceId}:`, error);
      return { success: false, message: error.message };
    }
  }

  getWhatsAppStatus(instanceId) {
    const client = this.clients.get(instanceId);
    if (!client) {
      return { connected: false, status: "not_initialized" };
    }
    return {
      connected: !!client.pupPage,
      status: client.info ? "ready" : "connecting",
    };
  }

  getInstances() {
    return new Promise((resolve, reject) => {
      db.all("SELECT * FROM instances", [], (err, rows) => {
        if (err) {
          console.error("❌ Erro ao buscar instâncias:", err);
          return reject(err);
        }
        resolve(rows || []);
      });
    });
  }

  createInstance(name) {
    return new Promise((resolve, reject) => {
      const id = String(Date.now());
      db.run("INSERT INTO instances (id, name) VALUES (?, ?)", [id, name], function (err) {
        if (err) {
          console.error("❌ Erro ao criar instância:", err);
          return reject(err);
        }
        resolve({ id, name });
      });
    });
  }

  async deleteInstance(id) {
    try {
      // Para o bot se estiver ativo
      await this.destroyClientCompletely(id);

      // Remove do banco de dados
      await new Promise((resolve, reject) => {
        db.run("DELETE FROM instances WHERE id = ?", [id], function (err) {
          if (err) return reject(err);
          resolve();
        });
      });

      // Limpa diretório da sessão correspondente
      const sessionPath = this.getSessionPath(id);
      await this.clearSessionWithRetry(sessionPath);

      return { success: true };
    } catch (error) {
      console.error(`❌ Erro ao remover instância ${id}:`, error);
      throw error;
    }
  }

  renameInstance(id, name) {
    return new Promise((resolve, reject) => {
      db.run("UPDATE instances SET name = ? WHERE id = ?", [name, id], function (err) {
        if (err) {
          console.error(`❌ Erro ao renomear instância ${id}:`, err);
          return reject(err);
        }
        resolve({ success: true });
      });
    });
  }

  setupClientEvents(instanceId, name, client, mainWindow) {
    client.on("qr", async (qr) => {
      try {
        const QRCode = require("qrcode");
        const qrImage = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
        mainWindow.webContents.send("qr-generated", { instanceId, qrImage, qrText: qr });
        console.log(`[${name}] 📱 QR Code gerado e enviado para a interface`);
      } catch (err) {
        console.error(`[${name}] ❌ Erro ao gerar QR Code:`, err);
        mainWindow.webContents.send("error", { instanceId, message: "Erro ao gerar QR Code" });
      }
    });

    client.on("ready", () => {
      console.log(`[${name}] ✅ WhatsApp pronto!`);
      mainWindow.webContents.send("whatsapp-ready", { instanceId, message: "WhatsApp conectado!" });
    });

    client.on("authenticated", () => {
      console.log(`[${name}] ✅ WhatsApp autenticado!`);
      mainWindow.webContents.send("whatsapp-authenticated", { instanceId, message: "Autenticado!" });
    });

    client.on("auth_failure", async (msg) => {
      console.error(`[${name}] ❌ Falha na autenticação:`, msg);
      mainWindow.webContents.send("error", { instanceId, message: `Falha na autenticação: ${msg}` });
    });

    client.on("disconnected", async (reason) => {
      console.log(`[${name}] 🔌 WhatsApp desconectado: ${reason}`);
      mainWindow.webContents.send("whatsapp-disconnected", { instanceId, reason });
      
      if (reason === "LOGOUT" || reason === "UNPAIRED") {
        try {
          await this.destroyClientCompletely(instanceId);
          const sessionPath = this.getSessionPath(instanceId);
          await this.clearSessionWithRetry(sessionPath);
        } catch (error) {
          console.error(`[${name}] ❌ Erro ao limpar sessão após logout:`, error);
        }
      }
    });

    client.on("loading_screen", (percent, message) => {
      console.log(`[${name}] ⏳ Carregando WhatsApp Web: ${percent}% - ${message}`);
      mainWindow.webContents.send("whatsapp-loading", { instanceId, percent, message });
    });

    client.on("message", async (msg) => {
      try {
        if (msg.fromMe) return;
        const { handleIncomingMessage } = require("../../client/flowExecutor");
        await handleIncomingMessage(msg, client);
      } catch (err) {
        console.error(`[${name}] ❌ Erro no processador de fluxos de mensagens: ${err.message}`);
      }
    });
  }
}

module.exports = WhatsAppHandlers;
