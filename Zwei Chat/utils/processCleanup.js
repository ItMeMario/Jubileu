// utils/processCleanup.js
const { execSync, execFile } = require("child_process");
const { promisify } = require("util");
const fs = require("fs");
const path = require("path");

const execFileAsync = promisify(execFile);

const LOCK_FILES =
  process.platform === "win32"
    ? ["lockfile"]
    : ["SingletonLock", "SingletonCookie", "SingletonSocket"];

function isProcessRunning(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === "EPERM";
  }
}

function killProcessTree(pid, label = "unknown") {
  if (!Number.isInteger(pid) || pid <= 0) return;

  if (process.platform === "win32") {
    try {
      execSync(`taskkill /F /T /PID ${pid} 2>nul`, {
        stdio: "ignore",
        timeout: 5000,
      });
      console.log(`🔪 [${label}] Árvore de processos ${pid} encerrada via taskkill`);
      return;
    } catch (e) {
      // Se o processo já tiver morrido, taskkill retorna erro; confirma antes de logar
      if (!isProcessRunning(pid)) return;
      console.warn(`⚠️ [${label}] Falha no taskkill para PID ${pid}: ${e.message}`);
    }
  }

  try {
    process.kill(pid, "SIGKILL");
    console.log(`🔪 [${label}] Processo ${pid} encerrado via SIGKILL`);
  } catch (e) {
    if (e.code !== "ESRCH") {
      console.warn(`⚠️ [${label}] Falha ao matar processo ${pid}: ${e.message}`);
    }
  }
}

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

  let timeoutId = null;
  // Tenta destroy gracioso
  try {
    const destroyPromise = client.destroy();
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("destroy timeout")), timeoutMs);
    });

    await Promise.race([destroyPromise, timeoutPromise]);
    clearTimeout(timeoutId);

    // Garante que o processo do navegador não ficou preso caso browser.isConnected() fosse false
    if (browserPid && isProcessRunning(browserPid)) {
      killProcessTree(browserPid, label);
    } else {
      console.log(`✅ [${label}] Client destroyed gracefully`);
    }
    return;
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    console.warn(`⚠️ [${label}] Graceful destroy failed: ${error.message}`);
  }

  // Fallback: mata a árvore de processos do navegador pelo PID
  if (browserPid) {
    killProcessTree(browserPid, label);
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

function extractUserDataDirFromCommandLine(commandLine) {
  if (!commandLine || typeof commandLine !== "string") return null;
  const match = commandLine.match(/--user-data-dir=(?:"([^"]+)"|'([^']+)'|(\S+))/i);
  if (!match) return null;
  return match[1] || match[2] || match[3] || null;
}

function normalizeWinPath(targetPath) {
  return path.resolve(targetPath).replace(/[\\/]+$/, "").toLowerCase();
}

async function findChromePidsByUserDataDir(userDataDir) {
  if (process.platform !== "win32" || !userDataDir) return [];

  const targetNormalized = normalizeWinPath(userDataDir);
  const psScript = [
    "Get-CimInstance Win32_Process -Filter \"Name = 'chrome.exe'\" |",
    "Where-Object { $_.CommandLine -and $_.CommandLine -like '*--user-data-dir=*' } |",
    "ForEach-Object { \"$($_.ProcessId)|$($_.CommandLine)\" }",
  ].join(" ");

  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", psScript],
      { timeout: 6000, windowsHide: true }
    );

    const pids = [];
    const lines = (stdout || "").split(/\r?\n/);
    for (const line of lines) {
      const sepIdx = line.indexOf("|");
      if (sepIdx <= 0) continue;

      const pid = Number.parseInt(line.slice(0, sepIdx).trim(), 10);
      const cmdLine = line.slice(sepIdx + 1);
      const argDir = extractUserDataDirFromCommandLine(cmdLine);

      if (
        Number.isInteger(pid) &&
        pid > 0 &&
        argDir &&
        normalizeWinPath(argDir) === targetNormalized
      ) {
        pids.push(pid);
      }
    }
    return pids;
  } catch (e) {
    console.warn(`⚠️ Falha ao consultar processos Chrome órfãos: ${e.message}`);
    return [];
  }
}

async function ensureSessionUnlocked(userDataDir, label = "session") {
  if (!userDataDir) {
    return { hadLock: false, killedPids: [], lockRemoved: false };
  }

  const resolvedDir = path.resolve(userDataDir);
  const existingLocks = LOCK_FILES.map((name) => path.join(resolvedDir, name)).filter(
    (lockPath) => fs.existsSync(lockPath)
  );

  if (existingLocks.length === 0) {
    return { hadLock: false, killedPids: [], lockRemoved: false };
  }

  console.log(`🔓 [${label}] Lock residual detectado em ${resolvedDir}. Verificando processos órfãos...`);

  const killedPids = [];
  if (process.platform === "win32") {
    const pids = await findChromePidsByUserDataDir(resolvedDir);
    for (const pid of pids) {
      if (isProcessRunning(pid)) {
        killProcessTree(pid, `${label} órfão`);
        killedPids.push(pid);
      }
    }

    if (killedPids.length > 0) {
      // Pequena pausa para o Windows liberar o handle do arquivo após o encerramento do processo
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  let lockRemoved = false;
  for (const lockPath of existingLocks) {
    try {
      await fs.promises.rm(lockPath, { force: true, maxRetries: 4, retryDelay: 200 });
      lockRemoved = true;
      console.log(`✅ [${label}] Lock removido: ${path.basename(lockPath)}`);
    } catch (e) {
      console.warn(`⚠️ [${label}] Não foi possível remover ${lockPath}: ${e.message}`);
    }
  }

  return { hadLock: true, killedPids, lockRemoved };
}

async function cleanupBaseSessionsLocks(baseSessionsPath, label = "service") {
  if (!baseSessionsPath || !fs.existsSync(baseSessionsPath)) return;

  try {
    const entries = await fs.promises.readdir(baseSessionsPath, { withFileTypes: true });
    const sessionDirs = entries
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("session"))
      .map((entry) => path.join(baseSessionsPath, entry.name));

    await Promise.allSettled(
      sessionDirs.map((dir) => ensureSessionUnlocked(dir, `${label} startup`))
    );
  } catch (e) {
    console.warn(`⚠️ [${label}] Erro ao verificar locks residuais em ${baseSessionsPath}: ${e.message}`);
  }
}

module.exports = {
  safeDestroyClient,
  killOrphanedChromiumProcesses,
  ensureSessionUnlocked,
  cleanupBaseSessionsLocks,
};
