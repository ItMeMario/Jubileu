// renderer/guiConfig/sentinelaWindow.js
const { BrowserWindow } = require("electron");
const path = require("path");

let sentinelaWindow = null;

function createSentinelaWindow() {
  console.log("createSentinelaWindow chamado");
  
  if (sentinelaWindow) {
    console.log("Janela já existe, focando...");
    sentinelaWindow.focus();
    return sentinelaWindow;
  }

  console.log("Criando nova janela Sentinela...");

  sentinelaWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    modal: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/sentinelaPreload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: "Sentinela",
    resizable: true,
    backgroundColor: "#1a1a1a",
    icon: path.join(__dirname, "../../assets/icon.png"),
  });

  const htmlPath = path.join(__dirname, "../html/sentinela.html");
  console.log("Carregando HTML:", htmlPath);
  sentinelaWindow.loadFile(htmlPath);

  sentinelaWindow.on("closed", () => {
    console.log("Janela Sentinela fechada");
    sentinelaWindow = null;
  });

  console.log("Janela Sentinela criada com sucesso");
  return sentinelaWindow;
}

function getSentinelaWindow() {
  return sentinelaWindow;
}

function closeSentinelaWindow() {
  if (sentinelaWindow) {
    sentinelaWindow.close();
  }
}

module.exports = {
  createSentinelaWindow,
  getSentinelaWindow,
  closeSentinelaWindow,
};
