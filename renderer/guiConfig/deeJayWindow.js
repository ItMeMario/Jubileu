// renderer/guiConfig/deeJayWindow.js
const { BrowserWindow } = require("electron");
const path = require("path");

let deeJayWindow = null;

function createDeeJayWindow() {
  console.log("createDeeJayWindow chamado");
  
  if (deeJayWindow) {
    console.log("Janela já existe, focando...");
    deeJayWindow.focus();
    return deeJayWindow;
  }

  console.log("Criando nova janela Dee Jay...");

  deeJayWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    // Removido parent para evitar problemas quando nenhuma janela está focada
    modal: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/deeJayPreload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: "Dee Jay - Troca de Mensagens",
    resizable: true,
    backgroundColor: "#1e1e1e",
    icon: path.join(__dirname, "../../assets/icon.png"),
  });

  // Remove menu bar
  // Menu bar enabled by default


  const htmlPath = path.join(__dirname, "../html/deeJay.html");
  console.log("Carregando HTML:", htmlPath);
  deeJayWindow.loadFile(htmlPath);

  // Abre o DevTools para debug
  // DevTools removido conforme solicitado


  deeJayWindow.on("closed", () => {
    console.log("Janela Dee Jay fechada");
    deeJayWindow = null;
  });

  console.log("Janela Dee Jay criada com sucesso");
  return deeJayWindow;
}

function getDeeJayWindow() {
  return deeJayWindow;
}

function closeDeeJayWindow() {
  if (deeJayWindow) {
    deeJayWindow.close();
  }
}

module.exports = {
  createDeeJayWindow,
  getDeeJayWindow,
  closeDeeJayWindow,
};
