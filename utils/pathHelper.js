const { app } = require("electron");
const path = require("path");
const fs = require("fs");

class PathHelper {
  constructor() {
    this.isPackaged = app ? app.isPackaged : false;
  }

  // Retorna o caminho correto para arquivos de recursos
  getResourcePath(relativePath = "") {
    if (this.isPackaged) {
      // Quando empacotado, usar process.resourcesPath
      return path.join(process.resourcesPath, relativePath);
    } else {
      // Durante desenvolvimento, usar __dirname do projeto
      return path.join(process.cwd(), relativePath);
    }
  }

  // Retorna o caminho correto para dados do usuário (sessões, banco, etc)
  getUserDataPath(subDir = "") {
    let userDataPath;

    if (app) {
      userDataPath = app.getPath("userData");
    } else {
      // Fallback se app não estiver disponível
      userDataPath = path.join(require("os").homedir(), ".whatsapp-bot");
    }

    const fullPath = subDir ? path.join(userDataPath, subDir) : userDataPath;

    // Criar diretório se não existir
    this.ensureDirectoryExists(fullPath);

    return fullPath;
  }

  // Garante que um diretório existe
  ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  // Caminhos específicos da aplicação
  getSessionPath() {
    return this.getUserDataPath("whatsapp-session");
  }

  getDatabasePath() {
    return path.join(this.getUserDataPath(), "bot.db");
  }

  getConfigPath() {
    return path.join(this.getUserDataPath(), "config");
  }

  getLogsPath() {
    return this.getUserDataPath("logs");
  }
}

// Singleton
const pathHelper = new PathHelper();

module.exports = pathHelper;
