// utils/processCleanup.js
// Utilitário para garantir que processos Chrome/Chromium órfãos sejam encerrados
// durante o cleanup da aplicação (resolve bug do NSIS "Não é possível fechar")

const { execSync } = require("child_process");

/**
 * Tenta destruir um client whatsapp-web.js de forma robusta.
 * 1. Tenta client.destroy() com timeout
 * 2. Se falhar, tenta matar o processo do browser diretamente
 * 
 * @param {Object} client - Cliente whatsapp-web.js
 * @param {string} label - Label para logs (ex: "Instance abc123")
 * @param {number} timeoutMs - Timeout em ms para o destroy (padrão: 8000)
 * @returns {Promise<void>}
 */
async function safeDestroyClient(client, label = "unknown", timeoutMs = 8000) {
    if (!client) return;

    // Captura o PID do browser ANTES de tentar destroy, pois após destroy
    // a referência pode ser perdida
    let browserPid = null;
    try {
        if (client.pupBrowser) {
            const browserProcess = client.pupBrowser.process();
            if (browserProcess) {
                browserPid = browserProcess.pid;
            }
        }
    } catch (e) {
        // Ignora - pode não ter browser
    }

    // Tenta destroy gracioso com timeout
    try {
        const destroyPromise = client.destroy();
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("destroy timeout")), timeoutMs)
        );

        await Promise.race([destroyPromise, timeoutPromise]);
        console.log(`✅ [${label}] Client destroyed gracefully`);
        return;
    } catch (error) {
        console.warn(`⚠️ [${label}] Graceful destroy failed: ${error.message}`);
    }

    // Fallback: tenta matar o processo do browser pelo PID
    if (browserPid) {
        forceKillPid(browserPid, label);
    }
}

/**
 * Força o encerramento de um processo pelo PID (Windows)
 * @param {number} pid - PID do processo
 * @param {string} label - Label para logs
 */
function forceKillPid(pid, label = "") {
    try {
        // /T = mata a árvore de processos filhos
        // /F = força o encerramento
        process.kill(pid, "SIGKILL");
        console.log(`🔪 [${label}] Processo ${pid} encerrado via SIGKILL`);
    } catch (e) {
        // Processo já pode ter terminado
        if (e.code !== "ESRCH") {
            console.warn(`⚠️ [${label}] Falha ao matar processo ${pid}: ${e.message}`);
        }
    }
}

/**
 * Mata todos os processos Chrome/Chromium que são filhos do processo atual.
 * Esta é a "última linha de defesa" executada no final do cleanup.
 * Usa taskkill no Windows para matar por árvore de processo.
 */
function killOrphanedChromiumProcesses() {
    if (process.platform !== "win32") return;

    const currentPid = process.pid;

    try {
        // Usa wmic para encontrar processos chrome.exe cujo ParentProcessId é o nosso
        // ou qualquer filho nosso
        execSync(`taskkill /F /T /PID ${currentPid} 2>nul`, {
            stdio: "ignore",
            timeout: 5000,
        });
    } catch (e) {
        // taskkill pode falhar se os processos já foram encerrados, isso é OK
    }
}

module.exports = {
    safeDestroyClient,
    forceKillPid,
    killOrphanedChromiumProcesses,
};
