// main/consoleRedirect.js
const { BrowserWindow, app } = require("electron");
const path = require("path");
const fs = require("fs");

class ConsoleRedirect {
  static setup() {
    // Armazena as funções originais
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    // Configura o arquivo de log físico
    let logStream = null;
    try {
      const userDataPath = app.getPath("userData");
      const logsDir = path.join(userDataPath, "logs");
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      const logFile = path.join(logsDir, "main.log");
      // Abre em modo append
      logStream = fs.createWriteStream(logFile, { flags: "a" });
      originalLog(`📂 Logs físicos configurados em: ${logFile}`);
    } catch (e) {
      originalError("⚠️ Falha ao inicializar o logger em arquivo:", e);
    }

    // Função para escrever em arquivo
    function logToFile(level, ...args) {
      if (logStream) {
        try {
          const timestamp = new Date().toISOString();
          const message = args
            .map((arg) =>
              typeof arg === "object" ? JSON.stringify(arg) : String(arg)
            )
            .join(" ");
          logStream.write(`[${timestamp}] [${level.toUpperCase()}] ${message}\n`);
        } catch (error) {
          // Falha silenciosa
        }
      }
    }

    // Função para enviar para o renderer
    function sendToRenderer(level, ...args) {
      try {
        const mainWindow = BrowserWindow.getAllWindows()[0];

        if (mainWindow && !mainWindow.isDestroyed()) {
          let message = args
            .map((arg) =>
              typeof arg === "object" ? JSON.stringify(arg) : String(arg)
            )
            .join(" ");

          const MAX_LENGTH = 1000;
          if (message.length > MAX_LENGTH) {
            message = message.substring(0, MAX_LENGTH) + ` ... [TRUNCATED, total ${message.length} chars]`;
          }

          mainWindow.webContents.send("console-message", {
            level,
            message,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        // Falha silenciosa se não conseguir enviar
      }
    }

    // Sobrescreve console.log
    console.log = function (...args) {
      originalLog.apply(console, args);
      logToFile("info", ...args);
      sendToRenderer("log", ...args);
    };

    // Sobrescreve console.error
    console.error = function (...args) {
      originalError.apply(console, args);
      logToFile("error", ...args);
      sendToRenderer("error", ...args);
    };

    // Sobrescreve console.warn
    console.warn = function (...args) {
      originalWarn.apply(console, args);
      logToFile("warn", ...args);
      sendToRenderer("warn", ...args);
    };

    // Sobrescreve console.info
    console.info = function (...args) {
      originalInfo.apply(console, args);
      logToFile("info", ...args);
      sendToRenderer("info", ...args);
    };

    console.log(
      "🔧 Console redirect configurado - logs aparecerão nas DevTools e em main.log"
    );
  }

  static disable() {
    // Se precisar desabilitar no futuro, implementar restauração das funções originais
  }
}

module.exports = ConsoleRedirect;
