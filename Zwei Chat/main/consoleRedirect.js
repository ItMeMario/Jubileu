// main/consoleRedirect.js
const { BrowserWindow } = require("electron");

class ConsoleRedirect {
  static setup() {
    // Armazena as funções originais
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

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
      originalLog.apply(console, args); // Log normal no terminal do processo principal
      sendToRenderer("log", ...args); // Envia para o renderer
    };

    // Sobrescreve console.error
    console.error = function (...args) {
      originalError.apply(console, args);
      sendToRenderer("error", ...args);
    };

    // Sobrescreve console.warn
    console.warn = function (...args) {
      originalWarn.apply(console, args);
      sendToRenderer("warn", ...args);
    };

    // Sobrescreve console.info
    console.info = function (...args) {
      originalInfo.apply(console, args);
      sendToRenderer("info", ...args);
    };

    console.log(
      "🔧 Console redirect configurado - logs aparecerão nas DevTools"
    );
  }

  static disable() {
    // Se precisar desabilitar no futuro, implementar restauração das funções originais
  }
}

module.exports = ConsoleRedirect;
