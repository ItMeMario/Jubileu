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
                        // Se houver erro (ex: conflito), retorna falha
                        resolve({ success: false, message: "Erro no git pull: " + error.message });
                        return;
                    }
                    
                    console.log("Git pull output:", stdout);

                    // Verifica se o arquivo realmente mudou
                    const packagePath = require.resolve("../../package.json");
                    delete require.cache[packagePath]; // Limpa cache para ler o arquivo do disco
                    const newLocalPackage = require("../../package.json");
                    
                    // Se o output diz "Already up to date" mas a versão é antiga, é porque o usuário alterou o arquivo manualmente
                    // ou o commit local já é o mais atual.
                    if (stdout.includes("Already up to date")) {
                        // Compara com a remota novamente (ou checa se mudou em relação ao que sabíamos)
                        // Para simplificar, verificamos se a versão agora é igual à remota (precisaríamos buscar a remota de novo ou confiar no reload)
                        
                        // Busca remota para ter certeza
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

                    resolve({ success: true, message: "Atualizado com sucesso! Reinicie o aplicativo para aplicar as mudanças." });
                });
            });
        } else {
            console.log("Not a git repository. Running in production/packaged mode.");
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
      // Adiciona timestamp para evitar cache de requisição
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
      
      // Limpa cache do package.json local antes de ler
      const packagePath = require.resolve("../../package.json");
      delete require.cache[packagePath];
      this.localPackage = require("../../package.json"); // Recarrega
      
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
