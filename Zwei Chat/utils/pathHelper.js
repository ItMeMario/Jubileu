// utils/pathHelper.js
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
      return path.join(process.resourcesPath, relativePath);
    } else {
      return path.join(process.cwd(), relativePath);
    }
  }

  // Retorna o caminho correto para dados do usuário
  getUserDataPath(subDir = "") {
    let userDataPath;

    if (app) {
      userDataPath = app.getPath("userData");
    } else {
      userDataPath = path.join(require("os").homedir(), ".zwei-chat");
    }

    const fullPath = subDir ? path.join(userDataPath, subDir) : userDataPath;
    this.ensureDirectoryExists(fullPath);
    return fullPath;
  }

  ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  getSessionPath() {
    return this.getUserDataPath("whatsapp-session");
  }

  getDatabasePath() {
    return path.join(this.getUserDataPath(), "system.db");
  }

  getLogsPath() {
    return this.getUserDataPath("logs");
  }
}

const pathHelper = new PathHelper();
module.exports = pathHelper;
