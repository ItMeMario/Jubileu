// config/firebaseConfig.js
const fs = require("fs");
const path = require("path");

// Configuração oficial do Firebase para o Zwei Chat
const defaultFirebaseConfig = {
  apiKey: "AIzaSyDSwWT2P5vI4roRMe0OUgv7StgI1GkWqzo",
  authDomain: "zwei-chat-c9d1f.firebaseapp.com",
  projectId: "zwei-chat-c9d1f",
  storageBucket: "zwei-chat-c9d1f.firebasestorage.app",
  messagingSenderId: "96312421890",
  appId: "1:96312421890:web:5b59b1c683d82c8325c11b"
};

/**
 * Obtém o caminho para o arquivo de configuração personalizado do Firebase
 */
function getCustomConfigPath() {
  try {
    const { app } = require("electron");
    if (app && app.isPackaged) {
      return path.join(app.getPath("userData"), "data", "firebase-config.json");
    }
  } catch (e) {}

  return path.join(__dirname, "../data/firebase-config.json");
}

/**
 * Carrega a configuração do Firebase (do arquivo personalizado ou padrão)
 */
function loadFirebaseConfig() {
  const customPath = getCustomConfigPath();

  try {
    if (fs.existsSync(customPath)) {
      const fileData = fs.readFileSync(customPath, "utf-8");
      const parsed = JSON.parse(fileData);
      if (parsed && parsed.apiKey && !parsed.apiKey.includes("YOUR_API_KEY")) {
        return {
          ...parsed,
          isConfigured: true
        };
      }
    }
  } catch (error) {
    console.warn("⚠️ Não foi possível ler firebase-config.json personalizado:", error.message);
  }

  // Verifica se o default foi alterado diretamente neste arquivo
  const isConfigured = defaultFirebaseConfig.apiKey && !defaultFirebaseConfig.apiKey.includes("YOUR_API_KEY");

  return {
    ...defaultFirebaseConfig,
    isConfigured
  };
}

/**
 * Salva uma nova configuração do Firebase no arquivo local
 */
function saveFirebaseConfig(config) {
  const customPath = getCustomConfigPath();
  const dir = path.dirname(customPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(customPath, JSON.stringify(config, null, 2), "utf-8");
  console.log("💾 Configuração do Firebase salva em:", customPath);
}

module.exports = {
  loadFirebaseConfig,
  saveFirebaseConfig,
  getCustomConfigPath,
  defaultFirebaseConfig
};
