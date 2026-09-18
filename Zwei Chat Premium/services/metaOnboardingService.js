// services/metaOnboardingService.js
// Serviço de Autenticação e Onboarding Automático via Meta Embedded Signup

const axios = require("axios");
const crypto = require("crypto");
const metaConfig = require("../config/metaConfig");
const { metaAccountService } = require("./metaAccountService");

class MetaOnboardingService {
  /**
   * Gera um token de estado aleatório (CSRF State Token) de alta entropia
   * @returns {string} Token hexadecimal de 48 caracteres
   */
  generateOAuthState() {
    return crypto.randomBytes(24).toString("hex");
  }

  /**
   * Constrói a URL oficial de diálogo OAuth do Facebook/Meta para Embedded Signup com proteção anti-CSRF
   * @param {string} redirectUri - URI de retorno (padrão: página de sucesso padrão da Meta)
   * @param {string} [state=null] - Token de estado anti-CSRF para validação de integridade da sessão
   * @returns {string} URL completa de autenticação
   */
  getEmbeddedSignupUrl(
    redirectUri = "https://www.facebook.com/connect/login_success.html",
    state = null
  ) {
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

    // Adiciona o parâmetro de integridade state se fornecido
    if (state) {
      url.searchParams.set("state", state);
    }

    // Se houver um Configuration ID criado no painel da Meta, inclui na URL
    if (configId) {
      url.searchParams.set("config_id", configId);
    }

    return url.toString();
  }

  /**
   * Valida a integridade do parâmetro state retornado pela Meta para prevenir CSRF
   * @param {string} incomingState - State retornado na URL de callback
   * @param {string} expectedState - State original gerado pela aplicação
   * @returns {boolean}
   */
  validateOAuthState(incomingState, expectedState) {
    if (!incomingState || !expectedState) return false;
    if (typeof incomingState !== "string" || typeof expectedState !== "string") return false;
    if (incomingState.length !== expectedState.length) return false;

    try {
      const incomingBuf = Buffer.from(incomingState, "utf8");
      const expectedBuf = Buffer.from(expectedState, "utf8");
      return crypto.timingSafeEqual(incomingBuf, expectedBuf);
    } catch (e) {
      return false;
    }
  }

  /**
   * Obtém a URL da Cloud Function para troca de OAuth
   * @returns {string|null}
   */
  getCloudFunctionsExchangeUrl() {
    if (process.env.FIREBASE_FUNCTIONS_URL) {
      const base = process.env.FIREBASE_FUNCTIONS_URL.replace(/\/$/, "");
      return base.endsWith("/oauthExchange") ? base : `${base}/oauthExchange`;
    }

    const config = metaConfig.getConfig();
    const functionsUrl = config.functionsUrl || "";
    if (functionsUrl) {
      const base = functionsUrl.replace(/\/$/, "");
      return base.endsWith("/oauthExchange") ? base : `${base}/oauthExchange`;
    }

    const projectId =
      config.firebaseProjectId ||
      process.env.FIREBASE_PROJECT_ID;

    if (projectId) {
      const region = process.env.FIREBASE_FUNCTIONS_REGION || "us-central1";
      return `https://${region}-${projectId}.cloudfunctions.net/oauthExchange`;
    }

    return null;
  }

  /**
   * Troca o código de autorização OAuth por um Access Token do usuário/cliente.
   * Prioridade 1: Executa via Cloud Function segura (META_APP_SECRET 100% isolado na nuvem).
   * Prioridade 2 (Modo Dev): Se houver META_APP_SECRET local em ambiente de teste/dev.
   * @param {string} authCode - Código de autorização capturado no callback
   * @param {string} redirectUri - Mesma URI de redirecionamento usada no login
   * @param {string} [cloudEndpoint=null] - URL opcional do endpoint da Cloud Function
   * @returns {Promise<{ access_token: string, token_type: string, wabaId?: string, phone?: object }>}
   */
  async exchangeCodeForToken(
    authCode,
    redirectUri = "https://www.facebook.com/connect/login_success.html",
    cloudEndpoint = null
  ) {
    const cloudUrl = cloudEndpoint || this.getCloudFunctionsExchangeUrl();

    // 1. Método Oficial Seguro: Cloud Function (Sem META_APP_SECRET no cliente)
    if (cloudUrl) {
      try {
        console.log(`🔒 [OAuth Seguro] Trocando código via Cloud Function: ${cloudUrl}`);
        const response = await axios.post(
          cloudUrl,
          {
            code: authCode,
            redirectUri,
          },
          {
            timeout: 20000,
            headers: { "Content-Type": "application/json" },
          }
        );

        if (response.data && response.data.success) {
          return {
            access_token: response.data.accessToken || response.data.access_token,
            token_type: response.data.tokenType || response.data.token_type || "bearer",
            expires_in: response.data.expiresIn || response.data.expires_in,
            wabaId: response.data.wabaId || null,
            phone: response.data.phone || null,
            firebaseCustomToken: response.data.firebaseCustomToken || null,
          };
        } else {
          throw new Error(response.data?.error || "Falha na resposta da Cloud Function");
        }
      } catch (cloudErr) {
        const config = metaConfig.getConfig();
        const appSecret = config.appSecret || process.env.META_APP_SECRET;

        // Se o cliente não tem appSecret (modo de produção normal), propaga o erro de forma clara
        if (!appSecret) {
          const msg =
            cloudErr.response?.data?.error ||
            cloudErr.message ||
            "Erro de conexão com o servidor de autenticação.";
          throw new Error(`Falha na autenticação OAuth na nuvem: ${msg}`);
        }

        console.warn(
          "⚠️ Falha na Cloud Function. Recorrendo ao fallback local de desenvolvimento com META_APP_SECRET..."
        );
      }
    }

    // 2. Fallback de Desenvolvimento Local (Apenas se META_APP_SECRET foi configurado localmente)
    const config = metaConfig.getConfig();
    const appId = config.appId || process.env.META_APP_ID || "1824502742321385";
    const appSecret = config.appSecret || process.env.META_APP_SECRET;

    if (!appSecret) {
      throw new Error(
        "Troca OAuth segura não configurada: Defina FIREBASE_PROJECT_ID ou FIREBASE_FUNCTIONS_URL no .env para utilizar a Cloud Function de autenticação sem expor o segredo da Meta."
      );
    }

    console.warn(
      "⚠️ [Aviso de Segurança - Modo Dev]: Usando META_APP_SECRET local para troca de token. Em produção comercial, utilize a Cloud Function na nuvem."
    );

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
   * @param {string} [preResolvedWabaId=null] - WABA ID previamente resolvido pelo backend
   * @param {object} [preResolvedPhone=null] - Dados do telefone previamente resolvidos pelo backend
   * @returns {Promise<{ wabaId: string, phone: object }>}
   */
  async fetchClientWabaAndPhone(
    userAccessToken,
    preResolvedWabaId = null,
    preResolvedPhone = null
  ) {
    // Se o backend seguro já resolveu tanto o WABA ID quanto o Telefone, retorna direto
    if (preResolvedWabaId && preResolvedPhone) {
      return {
        wabaId: preResolvedWabaId,
        phone: preResolvedPhone,
      };
    }

    const config = metaConfig.getConfig();
    const appId = config.appId || process.env.META_APP_ID || "1824502742321385";
    const appSecret = config.appSecret || process.env.META_APP_SECRET;

    let wabaId = preResolvedWabaId;

    // 1. Tenta inspecionar o token via debug_token apenas se appSecret estiver disponível localmente (dev mode)
    if (!wabaId && appSecret) {
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
          "Aviso no debug_token local (tentando método sem segredo):",
          debugErr.message
        );
      }
    }

    // 2. Método Padrão Seguro sem Segredo: busca pelas contas comerciais atribuídas ao usuário
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

    // Se o telefone já foi resolvido, retorna
    if (preResolvedPhone) {
      return { wabaId, phone: preResolvedPhone };
    }

    // 3. Busca a lista de números de telefone associados ao WABA (usando apenas userAccessToken)
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
      const { wabaId, phone } = await this.fetchClientWabaAndPhone(
        userAccessToken,
        tokenData.wabaId,
        tokenData.phone
      );

      console.log(`⚡ [Onboarding] WABA encontrado: ${wabaId} | Número: ${phone.display_phone_number} (ID: ${phone.id})`);

      // Assina os webhooks para receber notificações
      await this.subscribeAppToWaba(wabaId, userAccessToken);

      // Salva permanentemente as credenciais no .env e em memória
      metaConfig.saveToEnvFile({
        phoneNumberId: phone.id,
        wabaId: wabaId,
        accessToken: userAccessToken,
      });

      // Vincula o tenant e opcionalmente autentica no FirebaseService
      try {
        const { firebaseService } = require("./firebaseService");
        if (firebaseService) {
          await firebaseService.setTenant(wabaId, tokenData.firebaseCustomToken || null);
        }
      } catch (fbErr) {
        console.warn("Aviso ao vincular tenant no FirebaseService:", fbErr.message);
      }

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

      // Desvincula o tenant no FirebaseService
      try {
        const { firebaseService } = require("./firebaseService");
        if (firebaseService) {
          await firebaseService.setTenant(null);
        }
      } catch (fbErr) {
        console.warn("Aviso ao limpar tenant no FirebaseService:", fbErr.message);
      }

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
