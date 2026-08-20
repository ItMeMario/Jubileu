// config/firebaseConfig.js
const fs = require("fs");
const path = require("path");

// Configuração padrão do Firebase (Placeholders para serem preenchidos ou carregados de arquivo)
const defaultFirebaseConfig = {
  apiKey: "AIzaSyYOUR_API_KEY_HERE",
  authDomain: "zwei-chat-app.firebaseapp.com",
  projectId: "zwei-chat-app",
  storageBucket: "zwei-chat-app.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
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
