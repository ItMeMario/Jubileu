// utils/initializeModules/directoriesIM.js - VERSÃO CORRIGIDA
const fs = require("fs").promises;
const path = require("path");
const { debug } = require("../../services/debugService");

/**
 * 🔧 CORREÇÃO: Função para detectar se está empacotado e obter caminhos corretos
 */
function getAppPaths() {
  let app;

  try {
    // Tenta importar electron
    const electron = require("electron");
    app = electron.app;
  } catch (error) {
    // Se falhar, não está em ambiente Electron (pode ser testes ou CLI)
    app = null;
  }

  // Se está empacotado pelo Electron
  if (app && app.isPackaged) {
    const userDataPath = app.getPath("userData");
    console.log("📦 Aplicação EMPACOTADA detectada");
    console.log("📂 userData Path:", userDataPath);

    return {
      DATA_DIR: path.join(userDataPath, "data"),
      DATABASE_DIR: path.join(userDataPath, "data", "database"),
      AUDIO_DIR: path.join(userDataPath, "data", "audio"),
      isPackaged: true,
    };
  }

  // Desenvolvimento ou CLI
  console.log("🔧 Aplicação em DESENVOLVIMENTO detectada");
  const DATA_DIR = path.join(__dirname, "../../data");
  console.log("📂 DATA_DIR:", DATA_DIR);

  return {
    DATA_DIR,
    DATABASE_DIR: path.join(DATA_DIR, "database"),
    AUDIO_DIR: path.join(DATA_DIR, "audio"),
    isPackaged: false,
  };
}

// Obtém os caminhos
const paths = getAppPaths();
const DATA_DIR = paths.DATA_DIR;
const DATABASE_DIR = paths.DATABASE_DIR;
const AUDIO_DIR = paths.AUDIO_DIR;
const DATABASE_PATH = path.join(DATABASE_DIR, "system.db");

// Log para debug (ajuda a diagnosticar problemas)
console.log("\n📂 ===== CAMINHOS DA APLICAÇÃO =====");
console.log("   DATA_DIR:", DATA_DIR);
console.log("   DATABASE_DIR:", DATABASE_DIR);
console.log("   AUDIO_DIR:", AUDIO_DIR);
console.log("   DATABASE_PATH:", DATABASE_PATH);
console.log("   Empacotado:", paths.isPackaged);
console.log("=====================================\n");

/**
 * Garante que o diretório de dados existe
 */
async function ensureDataDirectory() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    console.log(`✅ Pasta data criada/verificada: ${DATA_DIR}`);
  } catch (error) {
    console.error("❌ Erro ao criar diretório data:", error);
    throw error;
  }
}

/**
 * Garante que o diretório de banco de dados existe
 */
async function ensureDatabaseDirectory() {
  try {
    await fs.mkdir(DATABASE_DIR, { recursive: true });
    console.log(`✅ Pasta database criada/verificada: ${DATABASE_DIR}`);
  } catch (error) {
    console.error("❌ Erro ao criar diretório database:", error);
    throw error;
  }
}

/**
 * Garante que o diretório de áudio existe
 */
async function ensureAudioDirectory() {
  try {
    await fs.mkdir(AUDIO_DIR, { recursive: true });
    console.log(`✅ Pasta audio criada/verificada: ${AUDIO_DIR}`);
  } catch (error) {
    console.error("❌ Erro ao criar diretório audio:", error);
    throw error;
  }
}

/**
 * Inicializa todos os diretórios necessários
 */
async function initializeDirectories() {
  await debug("📁 Inicializando diretórios do sistema...");

  try {
    await ensureDataDirectory();
    await ensureDatabaseDirectory();
    await ensureAudioDirectory();
    await debug("✅ Todos os diretórios foram criados/verificados com sucesso");
    return true;
  } catch (error) {
    console.error("❌ Erro ao inicializar diretórios:", error);
    throw error;
  }
}

module.exports = {
  getAppPaths,
  ensureDataDirectory,
  ensureDatabaseDirectory,
  ensureAudioDirectory,
  initializeDirectories,
  DATA_DIR,
  DATABASE_DIR,
  AUDIO_DIR,
  DATABASE_PATH,
  paths,
};
