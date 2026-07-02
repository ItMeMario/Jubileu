// utils/processCleanup.js
const { execSync } = require("child_process");

async function safeDestroyClient(client, label = "unknown", timeoutMs = 8000) {
  if (!client) return;

  let browserPid = null;
  try {
    if (client.pupBrowser) {
      const browserProcess = client.pupBrowser.process();
      if (browserProcess) {
        browserPid = browserProcess.pid;
      }
    }
  } catch (e) {
    // Silencioso
  }

  // Tenta destroy gracioso
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
    try {
      process.kill(browserPid, "SIGKILL");
      console.log(`🔪 [${label}] Processo ${browserPid} encerrado via SIGKILL`);
    } catch (e) {
      if (e.code !== "ESRCH") {
        console.warn(`⚠️ [${label}] Falha ao matar processo ${browserPid}: ${e.message}`);
      }
    }
  }
}

function killOrphanedChromiumProcesses() {
  if (process.platform !== "win32") return;
  const currentPid = process.pid;
  try {
    execSync(`taskkill /F /T /PID ${currentPid} 2>nul`, {
      stdio: "ignore",
      timeout: 5000,
    });
  } catch (e) {
    // Ignora
  }
}

module.exports = {
  safeDestroyClient,
  killOrphanedChromiumProcesses,
};
