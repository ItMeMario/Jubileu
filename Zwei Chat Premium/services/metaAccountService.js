// services/metaAccountService.js
// Serviço de Diagnóstico, Monitoramento de Saúde e Qualidade da Conta WABA

const { metaApiClient } = require("../client/metaApiClient");
const metaConfig = require("../config/metaConfig");

class MetaAccountService {
  constructor() {
    this.accountInfo = {
      isConnected: false,
      displayPhoneNumber: null,
      verifiedName: null,
      qualityRating: "UNKNOWN", // 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN'
      codeVerificationStatus: "UNKNOWN",
      messagingLimitTier: "UNKNOWN", // 'TIER_50' | 'TIER_1K' | 'TIER_10K' | 'TIER_100K' | 'TIER_UNLIMITED'
      lastCheckedAt: null,
      errorMessage: null,
    };
  }

  /**
   * Obtém as informações em cache da conta
   * @returns {object}
   */
  getAccountInfo() {
    return { ...this.accountInfo };
  }

  /**
   * Executa teste de conectividade e diagnóstico com a Meta Graph API
   * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
   */
  async checkConnectionStatus() {
    const validation = metaConfig.validateCredentials();
    if (!validation.isValid) {
      this.accountInfo.isConnected = false;
      this.accountInfo.errorMessage = `Credenciais incompletas: ${validation.missing.join(", ")}`;
      this.accountInfo.lastCheckedAt = new Date();
      return { success: false, error: this.accountInfo.errorMessage };
    }

    try {
      const response = await metaApiClient.getPhoneNumberDetails();

      if (response.success && response.data) {
        const data = response.data;
        this.accountInfo = {
          isConnected: true,
          displayPhoneNumber: data.display_phone_number || null,
          verifiedName: data.verified_name || "Nome não cadastrado",
          qualityRating: data.quality_rating || "UNKNOWN",
          codeVerificationStatus: data.code_verification_status || "VERIFIED",
          messagingLimitTier: data.messaging_limit_tier || "TIER_1K",
          lastCheckedAt: new Date(),
          errorMessage: null,
        };

        return { success: true, data: this.accountInfo };
      } else {
        this.accountInfo.isConnected = false;
        this.accountInfo.errorMessage = response.error || "Falha na comunicação com a Meta";
        this.accountInfo.lastCheckedAt = new Date();
        return { success: false, error: this.accountInfo.errorMessage };
      }
    } catch (error) {
      this.accountInfo.isConnected = false;
      this.accountInfo.errorMessage = error.message;
      this.accountInfo.lastCheckedAt = new Date();
      return { success: false, error: error.message };
    }
  }

  /**
   * Testa credenciais provisórias informadas pelo usuário na tela de configuração
   * @param {object} testConfig
   * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
   */
  async testCredentials(testConfig) {
    const originalConfig = metaConfig.getConfig();

    try {
      metaConfig.updateConfig(testConfig);
      const result = await metaApiClient.getPhoneNumberDetails();
      return result;
    } finally {
      // Restaura a configuração original se for apenas um teste isolado
      metaConfig.updateConfig(originalConfig);
    }
  }
}

// Exporta instância singleton
const metaAccountService = new MetaAccountService();
module.exports = {
  MetaAccountService,
  metaAccountService,
};
