// renderer/guiConfig/goatWindow.js
const { BrowserWindow } = require("electron");
const path = require("path");

let goatWindow = null;

function createGoatWindow() {
  console.log("createGoatWindow chamado");
  
  if (goatWindow) {
    console.log("Janela já existe, focando...");
    goatWindow.focus();
    return goatWindow;
  }

  console.log("Criando nova janela Goat...");

  goatWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    modal: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: "Goat",
    resizable: true,
    backgroundColor: "#1a1a1a",
    icon: path.join(__dirname, "../../assets/icon.png"),
  });

  const htmlPath = path.join(__dirname, "../html/goat.html");
  console.log("Carregando HTML:", htmlPath);
  goatWindow.loadFile(htmlPath);

  goatWindow.on("closed", () => {
    console.log("Janela Goat fechada");
    goatWindow = null;
  });

  console.log("Janela Goat criada com sucesso");
  return goatWindow;
}

function getGoatWindow() {
  return goatWindow;
}

function closeGoatWindow() {
  if (goatWindow) {
    goatWindow.close();
  }
}

module.exports = {
  createGoatWindow,
  getGoatWindow,
  closeGoatWindow,
};
