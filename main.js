const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { client, startScout } = require("./client/client");
const messageHandler = require("./handlers/message");
const { initializeAllConfigs } = require("./utils/initialize");
const { initializeApp } = require("./controllers/configController");
const QRCode = require("qrcode");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "renderer/preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile("renderer/index.html");

  // Abre o DevTools em desenvolvimento (opcional)
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

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

// Eventos IPC do frontend
ipcMain.handle("start-whatsapp", async () => {
  try {
    // Inicializa configurações
    await initializeAllConfigs();

    // Configura os eventos do cliente WhatsApp
    client.removeAllListeners(); // Remove listeners antigos para evitar duplicação

    client.on("qr", async (qr) => {
      try {
        // Gera o QR code como imagem base64
        const qrImage = await QRCode.toDataURL(qr, {
          width: 300,
          margin: 2,
        });

        // Envia para o frontend
        mainWindow.webContents.send("qr-generated", {
          qrImage: qrImage,
          qrText: qr,
        });
      } catch (err) {
        console.error("Erro ao gerar QR Code:", err);
        mainWindow.webContents.send("error", "Erro ao gerar QR Code");
      }
    });

    client.on("ready", () => {
      console.log("WhatsApp conectado!");
      mainWindow.webContents.send(
        "whatsapp-ready",
        "WhatsApp conectado com sucesso!"
      );
    });

    client.on("authenticated", () => {
      mainWindow.webContents.send(
        "whatsapp-authenticated",
        "WhatsApp autenticado!"
      );
    });

    client.on("auth_failure", () => {
      mainWindow.webContents.send("error", "Falha na autenticação do WhatsApp");
    });

    client.on("disconnected", (reason) => {
      mainWindow.webContents.send(
        "whatsapp-disconnected",
        `WhatsApp desconectado: ${reason}`
      );
    });

    client.on("message", messageHandler);

    // Inicia o scout e inicializa o cliente
    startScout(client);
    client.initialize();

    return { success: true, message: "WhatsApp inicializado" };
  } catch (error) {
    console.error("Erro ao inicializar WhatsApp:", error);
    return {
      success: false,
      message: "Erro ao inicializar WhatsApp: " + error.message,
    };
  }
});

ipcMain.handle("open-config", async () => {
  try {
    // Aqui você pode abrir uma nova janela para configurações
    // ou processar as configurações de outra forma
    console.log("Abrindo configurações...");
    return { success: true, message: "Configurações abertas no console" };
  } catch (error) {
    console.error("Erro ao abrir configurações:", error);
    return {
      success: false,
      message: "Erro ao abrir configurações: " + error.message,
    };
  }
});

ipcMain.handle("stop-whatsapp", async () => {
  try {
    if (client) {
      await client.destroy();
    }
    return { success: true, message: "WhatsApp desconectado" };
  } catch (error) {
    console.error("Erro ao parar WhatsApp:", error);
    return {
      success: false,
      message: "Erro ao parar WhatsApp: " + error.message,
    };
  }
});
