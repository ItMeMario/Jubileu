// services/credentialService.js
const { app, safeStorage } = require("electron");
const fs = require("fs");
const path = require("path");
const pathHelper = require("../utils/pathHelper");

class CredentialService {
  constructor() {
    this.storageFile = null;
  }

  /**
   * Retorna o caminho do arquivo de credenciais salvas
   */
  getStorageFilePath() {
    if (!this.storageFile) {
      this.storageFile = path.join(pathHelper.getUserDataPath(), "auth-credentials.json");
    }
    return this.storageFile;
  }

  /**
   * Criptografa texto usando a API nativa safeStorage (DPAPI no Windows)
   */
  _encrypt(text) {
    if (!text) return { encrypted: false, data: "" };
    try {
      if (safeStorage && typeof safeStorage.isEncryptionAvailable === "function" && safeStorage.isEncryptionAvailable()) {
        const encryptedBuffer = safeStorage.encryptString(text);
        return {
          encrypted: true,
          data: encryptedBuffer.toString("base64")
        };
      }
    } catch (err) {
      console.warn("⚠️ safeStorage não disponível no momento. Utilizando fallback:", err.message);
    }

    // Fallback base64
    return {
      encrypted: false,
      data: Buffer.from(text, "utf-8").toString("base64")
    };
  }

  /**
   * Descriptografa texto usando safeStorage ou fallback
   */
  _decrypt(payload) {
    if (!payload || !payload.data) return "";
    try {
      if (payload.encrypted && safeStorage && typeof safeStorage.isEncryptionAvailable === "function" && safeStorage.isEncryptionAvailable()) {
        const buffer = Buffer.from(payload.data, "base64");
        return safeStorage.decryptString(buffer);
      }
    } catch (err) {
      console.warn("⚠️ Erro ao descriptografar com safeStorage:", err.message);
    }

    // Fallback base64
    try {
      return Buffer.from(payload.data, "base64").toString("utf-8");
    } catch (e) {
      return "";
    }
  }

  /**
   * Salva credenciais com opção de lembrar e auto-login
   */
  save(email, password, remember = true, autoLogin = true) {
    try {
      if (!remember) {
        return this.clear();
      }

      const filePath = this.getStorageFilePath();
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const payload = {
        email: (email || "").trim(),
        password: this._encrypt(password || ""),
        remember: true,
        autoLogin: autoLogin !== false,
        updatedAt: new Date().toISOString()
      };

      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf-8");
      console.log("💾 Credenciais de login salvas com sucesso.");
      return { success: true };
    } catch (error) {
      console.error("❌ Erro ao salvar credenciais:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtém as credenciais salvas
   */
  get() {
    try {
      const filePath = this.getStorageFilePath();
      if (!fs.existsSync(filePath)) {
        return { remember: false, email: "", password: "", autoLogin: false };
      }

      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.remember) {
        return { remember: false, email: "", password: "", autoLogin: false };
      }

      const password = this._decrypt(parsed.password);
      return {
        remember: true,
        email: parsed.email || "",
        password: password || "",
        autoLogin: parsed.autoLogin !== false
      };
    } catch (error) {
      console.error("❌ Erro ao ler credenciais salvas:", error);
      return { remember: false, email: "", password: "", autoLogin: false };
    }
  }

  /**
   * Atualiza a flag de auto-login sem alterar as credenciais salvas
   */
  setAutoLogin(enabled) {
    try {
      const filePath = this.getStorageFilePath();
      if (!fs.existsSync(filePath)) return false;

      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed) {
        parsed.autoLogin = !!enabled;
        parsed.updatedAt = new Date().toISOString();
        fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2), "utf-8");
        return true;
      }
    } catch (error) {
      console.error("❌ Erro ao atualizar status de autoLogin:", error);
    }
    return false;
  }

  /**
   * Limpa as credenciais salvas
   */
  clear() {
    try {
      const filePath = this.getStorageFilePath();
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log("🗑️ Credenciais salvas removidas com sucesso.");
      }
      return { success: true };
    } catch (error) {
      console.error("❌ Erro ao remover credenciais salvas:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new CredentialService();
