// services/cryptoStorageService.js
// Serviço de Criptografia Segura de Credenciais em Repouso (Electron safeStorage / AES-256-GCM)

const crypto = require("crypto");
let electron = null;
try {
  electron = require("electron");
} catch (e) {
  electron = null;
}

class CryptoStorageService {
  constructor() {
    this.prefixDpapi = "enc:dpapi:";
    this.prefixAes = "enc:aes:";
  }

  /**
   * Verifica se o safeStorage nativo do Electron (Windows DPAPI / Keychain) está pronto para uso
   * @returns {boolean}
   */
  isSafeStorageAvailable() {
    return !!(
      electron &&
      electron.safeStorage &&
      typeof electron.safeStorage.isEncryptionAvailable === "function" &&
      electron.safeStorage.isEncryptionAvailable()
    );
  }

  /**
   * Criptografa uma string sensível (ex: Access Token)
   * Utiliza safeStorage do SO se disponível; caso contrário, utiliza AES-256-GCM com chave vinculada à máquina
   * @param {string} plainText
   * @returns {string} Texto criptografado com prefixo identificador
   */
  encrypt(plainText) {
    if (!plainText || typeof plainText !== "string") return "";

    // Se já estiver criptografado, evita dupla criptografia
    if (this.isEncrypted(plainText)) {
      return plainText;
    }

    // 1. Prioridade: safeStorage nativo do Electron (chaves DPAPI no Windows gerenciadas pelo SO)
    if (this.isSafeStorageAvailable()) {
      try {
        const buffer = electron.safeStorage.encryptString(plainText);
        return `${this.prefixDpapi}${buffer.toString("base64")}`;
      } catch (err) {
        console.warn("Aviso: safeStorage falhou, utilizando fallback seguro AES:", err.message);
      }
    }

    // 2. Fallback de alta segurança: AES-256-GCM com derivação de chave vinculada ao ambiente
    return this._encryptAes(plainText);
  }

  /**
   * Descriptografa uma credencial criptografada
   * @param {string} cipherText
   * @returns {string} Texto original em claro
   */
  decrypt(cipherText) {
    if (!cipherText || typeof cipherText !== "string") return "";

    // Se não tiver prefixo de criptografia, assume formato legado em texto puro (compatibilidade reversa)
    if (!this.isEncrypted(cipherText)) {
      return cipherText;
    }

    // Caso 1: Criptografia via safeStorage nativo do Electron
    if (cipherText.startsWith(this.prefixDpapi)) {
      if (this.isSafeStorageAvailable()) {
        try {
          const base64Data = cipherText.slice(this.prefixDpapi.length);
          const buffer = Buffer.from(base64Data, "base64");
          return electron.safeStorage.decryptString(buffer);
        } catch (err) {
          console.error("Falha ao descriptografar token com safeStorage:", err.message);
          return "";
        }
      } else {
        // Se chamado fora do Electron (ex: scripts avulsos), avisa e não quebra
        console.warn("safeStorage não está disponível neste processo.");
        return "";
      }
    }

    // Caso 2: Criptografia via AES-256-GCM
    if (cipherText.startsWith(this.prefixAes)) {
      return this._decryptAes(cipherText);
    }

    return cipherText;
  }

  /**
   * Verifica se a string já foi criptografada pelo serviço
   * @param {string} str
   * @returns {boolean}
   */
  isEncrypted(str) {
    if (!str || typeof str !== "string") return false;
    return str.startsWith(this.prefixDpapi) || str.startsWith(this.prefixAes);
  }

  // ========================================================
  // IMPLEMENTAÇÃO DE CRIPTOGRAFIA AES-256-GCM (FALLBACK SEGURO)
  // ========================================================

  /**
   * Gera uma chave estável de 256 bits vinculada a este computador
   * @private
   */
  _getFallbackKey() {
    const machineSeed =
      (process.env.COMPUTERNAME || process.env.HOSTNAME || "ZWEI_CHAT_PREMIUM_SECURE_NODE") +
      (process.env.USERDOMAIN || "DEFAULT_LOCAL_DOMAIN") +
      "ZWEI_SALT_PEPPER_2026";
    return crypto.scryptSync(machineSeed, "zwei_chat_salt_kdf_v1", 32);
  }

  /**
   * Criptografa usando AES-256-GCM com IV único e Tag de Autenticação
   * @private
   */
  _encryptAes(plainText) {
    try {
      const key = this._getFallbackKey();
      const iv = crypto.randomBytes(12); // IV de 96 bits recomendado para GCM
      const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

      let encrypted = cipher.update(plainText, "utf8", "hex");
      encrypted += cipher.final("hex");
      const authTag = cipher.getAuthTag().toString("hex");

      return `${this.prefixAes}${iv.toString("hex")}:${authTag}:${encrypted}`;
    } catch (err) {
      console.error("Erro na criptografia AES:", err.message);
      return plainText;
    }
  }

  /**
   * Descriptografa e valida integridade usando AES-256-GCM
   * @private
   */
  _decryptAes(cipherText) {
    try {
      const key = this._getFallbackKey();
      const raw = cipherText.slice(this.prefixAes.length);
      const parts = raw.split(":");

      if (parts.length !== 3) return "";

      const [ivHex, authTagHex, encryptedHex] = parts;
      const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        key,
        Buffer.from(ivHex, "hex")
      );
      decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

      let decrypted = decipher.update(encryptedHex, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (err) {
      console.error("Falha na autenticação ou integridade do token criptografado (AES-GCM):", err.message);
      return "";
    }
  }
}

const cryptoStorageService = new CryptoStorageService();
module.exports = {
  CryptoStorageService,
  cryptoStorageService,
};
