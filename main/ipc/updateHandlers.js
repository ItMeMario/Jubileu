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

                    // Executa npm install para garantir que as dependências estejam atualizadas
                    console.log("Executando npm install...");
                    exec("npm install", { cwd: process.cwd() }, async (installError, installStdout, installStderr) => {
                        if (installError) {
                            console.error("npm install error:", installError);
                            // Não vamos falhar o update inteiro, mas avisar o usuário
                            // Ou falhar? Melhor avisar que o código atualizou mas libs falharam.
                            // Mas para consistência, vamos considerar sucesso parcial ou falha crítica dependendo da preferência.
                            // Aqui vamos considerar erro crítico pois sem deps o app quebra.
                            resolve({ success: false, message: "Erro no npm install: " + installError.message });
                            return;
                        }
                        
                        console.log("npm install output:", installStdout);

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

                        resolve({ success: true, message: "Atualizado e dependências instaladas com sucesso! Reinicie o aplicativo para aplicar as mudanças." });
                    });
                });
            });
        } else {
            console.log("Not a git repository. Using electron-updater.");
            const { autoUpdater } = require("electron-updater");
            
            // Configurar logger (opcional, mas recomendado)
            try {
                const log = require("electron-log");
                log.transports.file.level = "info";
                autoUpdater.logger = log;
            } catch (e) {
                console.log("electron-log not found, using console");
                autoUpdater.logger = console;
            }

            autoUpdater.autoDownload = true;

            return new Promise((resolve) => {
                // Remove listeners anteriores para evitar duplicidade se chamado múltiplas vezes
                autoUpdater.removeAllListeners();

                autoUpdater.on('update-available', (info) => {
                    console.log("Update available:", info);
                    // Opcional: Notificar que o download começou?
                    // Por enquanto, só aguardamos o download.
                });

                autoUpdater.on('update-not-available', (info) => {
                    console.log("Update not available:", info);
                    resolve({ success: true, message: "Você já está na versão mais atual." });
                });

                autoUpdater.on('error', (err) => {
                    console.error("AutoUpdater error:", err);
                    // Se der erro (ex: sem assinatura, net error), resolvemos com erro mas sem quebrar app
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
                    // Pergunta ao usuário ou avisa que vai reiniciar?
                    // A mensagem de retorno será mostrada no frontend.
                    // O quitAndInstall é chamado depois?
                    
                    // O comportamento padrão do 'resolve' aqui retorna para o frontend exibir a msg.
                    // O frontend provavelmente exibe a msg e só.
                    // Precisamos garantir que o app reinicie.
                    
                    // Respondemos sucesso, e o frontend pode recarregar?
                    // Se o frontend só mostra um alerta, o usuário clica OK.
                    // O ideal é chamar quitAndInstall.
                    
                    // Vamos agendar o quitAndInstall para acontecer logo após o resolve, 
                    // ou retornamos uma ação específica se o frontend suportar.
                    
                    // Como o frontend espera { success, message }, vamos mandar isso.
                    // E chamamos quitAndInstall() imediatamente ou com um pequeno delay.
                    
                    setTimeout(() => {
                        autoUpdater.quitAndInstall();
                    }, 3000); // 3 segundos para o usuário ler a mensagem
                    
                    resolve({ success: true, message: "Nova versão baixada! O aplicativo será reiniciado em instantes para aplicar a atualização." });
                });

                // Inicia verificação
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
