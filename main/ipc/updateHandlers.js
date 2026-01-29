const { app, shell } = require("electron");
const https = require("https");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
// const { autoUpdater } = require("electron-updater"); // Optional: for production builds if configured

class UpdateHandlers {
  constructor() {
    this.localPackage = require("../../package.json");
    this.remotePackageUrl = "https://raw.githubusercontent.com/ItMeMario/Jubileu/develop/package.json";
  }

  async checkUpdate() {
    try {
      console.log("Checking for updates...");
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

  async triggerUpdate() {
    try {
        const isGitRepo = fs.existsSync(path.join(app.getAppPath(), ".git")) || 
                          fs.existsSync(path.join(process.cwd(), ".git")); // Check if running from source with git

        if (isGitRepo) {
            console.log("Git repository detected. Attempting git pull...");
            return new Promise((resolve) => {
                exec("git pull", { cwd: process.cwd() }, (error, stdout, stderr) => {
                    if (error) {
                        console.error("Git pull error:", error);
                        resolve({ success: false, message: "Erro no git pull: " + error.message });
                        return;
                    }
                    console.log("Git pull output:", stdout);
                    resolve({ success: true, message: "Atualizado com sucesso! Reinicie o aplicativo." });
                });
            });
        } else {
            console.log("Not a git repository. Running in production/packaged mode.");
            // In a real production scenario without auto-updater configured properly, we might just direct them to the release page.
            // Or if autoUpdater is meant to be used:
            // autoUpdater.checkForUpdatesAndNotify();
            // But since the user asked to check package.json specifically, I will implement a "download" instruction or link.
            
            // However, the prompt says "se tiver diferença ele atualiza". 
            // If I can't update locally (packaged app is immutable usually), I should probably tell the user to download.
            // OR maybe this "environment electron" implies they have a mechanism.
            // Let's assume for now we guide them to the repo if we can't hot-swap.
            
            // BUT, if the user really wants an "update" button that works, maybe they are using a portable version or expect an installer download.
            // For now, I'll return a message directing to GitHub releases as a fallback.
            
           return { 
                success: true, 
                message: "Ambiente de produção detectado. Por favor, baixe a nova versão no GitHub.",
                action: "open_url",
                url: "https://github.com/ItMeMario/Jubileu/releases"
            };
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
      https.get(this.remotePackageUrl, (res) => {
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
