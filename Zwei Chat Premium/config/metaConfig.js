// config/metaConfig.js
// Gerenciador e Validador de Configurações da Meta WhatsApp Cloud API

const path = require("path");
const fs = require("fs");
require("dotenv").config();

class MetaConfigManager {
  constructor() {
    this.config = {
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

    if (newConfig.phoneNumberId !== undefined) this.config.phoneNumberId = String(newConfig.phoneNumberId).trim();
    if (newConfig.wabaId !== undefined) this.config.wabaId = String(newConfig.wabaId).trim();
    if (newConfig.accessToken !== undefined) this.config.accessToken = String(newConfig.accessToken).trim();
    if (newConfig.appSecret !== undefined) this.config.appSecret = String(newConfig.appSecret).trim();
    if (newConfig.verifyToken !== undefined) this.config.verifyToken = String(newConfig.verifyToken).trim();
    if (newConfig.apiVersion !== undefined) this.config.apiVersion = String(newConfig.apiVersion).trim();
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
   * @returns {string} Ex: https://graph.facebook.com/v21.0
   */
  getApiBaseUrl() {
    return `${this.config.baseUrl}/${this.config.apiVersion}`;
  }

  /**
   * Retorna a URL do endpoint de mensagens para o Phone Number ID ativo
   * @returns {string} Ex: https://graph.facebook.com/v21.0/123456789/messages
   */
  getMessagesEndpoint() {
    return `${this.getApiBaseUrl()}/${this.config.phoneNumberId}/messages`;
  }
}

// Exporta instância singleton
const metaConfig = new MetaConfigManager();
module.exports = metaConfig;
