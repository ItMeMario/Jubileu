// services/debugService.js - VERSÃO CORRIGIDA
const fs = require("fs").promises;
const path = require("path");

// 🔧 CORREÇÃO: Função para obter caminho correto
function getConfigPath() {
  let app;

  try {
    const electron = require("electron");
    app = electron.app;
  } catch (error) {
    app = null;
  }

  if (app && app.isPackaged) {
    const userDataPath = app.getPath("userData");
    return path.join(userDataPath, "data", "devMode.json");
  }

  return path.join(__dirname, "../data/devMode.json");
}

const CONFIG_FILE = getConfigPath();

console.log("📂 debugService.js - Caminho do config:", CONFIG_FILE);

async function debug(...args) {
  try {
    const data = await fs.readFile(CONFIG_FILE, "utf8");
    const config = JSON.parse(data);

    if (config.debugEnabled === true) {
      console.log("[DEBUG]", ...args);
    }
  } catch (error) {
    // Se não conseguir ler o arquivo, não mostra debug
  }
}

async function toggleDebugMode() {
  try {
    const data = await fs.readFile(CONFIG_FILE, "utf8");
    const config = JSON.parse(data);

    config.debugEnabled = !config.debugEnabled;
    config.lastDebugChanged = new Date().toISOString();

    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));

    return { success: true, debugEnabled: config.debugEnabled };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getDebugStatus() {
  try {
    const data = await fs.readFile(CONFIG_FILE, "utf8");
    const config = JSON.parse(data);
    return {
      debugEnabled: config.debugEnabled || false,
      lastDebugChanged: config.lastDebugChanged || null,
    };
  } catch (error) {
    return { debugEnabled: false, lastDebugChanged: null };
  }
}

module.exports = {
  debug,
  toggleDebugMode,
  getDebugStatus,
};
