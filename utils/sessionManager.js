// utils/sessionManager.js
const fs = require("fs").promises;
const path = require("path");

class SessionManager {
  constructor() {
    this.sessionPath = this.getSessionPath();
  }

  getSessionPath() {
    try {
      const { app } = require("electron");

      if (app && app.isPackaged) {
        const userDataPath = app.getPath("userData");
        return path.join(userDataPath, "whatsapp-session");
      } else {
        return path.join(__dirname, "../.wwebjs_auth");
      }
    } catch (error) {
      return path.join(__dirname, "../.wwebjs_auth");
    }
  }

  /**
   * Verifica se a sessão existe
   */
  async sessionExists() {
    try {
      await fs.access(this.sessionPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Limpa a sessão com retry para resolver problemas de arquivos travados
   */
  async clearSession(maxRetries = 5) {
    console.log("🗑️ Iniciando limpeza da sessão...");

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Tentativa ${attempt}/${maxRetries}...`);

        const exists = await this.sessionExists();

        if (!exists) {
          console.log("✅ Sessão já foi removida");
          return { success: true, message: "Sessão já estava limpa" };
        }

        // Tenta remover com força
        await fs.rm(this.sessionPath, {
          recursive: true,
          force: true,
          maxRetries: 3,
        });

        console.log("✅ Sessão limpa com sucesso!");
        return { success: true, message: "Sessão limpa com sucesso" };
      } catch (error) {
        console.warn(`⚠️ Tentativa ${attempt} falhou: ${error.message}`);

        if (attempt < maxRetries) {
          // Aguarda progressivamente mais tempo a cada tentativa
          const delay = 1000 * attempt;
          console.log(`⏳ Aguardando ${delay}ms antes de tentar novamente...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          console.error("❌ Todas as tentativas falharam");
          return {
            success: false,
            message: `Falha ao limpar sessão: ${error.message}`,
            error: error,
          };
        }
      }
    }

    return {
      success: false,
      message: "Falha ao limpar sessão após múltiplas tentativas",
    };
  }

  /**
   * Limpa arquivos específicos que costumam travar (Windows)
   */
  async clearLockedFiles() {
    const problematicFiles = [
      "CrashpadMetrics-active.pma",
      "SingletonLock",
      "SingletonSocket",
      "SingletonCookie",
    ];

    console.log("🔧 Tentando limpar arquivos problemáticos...");

    for (const fileName of problematicFiles) {
      try {
        const sessionDir = path.join(this.sessionPath, "session-whatsapp-bot");
        const filePath = path.join(sessionDir, fileName);

        const exists = await fs
          .access(filePath)
          .then(() => true)
          .catch(() => false);

        if (exists) {
          await fs.unlink(filePath);
          console.log(`✅ Removido: ${fileName}`);
        }
      } catch (error) {
        console.warn(
          `⚠️ Não foi possível remover ${fileName}: ${error.message}`
        );
      }
    }
  }

  /**
   * Tenta reparar uma sessão corrompida
   */
  async repairSession() {
    console.log("🔧 Tentando reparar sessão...");

    try {
      // Primeiro tenta limpar apenas arquivos problemáticos
      await this.clearLockedFiles();

      // Se ainda existir, tenta limpar tudo
      const exists = await this.sessionExists();
      if (exists) {
        return await this.clearSession();
      }

      return { success: true, message: "Sessão reparada" };
    } catch (error) {
      return {
        success: false,
        message: `Erro ao reparar sessão: ${error.message}`,
        error: error,
      };
    }
  }

  /**
   * Obtém informações sobre a sessão
   */
  async getSessionInfo() {
    try {
      const exists = await this.sessionExists();

      if (!exists) {
        return {
          exists: false,
          path: this.sessionPath,
        };
      }

      const stats = await fs.stat(this.sessionPath);

      return {
        exists: true,
        path: this.sessionPath,
        created: stats.birthtime,
        modified: stats.mtime,
        size: stats.size,
      };
    } catch (error) {
      return {
        exists: false,
        path: this.sessionPath,
        error: error.message,
      };
    }
  }

  /**
   * Backup da sessão (útil para debug)
   */
  async backupSession() {
    try {
      const exists = await this.sessionExists();

      if (!exists) {
        return {
          success: false,
          message: "Nenhuma sessão para fazer backup",
        };
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = `${this.sessionPath}_backup_${timestamp}`;

      await fs.cp(this.sessionPath, backupPath, { recursive: true });

      return {
        success: true,
        message: "Backup criado com sucesso",
        backupPath: backupPath,
      };
    } catch (error) {
      return {
        success: false,
        message: `Erro ao criar backup: ${error.message}`,
        error: error,
      };
    }
  }
}

// Singleton
const sessionManager = new SessionManager();

module.exports = sessionManager;
