const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { client, startScout } = require("./client/client");
const messageHandler = require("./handlers/message");
const { initializeAllConfigs } = require("./utils/initialize");
const { initializeApp } = require("./controllers/configController");

function createWindow() {
  const win = new BrowserWindow({
    width: 400,
    height: 300,
    webPreferences: {
      preload: path.join(__dirname, "renderer/renderer.js"),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile("renderer/index.html");
}

app.whenReady().then(createWindow);

// Eventos IPC do frontend
ipcMain.on("start-qrcode", async (event) => {
  await initializeAllConfigs();
  client.on("qr", (qr) => {
    event.reply("qr-generated", qr); // envia QR para frontend
  });
  client.on("ready", () => {
    event.reply("client-ready", "WhatsApp conectado!");
  });
  client.on("message", messageHandler);

  startScout(client);
  client.initialize();
});

ipcMain.on("open-config", async (event) => {
  await initializeApp();
  event.reply("config-opened", "Configurações abertas no console.");
});
