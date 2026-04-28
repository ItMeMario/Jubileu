const { app, shell } = require("electron");
const https = require("https");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
// const { autoUpdater } = require("electron-updater"); // Optional: for production builds if configured

class UpdateHandlers {
  constructor() {
    this.localPackage = require("../../package.json");
    this.remotePackageUrl = "https://raw.githubusercontent.com/ItMeMario/Jubileu/main/package.json";
  }

  register(ipcMain) {
    ipcMain.handle("check-update", this.checkUpdate.bind(this));
    ipcMain.handle("trigger-update", this.triggerUpdate.bind(this));
  }

  unregister(ipcMain) {
    ipcMain.removeHandler("check-update");
    ipcMain.removeHandler("trigger-update");
  }

  async triggerUpdate() {
    try {
        const isGitRepo = fs.existsSync(path.join(app.getAppPath(), ".git")) || 
                          fs.existsSync(path.join(process.cwd(), ".git")); 

        if (isGitRepo) {
            console.log("Git repository detected. Attempting git pull...");
            return new Promise((resolve) => {
                exec("git pull", { cwd: process.cwd() }, async (error, stdout, stderr) => {
                    if (error) {
                        console.error("Git pull error:", error);
                        resolve({ success: false, message: "Erro no git pull: " + error.message });
                        return;
                    }
                    
                    console.log("Git pull output:", stdout);

                    console.log("Executando npm install...");
                    exec("npm install", { cwd: process.cwd() }, async (installError, installStdout, installStderr) => {
                        if (installError) {
                            console.error("npm install error:", installError);
                            resolve({ success: false, message: "Erro no npm install: " + installError.message });
                            return;
                        }
                        
                        console.log("npm install output:", installStdout);

                        const packagePath = require.resolve("../../package.json");
                        delete require.cache[packagePath];
                        const newLocalPackage = require("../../package.json");
                        
                        if (stdout.includes("Already up to date")) {
                            try {
                                const remotePackage = await this.fetchRemotePackage();
                                if (newLocalPackage.version !== remotePackage.version) {
                                    resolve({ 
                                        success: false, 
                                        message: "O Git informou que já está atualizado, mas a versão local difere da remota.\n\nIsso geralmente acontece se você alterou o package.json manualmente. Desfaça suas alterações locais (git checkout) e tente novamente." 
                                    });
                                    return;
                                }
                            } catch (e) {
                                console.error("Erro ao re-verificar remote:", e);
                            }
                        }

                        resolve({ success: true, message: "Atualizado e dependências instaladas com sucesso! Reinicie o aplicativo para aplicar as mudanças." });
                    });
                });
            });
        } else {
            console.log("Not a git repository. Using electron-updater.");
            const { autoUpdater } = require("electron-updater");
            
            try {
                const log = require("electron-log");
                log.transports.file.level = "info";
                autoUpdater.logger = log;
            } catch (e) {
                console.log("electron-log not found, using console");
                autoUpdater.logger = console;
            }

            autoUpdater.autoDownload = true;
            autoUpdater.autoInstallOnAppQuit = true;

            return new Promise((resolve) => {
                autoUpdater.removeAllListeners();

                autoUpdater.on('update-available', (info) => {
                    console.log("Update available:", info);
                });

                autoUpdater.on('update-not-available', (info) => {
                    console.log("Update not available:", info);
                    resolve({ success: true, message: "Você já está na versão mais atual." });
                });

                autoUpdater.on('error', (err) => {
                    console.error("AutoUpdater error:", err);
                    resolve({ success: false, message: "Erro na atualização automática: " + (err.message || err) });
                });

                autoUpdater.on('download-progress', (progressObj) => {
                    let log_message = "Download speed: " + progressObj.bytesPerSecond;
                    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
                    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
                    console.log(log_message);
                });

                autoUpdater.once('update-downloaded', (info) => {
                    console.log("Update downloaded");
                    
                    setTimeout(() => {
                        autoUpdater.quitAndInstall();
                    }, 3000); // 3 segundos para o usuário ler a mensagem
                    
                    resolve({ success: true, message: "Nova versão baixada! O aplicativo será reiniciado em instantes para aplicar a atualização." });
                });

                autoUpdater.checkForUpdates().catch(err => {
                     resolve({ success: false, message: "Erro ao verificar atualizações: " + err.message });
                });
            });
        }
    } catch (error) {
      console.error("Error triggering update:", error);
      return {
        success: false,
        message: "Erro ao iniciar atualização: " + error.message
      };
    }
  }

  fetchRemotePackage() {
    return new Promise((resolve, reject) => {
      const url = `${this.remotePackageUrl}?t=${Date.now()}`;
      https.get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to fetch package.json: ${res.statusCode}`));
          return;
        }

        let data = "";
        res.on("data", (chunk) => data += chunk);
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }).on("error", (e) => reject(e));
    });
  }

  async checkUpdate() {
    try {
      console.log("Checking for updates...");
      
      const isGitRepo = fs.existsSync(path.join(app.getAppPath(), ".git")) || 
                        fs.existsSync(path.join(process.cwd(), ".git")); 

      if (!isGitRepo) {
        // Usa electron-updater para checar de verdade se há uma release
        const { autoUpdater } = require("electron-updater");
        autoUpdater.autoDownload = false; // Apenas verifica
        
        return new Promise((resolve) => {
            autoUpdater.removeAllListeners();

            autoUpdater.once('update-available', (info) => {
                const remoteVersion = info.version;
                resolve({
                    success: true,
                    hasUpdate: true,
                    localVersion: app.getVersion(),
                    remoteVersion: remoteVersion,
                    message: `Nova versão ${remoteVersion} disponível!`
                });
            });

            autoUpdater.once('update-not-available', (info) => {
                resolve({
                    success: true,
                    hasUpdate: false,
                    localVersion: app.getVersion(),
                    remoteVersion: info.version,
                    message: "Você já está na versão mais atual."
                });
            });

            autoUpdater.once('error', (err) => {
                // Falha silenciosa no check e faz fallback fallback ou retorna erro tratado
                console.error("AutoUpdater check error:", err);
                resolve({
                    success: false,
                    message: "Erro ao verificar atualizações: " + (err.message || err)
                });
            });

            autoUpdater.checkForUpdates().catch(err => {
                resolve({ success: false, message: "Erro ao verificar atualizações: " + err.message });
            });
        });
      }

      // Fallback para desenvolvimento (Git): verifica o package.json no github
      const packagePath = require.resolve("../../package.json");
      delete require.cache[packagePath];
      this.localPackage = require("../../package.json"); 
      
      const remotePackage = await this.fetchRemotePackage();
      
      const localVersion = this.localPackage.version;
      const remoteVersion = remotePackage.version;

      console.log(`Local version: ${localVersion}, Remote version: ${remoteVersion}`);

      const hasUpdate = this.compareVersions(localVersion, remoteVersion) < 0;

      return {
        success: true,
        hasUpdate,
        localVersion,
        remoteVersion,
        message: hasUpdate ? `Nova versão ${remoteVersion} disponível!` : "Você já está na versão mais atual."
      };
    } catch (error) {
      console.error("Error checking update:", error);
      return {
        success: false,
        message: "Erro ao verificar atualizações: " + error.message
      };
    }
  }

  compareVersions(v1, v2) {
    const p1 = v1.split('.').map(Number);
    const p2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
        const n1 = p1[i] || 0;
        const n2 = p2[i] || 0;
        if (n1 > n2) return 1;
        if (n1 < n2) return -1;
    }
    return 0;
  }
}

module.exports = UpdateHandlers;
