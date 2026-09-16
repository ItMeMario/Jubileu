// config/metaConfig.js
// Gerenciador e Validador de Configurações da Meta WhatsApp Cloud API

const path = require("path");
const fs = require("fs");
require("dotenv").config();

class MetaConfigManager {
  constructor() {
    this.config = {
      appId: process.env.META_APP_ID || "1824502742321385",
      configId: process.env.META_CONFIG_ID || "",
      phoneNumberId: process.env.META_PHONE_NUMBER_ID || "",
      wabaId: process.env.META_WABA_ID || "",
      accessToken: process.env.META_ACCESS_TOKEN || "",
      appSecret: process.env.META_APP_SECRET || "",
      verifyToken: process.env.META_VERIFY_TOKEN || "",
      apiVersion: process.env.META_GRAPH_API_VERSION || "v21.0",
      baseUrl: "https://graph.facebook.com",
    };
  }

  /**
   * Obtém a configuração atual
   * @returns {object} Configurações ativas
   */
  getConfig() {
    return { ...this.config };
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
    if (newConfig.accessToken !== undefined) this.config.accessToken = String(newConfig.accessToken).trim();
    if (newConfig.appSecret !== undefined) this.config.appSecret = String(newConfig.appSecret).trim();
    if (newConfig.verifyToken !== undefined) this.config.verifyToken = String(newConfig.verifyToken).trim();
    if (newConfig.apiVersion !== undefined) this.config.apiVersion = String(newConfig.apiVersion).trim();
  }

  /**
   * Salva as configurações permanentemente no arquivo .env
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

    const mapping = {
      META_APP_ID: this.config.appId,
      META_CONFIG_ID: this.config.configId,
      META_PHONE_NUMBER_ID: this.config.phoneNumberId,
      META_WABA_ID: this.config.wabaId,
      META_ACCESS_TOKEN: this.config.accessToken,
      META_APP_SECRET: this.config.appSecret,
      META_VERIFY_TOKEN: this.config.verifyToken,
      META_GRAPH_API_VERSION: this.config.apiVersion,
    };

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
