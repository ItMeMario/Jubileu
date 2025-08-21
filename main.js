const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const pathHelper = require("./utils/pathHelper");

// Importar funções da janela de config
const {
  createConfigWindow,
  closeConfigWindow,
  getConfigWindow,
} = require("./renderer/configWindow");

let mainWindow;
let client;
let startScout;
let messageHandler;
let initializeAllConfigs;
let initializeApp;

// Carrega os módulos após o app estar pronto
function loadModules() {
  try {
    const clientModule = require("./client/client");
    client = clientModule.client;
    startScout = clientModule.startScout;

    messageHandler = require("./handlers/message");
    const { initializeAllConfigs: initConfigs } = require("./utils/initialize");
    initializeAllConfigs = initConfigs;
    const {
      initializeApp: initApp,
    } = require("./controllers/configController");
    initializeApp = initApp;
  } catch (error) {
    console.error("Erro ao carregar módulos:", error);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "renderer/preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, "assets/icon.png"), // Adicione um ícone se tiver
  });

  // Caminho correto para o HTML
  const htmlPath = pathHelper.isPackaged
    ? path.join(__dirname, "renderer/index.html")
    : path.join(__dirname, "renderer/index.html");

  mainWindow.loadFile(htmlPath);

  // Remove menu bar em produção
  if (pathHelper.isPackaged) {
    mainWindow.setMenuBarVisibility(false);
  }
}

app.whenReady().then(async () => {
  // Carrega os módulos após o app estar pronto
  loadModules();

  // Inicializa as configurações de caminhos
  try {
    if (initializeAllConfigs) {
      await initializeAllConfigs();
    }
  } catch (error) {
    console.error("Erro na inicialização:", error);
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", async () => {
  if (process.platform !== "darwin") {
    // Cleanup do cliente antes de sair
    if (client) {
      try {
        if (client.pupPage) {
          await client.destroy();
        }
      } catch (error) {
        console.error("Erro ao destruir cliente:", error.message);
      }
    }
    app.quit();
  }
});

// =========================
// Eventos IPC do frontend
// =========================

// --- WhatsApp ---
ipcMain.handle("start-whatsapp", async () => {
  try {
    if (!client || !startScout || !messageHandler) {
      throw new Error("Módulos não carregados corretamente");
    }

    // Remove listeners antigos para evitar duplicação
    client.removeAllListeners();

    client.on("qr", async (qr) => {
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
    await client.initialize();

    return { success: true, message: "WhatsApp inicializado" };
  } catch (error) {
    console.error("Erro ao inicializar WhatsApp:", error);
    return {
      success: false,
      message: "Erro ao inicializar WhatsApp: " + error.message,
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

// --- Configurações ---
ipcMain.handle("open-config", async () => {
  try {
    console.log("Abrindo configurações...");
    let win = getConfigWindow();
    if (!win) {
      win = createConfigWindow();
    } else {
      win.focus();
    }
    return { success: true, message: "Janela de configurações aberta" };
  } catch (error) {
    console.error("Erro ao abrir configurações:", error);
    return {
      success: false,
      message: "Erro ao abrir configurações: " + error.message,
    };
  }
});

ipcMain.handle("config-close-window", async () => {
  try {
    closeConfigWindow();
    return { success: true, message: "Janela de configurações fechada" };
  } catch (error) {
    console.error("Erro ao fechar configurações:", error);
    return {
      success: false,
      message: "Erro ao fechar configurações: " + error.message,
    };
  }
});

// =========================
// Handlers de Mensagens (CRUD) - VERSÃO CORRIGIDA
// =========================
ipcMain.handle("config-get-messages", async () => {
  try {
    const { handleListMessagesGUI } = require("./controllers/messageController");
    return await handleListMessagesGUI();
  } catch (error) {
    console.error("Erro em config-get-messages:", error);
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle("config-add-message", async (_, messageData) => {
  try {
    const { handleAddMessageGUI } = require("./controllers/messageController");
    return await handleAddMessageGUI(messageData);
  } catch (error) {
    console.error("Erro em config-add-message:", error);
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle("config-update-message", async (_, id, messageData) => {
  try {
    const { handleEditMessageGUI } = require("./controllers/messageController");
    return await handleEditMessageGUI(id, messageData);
  } catch (error) {
    console.error("Erro em config-update-message:", error);
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle("config-delete-message", async (_, id) => {
  try {
    const { handleDeleteMessageGUI } = require("./controllers/messageController");
    return await handleDeleteMessageGUI(id);
  } catch (error) {
    console.error("Erro em config-delete-message:", error);
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle("config-get-last-message", async () => {
  try {
    const { handleShowLastMessageGUI } = require("./controllers/messageController");
    return await handleShowLastMessageGUI();
  } catch (error) {
    console.error("Erro em config-get-last-message:", error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Handler para obter tipos de mensagem e locales disponíveis
ipcMain.handle("config-get-available-options", async () => {
  try {
    const { getAvailableOptionsGUI } = require("./controllers/messageController");
    return await getAvailableOptionsGUI();
  } catch (error) {
    console.error("Erro em config-get-available-options:", error);
    return {
      success: false,
      error: error.message
    };
  }
});