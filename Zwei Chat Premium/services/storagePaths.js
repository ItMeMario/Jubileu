// services/storagePaths.js
// Gerenciador Central de Caminhos de Armazenamento e Persistência do Zwei Chat Premium
// Garante compatibilidade total entre Desenvolvimento (local) e Produção (Windows AppData / ASAR safe)

const path = require("path");
const fs = require("fs");

let electronApp = null;
try {
  const electron = require("electron");
  electronApp = electron?.app || (electron?.remote ? electron.remote.app : null);
} catch (e) {
  electronApp = null;
}

class StoragePathsService {
  constructor() {
    this._userDataDir = null;
    this._dataDir = null;
    this._envPath = null;
  }

  /**
   * Determina se o app está em execução empacotada (produção ASAR / instalador)
   * @returns {boolean}
   */
  isPackaged() {
    if (electronApp && typeof electronApp.isPackaged === "boolean") {
      return electronApp.isPackaged;
    }
    // Fallback: se estiver rodando a partir de app.asar ou build-protected
    return (
      __dirname.includes("app.asar") ||
      (process.mainModule && process.mainModule.filename && process.mainModule.filename.includes("app.asar"))
    );
  }

  /**
   * Obtém o diretório raiz de dados do usuário (AppData/Roaming no Windows em produção)
   * @returns {string}
   */
  getUserDataDir() {
    if (this._userDataDir) return this._userDataDir;

    if (this.isPackaged() && electronApp && typeof electronApp.getPath === "function") {
      this._userDataDir = electronApp.getPath("userData");
    } else if (this.isPackaged() && process.env.APPDATA) {
      this._userDataDir = path.join(process.env.APPDATA, "zwei-chat-premium");
    } else {
      // Modo de desenvolvimento: pasta raiz do projeto
      this._userDataDir = path.resolve(__dirname, "..");
    }

    if (!fs.existsSync(this._userDataDir)) {
      try {
        fs.mkdirSync(this._userDataDir, { recursive: true });
      } catch (e) {
        console.warn("⚠️ Não foi possível criar userDataDir:", e.message);
      }
    }

    return this._userDataDir;
  }

  /**
   * Obtém o diretório data/ seguro para escrita
   * @returns {string}
   */
  getDataDir() {
    if (this._dataDir) return this._dataDir;

    if (this.isPackaged()) {
      this._dataDir = path.join(this.getUserDataDir(), "data");
    } else {
      this._dataDir = path.resolve(__dirname, "../data");
    }

    if (!fs.existsSync(this._dataDir)) {
      try {
        fs.mkdirSync(this._dataDir, { recursive: true });
      } catch (e) {
        console.warn("⚠️ Não foi possível criar dataDir:", e.message);
      }
    }

    return this._dataDir;
  }

  /**
   * Obtém o caminho completo para um arquivo JSON dentro de data/
   * @param {string} filename - Nome do arquivo (ex: "interactive_flows.json")
   * @returns {string}
   */
  getDataPath(filename) {
    const dir = this.getDataDir();
    return path.join(dir, filename);
  }

  /**
   * Obtém o caminho do arquivo .env seguro para leitura e escrita
   * @returns {string}
   */
  getEnvPath() {
    if (this._envPath) return this._envPath;

    if (this.isPackaged()) {
      this._envPath = path.join(this.getUserDataDir(), ".env");
    } else {
      this._envPath = path.resolve(__dirname, "../.env");
    }

    return this._envPath;
  }

  /**
   * Inicializa e valida todos os diretórios essenciais
   */
  initialize() {
    this.getUserDataDir();
    this.getDataDir();
    this.getEnvPath();
  }
}

const storagePaths = new StoragePathsService();
module.exports = { storagePaths, StoragePathsService };
