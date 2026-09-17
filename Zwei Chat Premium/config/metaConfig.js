// config/metaConfig.js
// Gerenciador e Validador de Configurações da Meta WhatsApp Cloud API

const path = require("path");
const fs = require("fs");
const { cryptoStorageService } = require("../services/cryptoStorageService");
require("dotenv").config();

class MetaConfigManager {
  constructor() {
    const rawAccessToken = process.env.META_ACCESS_TOKEN || "";

    this.config = {
      appId: process.env.META_APP_ID || "1824502742321385",
      configId: process.env.META_CONFIG_ID || "",
      phoneNumberId: process.env.META_PHONE_NUMBER_ID || "",
      wabaId: process.env.META_WABA_ID || "",
      accessToken: cryptoStorageService.decrypt(rawAccessToken),
      appSecret: process.env.META_APP_SECRET || "",
      verifyToken: process.env.META_VERIFY_TOKEN || "",
      apiVersion: process.env.META_GRAPH_API_VERSION || "v21.0",
      baseUrl: "https://graph.facebook.com",
      functionsUrl: process.env.FIREBASE_FUNCTIONS_URL || "",
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID || "",
    };
  }

  /**
   * Obtém a configuração atual
   * @param {object} [options={}] - Opções de visualização ({ safeForClient: boolean })
   * @returns {object} Configurações ativas
   */
  getConfig(options = {}) {
    const configCopy = { ...this.config };
    if (options.safeForClient || options.maskSecrets) {
      delete configCopy.appSecret;
    }
    return configCopy;
  }

  /**
   * Atualiza as configurações em tempo de execução
   * @param {object} newConfig - Novas credenciais parciais ou totais
   */
  updateConfig(newConfig) {
    if (!newConfig || typeof newConfig !== "object") return;

    if (newConfig.appId !== undefined) this.config.appId = String(newConfig.appId).trim();
    if (newConfig.configId !== undefined) this.config.configId = String(newConfig.configId).trim();
    if (newConfig.phoneNumberId !== undefined) this.config.phoneNumberId = String(newConfig.phoneNumberId).trim();
    if (newConfig.wabaId !== undefined) this.config.wabaId = String(newConfig.wabaId).trim();
    if (newConfig.accessToken !== undefined) {
      // Garante que o token armazenado em memória esteja sempre descriptografado
      this.config.accessToken = cryptoStorageService.decrypt(String(newConfig.accessToken).trim());
    }
    if (newConfig.appSecret !== undefined) this.config.appSecret = String(newConfig.appSecret).trim();
    if (newConfig.verifyToken !== undefined) this.config.verifyToken = String(newConfig.verifyToken).trim();
    if (newConfig.apiVersion !== undefined) this.config.apiVersion = String(newConfig.apiVersion).trim();
    if (newConfig.functionsUrl !== undefined) this.config.functionsUrl = String(newConfig.functionsUrl).trim();
    if (newConfig.firebaseProjectId !== undefined) this.config.firebaseProjectId = String(newConfig.firebaseProjectId).trim();
  }

  /**
   * Salva as configurações permanentemente no arquivo .env criptografando credenciais sensíveis
   * @param {object} newConfig - Novas configurações a persistir
   * @returns {boolean} true se gravou com sucesso
   */
  saveToEnvFile(newConfig = {}) {
    this.updateConfig(newConfig);

    const envPath = path.join(__dirname, "../.env");
    let envContent = "";
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf-8");
    }

    // Criptografa o token de acesso sensível antes de gravar no disco
    const encryptedToken = this.config.accessToken
      ? cryptoStorageService.encrypt(this.config.accessToken)
      : "";

    const mapping = {
      META_APP_ID: this.config.appId,
      META_CONFIG_ID: this.config.configId,
      META_PHONE_NUMBER_ID: this.config.phoneNumberId,
      META_WABA_ID: this.config.wabaId,
      META_ACCESS_TOKEN: encryptedToken,
      META_VERIFY_TOKEN: this.config.verifyToken,
      META_GRAPH_API_VERSION: this.config.apiVersion,
      FIREBASE_FUNCTIONS_URL: this.config.functionsUrl,
      FIREBASE_PROJECT_ID: this.config.firebaseProjectId,
    };

    // Apenas persiste META_APP_SECRET se expressamente definido em ambiente dev
    if (this.config.appSecret) {
      mapping.META_APP_SECRET = this.config.appSecret;
    }

    let lines = envContent ? envContent.split(/\r?\n/) : [];
    const keysHandled = new Set();

    lines = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return line;

      const equalIndex = line.indexOf("=");
      if (equalIndex === -1) return line;

      const key = line.slice(0, equalIndex).trim();
      if (key in mapping) {
        keysHandled.add(key);
        process.env[key] = mapping[key] || "";
        return `${key}=${mapping[key] || ""}`;
      }
      return line;
    });

    // Adiciona chaves que ainda não existiam no .env
    for (const [key, value] of Object.entries(mapping)) {
      if (!keysHandled.has(key) && value) {
        lines.push(`${key}=${value}`);
        process.env[key] = value;
      }
    }

    fs.writeFileSync(envPath, lines.join("\n"), "utf-8");
    return true;
  }

  /**
   * Limpa as credenciais do cliente (Desconectar) e persiste no .env
   */
  clearCredentials() {
    this.config.phoneNumberId = "";
    this.config.wabaId = "";
    this.config.accessToken = "";

    return this.saveToEnvFile({
      phoneNumberId: "",
      wabaId: "",
      accessToken: "",
    });
  }

  /**
   * Valida se as credenciais mínimas para envio de mensagens estão presentes
   * @returns {{ isValid: boolean, missing: string[] }}
   */
  validateCredentials() {
    const missing = [];

    if (!this.config.phoneNumberId) missing.push("META_PHONE_NUMBER_ID");
    if (!this.config.accessToken) missing.push("META_ACCESS_TOKEN");

    return {
      isValid: missing.length === 0,
      missing,
    };
  }

  /**
   * Retorna a URL base formatada da Graph API com a versão configurada
   * @returns {string} 
   */
  getApiBaseUrl() {
    return `${this.config.baseUrl}/${this.config.apiVersion}`;
  }

  /**
   * Retorna a URL do endpoint de mensagens para o Phone Number ID ativo
   * @returns {string} 
   */
  getMessagesEndpoint() {
    return `${this.getApiBaseUrl()}/${this.config.phoneNumberId}/messages`;
  }
}

// Exporta instância singleton
const metaConfig = new MetaConfigManager();
module.exports = metaConfig;
