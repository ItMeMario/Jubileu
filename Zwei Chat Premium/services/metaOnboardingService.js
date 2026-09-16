// services/metaOnboardingService.js
// Serviço de Autenticação e Onboarding Automático via Meta Embedded Signup

const axios = require("axios");
const metaConfig = require("../config/metaConfig");
const { metaAccountService } = require("./metaAccountService");

class MetaOnboardingService {
  /**
   * Constrói a URL oficial de diálogo OAuth do Facebook/Meta para Embedded Signup
   * @param {string} redirectUri - URI de retorno (padrão: página de sucesso padrão da Meta)
   * @returns {string} URL completa de autenticação
   */
  getEmbeddedSignupUrl(redirectUri = "https://www.facebook.com/connect/login_success.html") {
    const config = metaConfig.getConfig();
    const appId = config.appId || process.env.META_APP_ID || "1824502742321385";
    const configId = config.configId || process.env.META_CONFIG_ID || "";
    const apiVersion = config.apiVersion || "v21.0";

    const url = new URL(`https://www.facebook.com/${apiVersion}/dialog/oauth`);
    url.searchParams.set("client_id", appId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set(
      "scope",
      "whatsapp_business_management,whatsapp_business_messaging"
    );

    // Se houver um Configuration ID criado no painel da Meta, inclui na URL
    if (configId) {
      url.searchParams.set("config_id", configId);
    }

    return url.toString();
  }

  /**
   * Troca o código de autorização OAuth por um Access Token do usuário/cliente
   * @param {string} authCode - Código de autorização capturado no callback
   * @param {string} redirectUri - Mesma URI de redirecionamento usada no login
   * @returns {Promise<{ access_token: string, token_type: string }>}
   */
  async exchangeCodeForToken(
    authCode,
    redirectUri = "https://www.facebook.com/connect/login_success.html"
  ) {
    const config = metaConfig.getConfig();
    const appId = config.appId || process.env.META_APP_ID || "1824502742321385";
    const appSecret = config.appSecret || process.env.META_APP_SECRET;

    if (!appSecret) {
      throw new Error(
        "App Secret da Meta não configurado. Verifique o arquivo .env (META_APP_SECRET)."
      );
    }

    try {
      const response = await axios.get(
        `${config.baseUrl}/${config.apiVersion}/oauth/access_token`,
        {
          params: {
            client_id: appId,
            client_secret: appSecret,
            code: authCode,
            redirect_uri: redirectUri,
          },
          timeout: 15000,
        }
      );

      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.error?.message ||
        error.message ||
        "Falha ao trocar código de autorização por token";
      throw new Error(`Erro OAuth Meta: ${msg}`);
    }
  }

  /**
   * Identifica o WABA ID e os dados do número de telefone vinculados ao token
   * @param {string} userAccessToken - Token do cliente obtido na troca do OAuth
   * @returns {Promise<{ wabaId: string, phone: object }>}
   */
  async fetchClientWabaAndPhone(userAccessToken) {
    const config = metaConfig.getConfig();
    const appId = config.appId || process.env.META_APP_ID || "1824502742321385";
    const appSecret = config.appSecret || process.env.META_APP_SECRET;

    let wabaId = null;

    // 1. Tenta inspecionar o token via debug_token para extrair o WABA ID dos granular_scopes
    try {
      const debugRes = await axios.get(
        `${config.baseUrl}/${config.apiVersion}/debug_token`,
        {
          params: {
            input_token: userAccessToken,
            access_token: `${appId}|${appSecret}`,
          },
          timeout: 10000,
        }
      );

      const granularScopes = debugRes.data?.data?.granular_scopes || [];
      const wabaScope = granularScopes.find(
        (s) => s.scope === "whatsapp_business_management"
      );

      if (wabaScope && Array.isArray(wabaScope.target_ids) && wabaScope.target_ids.length > 0) {
        wabaId = wabaScope.target_ids[0];
      }
    } catch (debugErr) {
      console.warn(
        "Aviso no debug_token (tentando método alternativo de busca de WABA):",
        debugErr.message
      );
    }

    // 2. Fallback: Se não encontrou pelo debug_token, busca pelas contas compartilhadas
    if (!wabaId) {
      try {
        const sharedWabaRes = await axios.get(
          `${config.baseUrl}/${config.apiVersion}/me/assigned_whatsapp_business_accounts`,
          {
            params: { access_token: userAccessToken },
            timeout: 10000,
          }
        );

        const accounts = sharedWabaRes.data?.data || [];
        if (accounts.length > 0) {
          wabaId = accounts[0].id;
        }
      } catch (fallbackErr) {
        console.warn("Aviso ao buscar assigned WABAs:", fallbackErr.message);
      }
    }

    if (!wabaId) {
      throw new Error(
        "Não foi possível identificar a Conta do WhatsApp Business (WABA ID) do cliente."
      );
    }

    // 3. Busca a lista de números de telefone associados a esse WABA
    const phoneRes = await axios.get(
      `${config.baseUrl}/${config.apiVersion}/${wabaId}/phone_numbers`,
      {
        params: {
          access_token: userAccessToken,
          fields:
            "id,display_phone_number,verified_name,quality_rating,code_verification_status",
        },
        timeout: 10000,
      }
    );

    const phones = phoneRes.data?.data || [];
    if (phones.length === 0) {
      throw new Error(
        "Nenhum número de telefone verificado foi encontrado na conta do WhatsApp selecionada."
      );
    }

    // Seleciona o primeiro número disponível
    const primaryPhone = phones[0];

    return {
      wabaId,
      phone: primaryPhone,
    };
  }

  /**
   * Assina o Webhook do aplicativo no WABA do cliente para receber mensagens e status
   * @param {string} wabaId - ID da Conta WhatsApp Business
   * @param {string} userAccessToken - Token com permissão whatsapp_business_management
   */
  async subscribeAppToWaba(wabaId, userAccessToken) {
    const config = metaConfig.getConfig();

    try {
      const response = await axios.post(
        `${config.baseUrl}/${config.apiVersion}/${wabaId}/subscribed_apps`,
        {},
        {
          params: { access_token: userAccessToken },
          timeout: 10000,
        }
      );
      return response.data;
    } catch (err) {
      console.warn(
        "Aviso ao assinar webhook no WABA (o envio de mensagens continuará operando):",
        err.response?.data || err.message
      );
      return { success: false, warning: err.message };
    }
  }

  /**
   * Executa o fluxo completo de Onboarding: troca o código, identifica a conta,
   * assina o webhook, persiste as credenciais e valida a conexão
   * @param {string} authCode - Código retornado no fluxo OAuth
   * @param {string} [redirectUri] - URI de redirecionamento utilizada
   * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
   */
  async completeOnboarding(
    authCode,
    redirectUri = "https://www.facebook.com/connect/login_success.html"
  ) {
    try {
      console.log("⚡ [Onboarding] Trocando código de autorização por Access Token...");
      const tokenData = await this.exchangeCodeForToken(authCode, redirectUri);
      const userAccessToken = tokenData.access_token;

      console.log("⚡ [Onboarding] Identificando WABA ID e Número do Cliente...");
      const { wabaId, phone } = await this.fetchClientWabaAndPhone(userAccessToken);

      console.log(`⚡ [Onboarding] WABA encontrado: ${wabaId} | Número: ${phone.display_phone_number} (ID: ${phone.id})`);

      // Assina os webhooks para receber notificações
      await this.subscribeAppToWaba(wabaId, userAccessToken);

      // Salva permanentemente as credenciais no .env e em memória
      metaConfig.saveToEnvFile({
        phoneNumberId: phone.id,
        wabaId: wabaId,
        accessToken: userAccessToken,
      });

      // Valida o status de saúde da nova conta
      const health = await metaAccountService.checkConnectionStatus();

      return {
        success: true,
        data: {
          wabaId,
          phoneNumberId: phone.id,
          displayPhoneNumber: phone.display_phone_number || "",
          verifiedName: phone.verified_name || "Nome não cadastrado",
          qualityRating: phone.quality_rating || "GREEN",
          health: health.data || null,
        },
      };
    } catch (error) {
      console.error("❌ [Onboarding] Falha ao concluir ativação automática:", error);
      return {
        success: false,
        error: error.message || "Falha na ativação da conta Meta.",
      };
    }
  }

  /**
   * Desconecta o número atual e limpa as credenciais salvas
   * @returns {Promise<{ success: boolean }>}
   */
  async disconnectAccount() {
    try {
      metaConfig.clearCredentials();
      await metaAccountService.checkConnectionStatus();
      return { success: true };
    } catch (error) {
      console.error("Erro ao desconectar conta:", error);
      return { success: false, error: error.message };
    }
  }
}

const metaOnboardingService = new MetaOnboardingService();
module.exports = {
  MetaOnboardingService,
  metaOnboardingService,
};
