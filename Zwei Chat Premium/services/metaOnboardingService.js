// services/metaOnboardingService.js
// Serviço de Autenticação e Onboarding Automático via Meta Embedded Signup

const axios = require("axios");
const crypto = require("crypto");
const fs = require("fs");
const metaConfig = require("../config/metaConfig");
const { metaAccountService } = require("./metaAccountService");
const { storagePaths } = require("./storagePaths");

class MetaOnboardingService {
  /**
   * Gera um token de estado aleatório (CSRF State Token) de alta entropia
   * @returns {string} Token hexadecimal de 48 caracteres
   */
  generateOAuthState() {
    return crypto.randomBytes(24).toString("hex");
  }

  /**
   * Mascara token ou chave sensível para telemetria e relatórios seguros de diagnóstico
   * @param {string} token
   * @returns {string}
   */
  maskSecret(token) {
    if (!token || typeof token !== "string") return "(não definido)";
    if (token.length <= 10) return "***";
    return `${token.slice(0, 6)}...${token.slice(-4)}`;
  }

  /**
   * Salva com segurança o relatório da última tentativa de onboarding em disco
   * @param {object} report
   */
  saveDiagnosticsReport(report) {
    try {
      const diagPath = storagePaths.getDiagnosticsPath("last-onboarding-attempt.json");
      fs.writeFileSync(diagPath, JSON.stringify(report, null, 2), "utf-8");
      console.log(`💾 [Diagnostics] Relatório de onboarding salvo com sucesso em: ${diagPath}`);
    } catch (err) {
      console.warn("⚠️ Falha ao salvar relatório de diagnóstico:", err.message);
    }
  }

  /**
   * Lê o relatório da última tentativa de onboarding gravado em disco
   * @returns {object|null}
   */
  getLastDiagnosticsReport() {
    try {
      const diagPath = storagePaths.getDiagnosticsPath("last-onboarding-attempt.json");
      if (fs.existsSync(diagPath)) {
        return JSON.parse(fs.readFileSync(diagPath, "utf-8"));
      }
    } catch (err) {
      console.warn("⚠️ Falha ao ler relatório de diagnóstico:", err.message);
    }
    return null;
  }

  /**
   * Retorna a URI padrão de redirecionamento configurada para o OAuth
   * @returns {string}
   */
  getDefaultRedirectUri() {
    const config = metaConfig.getConfig();
    return (
      config.redirectUri ||
      process.env.META_REDIRECT_URI ||
      "https://zwei-chat-c9d1f.firebaseapp.com/__/auth/handler"
    );
  }

  /**
   * Constrói a URL oficial de diálogo OAuth do Facebook/Meta para Embedded Signup v4 com proteção anti-CSRF
   * @param {string} [redirectUri=null] - URI de retorno
   * @param {string} [state=null] - Token de estado anti-CSRF para validação de integridade da sessão
   * @returns {string} URL completa de autenticação
   */
  getEmbeddedSignupUrl(
    redirectUri = null,
    state = null
  ) {
    const config = metaConfig.getConfig();
    const effectiveRedirectUri = redirectUri || this.getDefaultRedirectUri();
    const appId = config.appId || process.env.META_APP_ID || "1824502742321385";
    const configId = (config.configId !== undefined ? config.configId : process.env.META_CONFIG_ID) || "";
    const apiVersion = config.apiVersion || "v21.0";

    const url = new URL(`https://www.facebook.com/${apiVersion}/dialog/oauth`);
    url.searchParams.set("client_id", appId);
    url.searchParams.set("redirect_uri", effectiveRedirectUri);
    url.searchParams.set("response_type", "code");

    // Adiciona o parâmetro de integridade state se fornecido
    if (state) {
      url.searchParams.set("state", state);
    }

    // Facebook Login for Business / Embedded Signup v4 (via Configuration ID):
    // Quando config_id é utilizado, as permissões e produtos já vêm vinculados à configuração no painel da Meta.
    // Não se deve enviar 'scope' junto com 'config_id', nem forçar 'featureType' de Coexistence/v3 sem aprovação de Tech Provider.
    if (configId) {
      url.searchParams.set("config_id", configId);
      url.searchParams.set("override_default_response_type", "true");

      if (process.env.META_ENABLE_COEXISTENCE === "true") {
        const extras = {
          setup: {},
          featureType: "whatsapp_business_app_onboarding",
          version: "v4",
        };
        url.searchParams.set("extras", JSON.stringify(extras));
      }
    } else {
      // Fallback OAuth tradicional quando não há Configuration ID definido
      url.searchParams.set(
        "scope",
        "whatsapp_business_management,whatsapp_business_messaging"
      );
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
   * @param {string} [redirectUri=null] - Mesma URI de redirecionamento usada no login
   * @param {string} [cloudEndpoint=null] - URL opcional do endpoint da Cloud Function
   * @param {string} [preResolvedWabaId=null] - WABA ID pré-resolvido opcional
   * @param {string} [preResolvedPhoneId=null] - Phone Number ID pré-resolvido opcional
   * @returns {Promise<{ access_token: string, token_type: string, wabaId?: string, phone?: object }>}
   */
  async exchangeCodeForToken(
    authCode,
    redirectUri = null,
    cloudEndpoint = null,
    preResolvedWabaId = null,
    preResolvedPhoneId = null
  ) {
    const effectiveRedirectUri = redirectUri || this.getDefaultRedirectUri();
    const cloudUrl = cloudEndpoint || this.getCloudFunctionsExchangeUrl();

    // 1. Método Oficial Seguro: Cloud Function (Sem META_APP_SECRET no cliente)
    if (cloudUrl) {
      try {
        console.log(`🔒 [OAuth Seguro] Trocando código via Cloud Function: ${cloudUrl}`);
        const response = await axios.post(
          cloudUrl,
          {
            code: authCode,
            redirectUri: effectiveRedirectUri,
            preResolvedWabaId: preResolvedWabaId || null,
            preResolvedPhoneId: preResolvedPhoneId || null,
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
          let msg = "Erro de conexão com o servidor de autenticação.";

          if (cloudErr.response?.data?.error) {
            const errData = cloudErr.response.data.error;
            msg =
              typeof errData === "object"
                ? errData.message || JSON.stringify(errData)
                : String(errData);
          } else if (cloudErr.response?.status === 404) {
            msg =
              "Serviço de autenticação temporariamente indisponível na nuvem (HTTP 404). Aguarde alguns instantes ou contate o suporte.";
          } else if (
            cloudErr.code === "ECONNABORTED" ||
            cloudErr.message?.includes("timeout")
          ) {
            msg =
              "Tempo limite de conexão com a nuvem esgotado (timeout de 20s). Verifique sua conexão e tente novamente.";
          } else if (cloudErr.message) {
            msg = cloudErr.message;
          }

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
        "Servidor de autenticação na nuvem indisponível. Para conectar este computador manualmente, insira seu Access Token e Phone Number ID na aba Configurações > Modo Técnico."
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
            redirect_uri: effectiveRedirectUri,
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
   * Identifica o WABA ID e os dados do número de telefone vinculados ao token através de busca profunda multi-nível
   * Nível 1: debug_token (todos os escopos granulares WhatsApp e Business)
   * Nível 2: Portfólio de Negócios (/me/businesses -> owned_whatsapp_business_accounts / client_whatsapp_business_accounts)
   * Nível 3: Contas atribuídas/delegadas (/me/assigned_whatsapp_business_accounts)
   * Nível 4: Borda direta de contas (/me/whatsapp_business_accounts)
   * @param {string} userAccessToken - Token do cliente obtido na troca do OAuth
   * @param {string} [preResolvedWabaId=null] - WABA ID previamente resolvido pelo backend ou evento do signup
   * @param {object} [preResolvedPhone=null] - Dados do telefone previamente resolvidos pelo backend
   * @returns {Promise<{ wabaId: string, phone: object }>}
   */
  async fetchClientWabaAndPhone(
    userAccessToken,
    preResolvedWabaId = null,
    preResolvedPhone = null
  ) {
    console.log(`🔍 [WABA Discovery] Iniciando resolução de WABA e Telefone... (preResolvedWabaId: ${preResolvedWabaId || "nenhum"})`);

    // Se o backend seguro já resolveu tanto o WABA ID quanto o Telefone, retorna direto
    if (preResolvedWabaId && preResolvedPhone) {
      console.log(`✅ [WABA Discovery] Utilizando credenciais pré-resolvidas: WABA=${preResolvedWabaId}, Phone=${preResolvedPhone.id || preResolvedPhone.display_phone_number}`);
      return {
        wabaId: preResolvedWabaId,
        phone: preResolvedPhone,
      };
    }

    const config = metaConfig.getConfig();
    const appId = config.appId || process.env.META_APP_ID || "1824502742321385";
    const appSecret = config.appSecret || process.env.META_APP_SECRET;

    let wabaId = preResolvedWabaId ? String(preResolvedWabaId).trim() : null;
    let discoveredPhone = preResolvedPhone || null;
    let discoveryMethod = preResolvedWabaId ? "pre-resolved" : null;

    // =========================================================================
    // NÍVEL 1: Inspeciona debug_token (apenas se appSecret estiver disponível - Dev Mode)
    // =========================================================================
    if (!wabaId && appSecret) {
      try {
        console.log("🔍 [WABA Discovery] Nível 1: Inspecionando debug_token com appSecret...");
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
        console.log(`🔍 [WABA Discovery] debug_token granular_scopes:`, JSON.stringify(granularScopes.map(s => ({ scope: s.scope, targetsCount: s.target_ids?.length || 0 }))));

        const targetScopeNames = [
          "whatsapp_business_management",
          "whatsapp_business_messaging",
          "business_management",
        ];

        for (const scopeName of targetScopeNames) {
          const match = granularScopes.find((s) => s.scope === scopeName);
          if (match && Array.isArray(match.target_ids) && match.target_ids.length > 0) {
            wabaId = match.target_ids[0];
            discoveryMethod = `debug_token (${scopeName})`;
            console.log(`✅ [WABA Discovery] WABA ID encontrado via ${discoveryMethod}: ${wabaId}`);
            break;
          }
        }
      } catch (debugErr) {
        console.warn("⚠️ [WABA Discovery] Nível 1 (debug_token) indisponível ou falhou:", debugErr.response?.data?.error?.message || debugErr.message);
      }
    }

    // =========================================================================
    // NÍVEL 2: Portfólio de Negócios do Cliente (owned & client WABAs em /me/businesses)
    // Esse é o caminho onde 99% das contas corporativas e novos Embedded Signups residem
    // =========================================================================
    if (!wabaId) {
      try {
        console.log("🔍 [WABA Discovery] Nível 2: Consultando portfólio de negócios (/me?fields=businesses)...");
        const businessesRes = await axios.get(
          `${config.baseUrl}/${config.apiVersion}/me`,
          {
            params: {
              access_token: userAccessToken,
              fields: "id,name,businesses{id,name,owned_whatsapp_business_accounts{id,name,currency,timezone_id,phone_numbers{id,display_phone_number,verified_name,quality_rating,code_verification_status}},client_whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number,verified_name}}}",
            },
            timeout: 10000,
          }
        );

        const businesses = businessesRes.data?.businesses?.data || [];
        console.log(`🔍 [WABA Discovery] Nível 2: ${businesses.length} empresa(s) retornada(s) no portfólio.`);

        for (const b of businesses) {
          const ownedAccounts = b.owned_whatsapp_business_accounts?.data || [];
          if (ownedAccounts.length > 0) {
            wabaId = ownedAccounts[0].id;
            discoveryMethod = `businesses.owned (${b.name || b.id})`;
            console.log(`✅ [WABA Discovery] WABA ID encontrado via ${discoveryMethod}: ${wabaId}`);

            const phones = ownedAccounts[0].phone_numbers?.data || [];
            if (phones.length > 0) {
              discoveredPhone = phones.find(p => p.code_verification_status === "VERIFIED" || p.verified_name) || phones[0];
              console.log(`📱 [WABA Discovery] Linha telefônica associada encontrada: ${discoveredPhone.display_phone_number || discoveredPhone.id}`);
            }
            break;
          }

          const clientAccounts = b.client_whatsapp_business_accounts?.data || [];
          if (clientAccounts.length > 0) {
            wabaId = clientAccounts[0].id;
            discoveryMethod = `businesses.client (${b.name || b.id})`;
            console.log(`✅ [WABA Discovery] WABA ID encontrado via ${discoveryMethod}: ${wabaId}`);

            const phones = clientAccounts[0].phone_numbers?.data || [];
            if (phones.length > 0) {
              discoveredPhone = phones.find(p => p.code_verification_status === "VERIFIED" || p.verified_name) || phones[0];
            }
            break;
          }
        }
      } catch (bizErr) {
        console.warn("⚠️ [WABA Discovery] Nível 2 (consulta direta /me) falhou. Tentando busca iterativa em /me/businesses:", bizErr.response?.data?.error?.message || bizErr.message);

        // Fallback do Nível 2: Consulta iterativa empresa por empresa
        try {
          const rawBizRes = await axios.get(
            `${config.baseUrl}/${config.apiVersion}/me/businesses`,
            {
              params: { access_token: userAccessToken, fields: "id,name" },
              timeout: 10000,
            }
          );

          const rawBusinesses = rawBizRes.data?.data || [];
          console.log(`🔍 [WABA Discovery] Nível 2 (Iterativo): Encontradas ${rawBusinesses.length} empresas. Consultando contas...`);

          for (const b of rawBusinesses) {
            try {
              const ownedRes = await axios.get(
                `${config.baseUrl}/${config.apiVersion}/${b.id}/owned_whatsapp_business_accounts`,
                {
                  params: {
                    access_token: userAccessToken,
                    fields: "id,name,phone_numbers{id,display_phone_number,verified_name,quality_rating,code_verification_status}",
                  },
                  timeout: 10000,
                }
              );

              const ownedList = ownedRes.data?.data || [];
              if (ownedList.length > 0) {
                wabaId = ownedList[0].id;
                discoveryMethod = `iterative.owned (${b.name || b.id})`;
                console.log(`✅ [WABA Discovery] WABA ID encontrado via ${discoveryMethod}: ${wabaId}`);

                const phones = ownedList[0].phone_numbers?.data || [];
                if (phones.length > 0) {
                  discoveredPhone = phones.find(p => p.code_verification_status === "VERIFIED" || p.verified_name) || phones[0];
                }
                break;
              }
            } catch (ownedErr) {
              console.warn(`Aviso ao consultar WABAs da empresa ${b.id}:`, ownedErr.message);
            }
          }
        } catch (rawBizErr) {
          console.warn("Aviso ao buscar /me/businesses iterativo:", rawBizErr.message);
        }
      }
    }

    // =========================================================================
    // NÍVEL 3: Contas atribuídas/delegadas ao usuário (/me/assigned_whatsapp_business_accounts)
    // =========================================================================
    if (!wabaId) {
      try {
        console.log("🔍 [WABA Discovery] Nível 3: Consultando contas atribuídas (/me/assigned_whatsapp_business_accounts)...");
        const sharedWabaRes = await axios.get(
          `${config.baseUrl}/${config.apiVersion}/me/assigned_whatsapp_business_accounts`,
          {
            params: {
              access_token: userAccessToken,
              fields: "id,name,phone_numbers{id,display_phone_number,verified_name,quality_rating,code_verification_status}",
            },
            timeout: 10000,
          }
        );

        const accounts = sharedWabaRes.data?.data || [];
        console.log(`🔍 [WABA Discovery] Nível 3: ${accounts.length} conta(s) atribuída(s) retornada(s).`);

        if (accounts.length > 0) {
          wabaId = accounts[0].id;
          discoveryMethod = "assigned_whatsapp_business_accounts";
          console.log(`✅ [WABA Discovery] WABA ID encontrado via ${discoveryMethod}: ${wabaId}`);

          const phones = accounts[0].phone_numbers?.data || [];
          if (phones.length > 0) {
            discoveredPhone = phones.find(p => p.code_verification_status === "VERIFIED" || p.verified_name) || phones[0];
          }
        }
      } catch (fallbackErr) {
        console.warn("⚠️ [WABA Discovery] Nível 3 (assigned WABAs) falhou:", fallbackErr.response?.data?.error?.message || fallbackErr.message);
      }
    }

    // =========================================================================
    // NÍVEL 4: Borda direta de contas WABA (/me/whatsapp_business_accounts)
    // =========================================================================
    if (!wabaId) {
      try {
        console.log("🔍 [WABA Discovery] Nível 4: Consultando borda direta (/me/whatsapp_business_accounts)...");
        const directWabaRes = await axios.get(
          `${config.baseUrl}/${config.apiVersion}/me/whatsapp_business_accounts`,
          {
            params: {
              access_token: userAccessToken,
              fields: "id,name,phone_numbers{id,display_phone_number,verified_name,quality_rating,code_verification_status}",
            },
            timeout: 10000,
          }
        );

        const directAccounts = directWabaRes.data?.data || [];
        console.log(`🔍 [WABA Discovery] Nível 4: ${directAccounts.length} conta(s) direta(s) retornada(s).`);

        if (directAccounts.length > 0) {
          wabaId = directAccounts[0].id;
          discoveryMethod = "direct_whatsapp_business_accounts";
          console.log(`✅ [WABA Discovery] WABA ID encontrado via ${discoveryMethod}: ${wabaId}`);

          const phones = directAccounts[0].phone_numbers?.data || [];
          if (phones.length > 0) {
            discoveredPhone = phones.find(p => p.code_verification_status === "VERIFIED" || p.verified_name) || phones[0];
          }
        }
      } catch (directErr) {
        console.warn("⚠️ [WABA Discovery] Nível 4 (direct WABAs) falhou:", directErr.response?.data?.error?.message || directErr.message);
      }
    }

    // =========================================================================
    // VALIDAÇÃO FINAL DO WABA ID
    // =========================================================================
    if (!wabaId) {
      console.error("❌ [WABA Discovery] Falha crítica: Nenhum WABA ID pôde ser identificado após executar todos os 4 níveis de busca.");
      throw new Error(
        "Não foi possível identificar a Conta do WhatsApp Business (WABA ID) do cliente. Certifique-se de que durante a autorização na Meta você selecionou ou criou um Portfólio Empresarial e uma Conta do WhatsApp Business com linha telefônica associada."
      );
    }

    console.log(`🎯 [WABA Discovery] Sucesso! WABA ID definitivo: ${wabaId} [Método: ${discoveryMethod}]`);

    // Se o telefone já foi resolvido em um dos níveis acima ou no preResolvedPhone, retorna direto
    if (discoveredPhone) {
      console.log(`📱 [Phone Discovery] Utilizando linha telefônica já descoberta: ${discoveredPhone.display_phone_number || discoveredPhone.id} (ID: ${discoveredPhone.id})`);
      return { wabaId, phone: discoveredPhone };
    }

    // =========================================================================
    // RESOLUÇÃO DE TELEFONE: Consulta dedicada a /{wabaId}/phone_numbers
    // =========================================================================
    console.log(`📱 [Phone Discovery] Consultando linhas telefônicas associadas ao WABA ${wabaId}...`);
    try {
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
      console.log(`📱 [Phone Discovery] Encontrado(s) ${phones.length} número(s) para o WABA ${wabaId}.`);

      if (phones.length === 0) {
        throw new Error(
          `Conta do WhatsApp Business identificada (${wabaId}), porém nenhum número de telefone foi encontrado cadastrado nela no painel da Meta.`
        );
      }

      // Prioriza número com verificação confirmada ou nome aprovado caso haja múltiplos
      const verifiedPhone = phones.find(
        (p) => p.code_verification_status === "VERIFIED" || p.verified_name
      );
      const primaryPhone = verifiedPhone || phones[0];
      console.log(`📱 [Phone Discovery] Linha primária selecionada: ${primaryPhone.display_phone_number || primaryPhone.id} (ID: ${primaryPhone.id})`);

      return {
        wabaId,
        phone: primaryPhone,
      };
    } catch (phoneErr) {
      console.error(`❌ [Phone Discovery] Erro ao consultar números do WABA ${wabaId}:`, phoneErr.response?.data?.error?.message || phoneErr.message);
      throw new Error(
        phoneErr.response?.data?.error?.message ||
        phoneErr.message ||
        `Falha ao obter dados do número de telefone associado ao WABA ${wabaId}.`
      );
    }
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
   * assina o webhook, persiste as credenciais, valida a conexão e salva relatório de telemetria
   * @param {string} authCode - Código retornado no fluxo OAuth
   * @param {string} [redirectUri] - URI de redirecionamento utilizada
   * @param {string} [preResolvedWabaId=null] - WABA ID pré-resolvido opcional capturado do evento da Meta
   * @param {string} [preResolvedPhoneId=null] - Phone Number ID pré-resolvido opcional capturado do evento da Meta
   * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
   */
  async completeOnboarding(
    authCode,
    redirectUri = null,
    preResolvedWabaId = null,
    preResolvedPhoneId = null
  ) {
    const config = metaConfig.getConfig();
    const effectiveRedirectUri = redirectUri || this.getDefaultRedirectUri();

    const diagnosticReport = {
      timestamp: new Date().toISOString(),
      appId: config.appId,
      configId: config.configId || "(não configurado)",
      redirectUri: effectiveRedirectUri,
      preResolvedInput: {
        wabaId: preResolvedWabaId || null,
        phoneId: preResolvedPhoneId || null,
      },
      stages: [],
      discovered: {
        wabaId: null,
        phoneNumberId: null,
        displayPhoneNumber: null,
      },
      success: false,
      error: null,
    };

    try {
      console.log(`⚡ [Onboarding] Trocando código de autorização por Access Token... (WABA prévio: ${preResolvedWabaId || "nenhum"})`);
      const t0 = Date.now();
      const tokenData = await this.exchangeCodeForToken(
        authCode,
        effectiveRedirectUri,
        null,
        preResolvedWabaId,
        preResolvedPhoneId
      );
      const userAccessToken = tokenData.access_token;

      diagnosticReport.stages.push({
        stage: "exchangeCodeForToken",
        durationMs: Date.now() - t0,
        tokenPreview: this.maskSecret(userAccessToken),
        tokenType: tokenData.token_type || "bearer",
        returnedWabaId: tokenData.wabaId || null,
        returnedPhoneId: tokenData.phone?.id || null,
        hasCustomToken: !!tokenData.firebaseCustomToken,
        status: "OK",
      });

      console.log("⚡ [Onboarding] Identificando WABA ID e Número do Cliente...");
      const t1 = Date.now();
      const { wabaId, phone } = await this.fetchClientWabaAndPhone(
        userAccessToken,
        tokenData.wabaId || preResolvedWabaId,
        tokenData.phone || (preResolvedPhoneId ? { id: preResolvedPhoneId } : null)
      );

      diagnosticReport.discovered.wabaId = wabaId;
      diagnosticReport.discovered.phoneNumberId = phone?.id || null;
      diagnosticReport.discovered.displayPhoneNumber = phone?.display_phone_number || null;
      diagnosticReport.stages.push({
        stage: "fetchClientWabaAndPhone",
        durationMs: Date.now() - t1,
        wabaId,
        phoneNumberId: phone?.id || null,
        displayPhoneNumber: phone?.display_phone_number || null,
        verifiedName: phone?.verified_name || null,
        status: "OK",
      });

      console.log(`⚡ [Onboarding] WABA encontrado: ${wabaId} | Número: ${phone.display_phone_number} (ID: ${phone.id})`);

      // Assina os webhooks para receber notificações
      const t2 = Date.now();
      const subRes = await this.subscribeAppToWaba(wabaId, userAccessToken);
      diagnosticReport.stages.push({
        stage: "subscribeAppToWaba",
        durationMs: Date.now() - t2,
        result: subRes,
        status: "OK",
      });

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
      diagnosticReport.stages.push({
        stage: "checkConnectionStatus",
        status: health.success ? "OK" : "WARNING",
        health: health.data || null,
      });

      diagnosticReport.success = true;
      this.saveDiagnosticsReport(diagnosticReport);

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
      diagnosticReport.success = false;
      diagnosticReport.error = error.message || "Falha na ativação da conta Meta.";
      diagnosticReport.stack = error.stack || null;
      this.saveDiagnosticsReport(diagnosticReport);

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
