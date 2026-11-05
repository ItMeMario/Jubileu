// services/oauthDialogManager.js
// Gerenciador de Janela Modal OAuth para Login e Embedded Signup da Meta

const { BrowserWindow, app } = require("electron");
const metaConfig = require("../config/metaConfig");
const { metaOnboardingService } = require("./metaOnboardingService");

class OAuthDialogManager {
  /**
   * Abre a janela modal do Electron apontando para o fluxo oficial de login da Meta
   * Intercepta a navegação de retorno para extrair o código de autorização OAuth
   * @param {BrowserWindow} parentWindow - Janela principal pai
   * @returns {Promise<{ success: boolean, code?: string, redirectUri?: string, cancelled?: boolean, error?: string }>}
   */
  openMetaAuthDialog(parentWindow) {
    return new Promise((resolve) => {
      const config = metaConfig.getConfig();
      const redirectUri =
        config.redirectUri ||
        process.env.META_REDIRECT_URI ||
        "https://zwei-chat-c9d1f.firebaseapp.com/__/auth/handler";
      const expectedState = metaOnboardingService.generateOAuthState();
      const authUrl = metaOnboardingService.getEmbeddedSignupUrl(redirectUri, expectedState);

      const isValidParent = parentWindow && !parentWindow.isDestroyed();

      let authWindow = new BrowserWindow({
        width: 650,
        height: 750,
        minWidth: 500,
        minHeight: 600,
        parent: isValidParent ? parentWindow : null,
        modal: isValidParent,
        title: "Conectar WhatsApp Comercial - Meta Oficial",
        backgroundColor: "#11151c",
        autoHideMenuBar: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
          devTools: !app.isPackaged,
        },
      });

      // Remove identificador Electron do User-Agent para compatibilidade plena com o fluxo Embedded Signup v4 da Meta
      const defaultUa = authWindow.webContents.getUserAgent();
      if (defaultUa) {
        authWindow.webContents.setUserAgent(
          defaultUa.replace(/\s*Electron\/[\d.]+/i, "")
        );
      }

      let isResolved = false;
      let capturedWabaId = null;
      let capturedPhoneId = null;

      const finish = (result) => {
        if (!isResolved) {
          isResolved = true;
          if (authWindow && !authWindow.isDestroyed()) {
            authWindow.destroy();
          }
          authWindow = null;
          resolve(result);
        }
      };

      /**
       * Injeta ouvinte de postMessage para capturar o evento WA_EMBEDDED_SIGNUP emitido pela Meta (v3/v4)
       */
      const injectMessageListener = () => {
        if (!authWindow || authWindow.isDestroyed()) return;
        const script = `
          (function() {
            if (window.__waEmbeddedListenerAttached) return;
            window.__waEmbeddedListenerAttached = true;
            window.addEventListener('message', function(event) {
              try {
                var raw = event.data;
                var parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                if (
                  parsed &&
                  (parsed.type === 'WA_EMBEDDED_SIGNUP' ||
                    parsed.event === 'FINISH' ||
                    parsed.event === 'FINISH_ONLY_WABA' ||
                    parsed.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING')
                ) {
                  console.log('__WA_EMBEDDED_SIGNUP__:' + JSON.stringify(parsed));
                }
              } catch(e) {}
            });
          })();
        `;
        authWindow.webContents.executeJavaScript(script).catch(() => {});
      };

      authWindow.webContents.on("dom-ready", injectMessageListener);
      authWindow.webContents.on("did-finish-load", injectMessageListener);
      authWindow.webContents.on("did-frame-finish-load", injectMessageListener);

      // Escuta console-message emitida pelo script injetado para extrair waba_id e phone_number_id
      authWindow.webContents.on("console-message", (_event, level, message) => {
        if (typeof message === "string" && message.startsWith("__WA_EMBEDDED_SIGNUP__:")) {
          try {
            const rawJson = message.slice("__WA_EMBEDDED_SIGNUP__:".length);
            const payload = JSON.parse(rawJson);
            console.log("📩 [OAuthDialog] Evento WA_EMBEDDED_SIGNUP interceptado:", JSON.stringify(payload));
            const detail = payload.data || payload;
            if (detail.waba_id && !capturedWabaId) {
              capturedWabaId = String(detail.waba_id);
              console.log(`🎯 [OAuthDialog] WABA ID capturado via evento Meta: ${capturedWabaId}`);
            }
            if (detail.phone_number_id && !capturedPhoneId) {
              capturedPhoneId = String(detail.phone_number_id);
              console.log(`📱 [OAuthDialog] Phone Number ID capturado via evento Meta: ${capturedPhoneId}`);
            }
          } catch (e) {
            console.warn("Aviso ao processar mensagem do Embedded Signup:", e.message);
          }
        }
      });

      /**
       * Inspeciona a URL de navegação para identificar o retorno do OAuth
       * @param {string} navUrl
       */
      const checkNavigation = (navUrl) => {
        if (!navUrl) return;

        try {
          const parsed = new URL(navUrl);

          const isFacebookHost =
            parsed.hostname === "facebook.com" ||
            parsed.hostname.endsWith(".facebook.com");

          // Verifica se atingiu a URL oficial de callback (ignorando navegações intermediárias internas do facebook.com)
          const isRedirectTarget =
            navUrl.startsWith(redirectUri) ||
            parsed.pathname.includes("/auth/handler") ||
            parsed.pathname.includes("login_success") ||
            (!isFacebookHost &&
              (parsed.searchParams.has("code") ||
                parsed.searchParams.has("error")));

          // Inspeciona se a URL de callback ou hash traz waba_id / phone_number_id
          const urlWaba = parsed.searchParams.get("waba_id") || parsed.searchParams.get("wabaId");
          const urlPhone = parsed.searchParams.get("phone_number_id") || parsed.searchParams.get("phoneNumberId");
          if (urlWaba && !capturedWabaId) capturedWabaId = urlWaba;
          if (urlPhone && !capturedPhoneId) capturedPhoneId = urlPhone;

          if (parsed.hash) {
            try {
              const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ""));
              const hashWaba = hashParams.get("waba_id") || hashParams.get("wabaId");
              const hashPhone = hashParams.get("phone_number_id") || hashParams.get("phoneNumberId");
              if (hashWaba && !capturedWabaId) capturedWabaId = hashWaba;
              if (hashPhone && !capturedPhoneId) capturedPhoneId = hashPhone;
            } catch (hashErr) {}
          }

          if (isRedirectTarget) {
            const code = parsed.searchParams.get("code");
            const incomingState = parsed.searchParams.get("state");
            const error =
              parsed.searchParams.get("error_description") ||
              parsed.searchParams.get("error");

            if (code) {
              // Validação estrita de segurança anti-CSRF
              const isStateValid = metaOnboardingService.validateOAuthState(incomingState, expectedState);
              if (!isStateValid) {
                console.error("⛔ [Alerta de Segurança] Tentativa de CSRF detectada no retorno do OAuth da Meta!");
                finish({
                  success: false,
                  cancelled: false,
                  error: "Violação de segurança (CSRF): o parâmetro de estado retornado pela Meta é inválido ou ausente.",
                });
                return;
              }

              console.log(`✅ [OAuthDialog] Autorização Meta bem-sucedida. WABA pré-resolvido: ${capturedWabaId || "nenhum"}, Phone pré-resolvido: ${capturedPhoneId || "nenhum"}`);
              finish({
                success: true,
                code,
                redirectUri,
                state: incomingState,
                preResolvedWabaId: capturedWabaId,
                preResolvedPhoneId: capturedPhoneId,
              });
            } else if (error) {
              finish({
                success: false,
                cancelled: false,
                error: decodeURIComponent(error),
              });
            }
          }
        } catch (e) {
          // Ignora URLs com esquemas não parseáveis pelo URL padrão
        }
      };

      // Listeners de navegação para capturar o redirecionamento
      authWindow.webContents.on("will-navigate", (_event, navUrl) => {
        checkNavigation(navUrl);
      });

      authWindow.webContents.on("will-redirect", (_event, navUrl) => {
        checkNavigation(navUrl);
      });

      authWindow.webContents.on("did-navigate", (_event, navUrl) => {
        checkNavigation(navUrl);
      });

      // Falhas de rede / carregamento
      authWindow.webContents.on(
        "did-fail-load",
        (_event, errorCode, errorDescription, validatedURL) => {
          // Se falhou no redirectUri após captura ou se for cancelamento de navegação, ignora
          if (
            validatedURL &&
            (validatedURL.startsWith(redirectUri) ||
              validatedURL.includes("/auth/handler") ||
              validatedURL.includes("login_success"))
          ) {
            return;
          }
          if (errorCode === -3) return; // ERR_ABORTED

          finish({
            success: false,
            error: `Falha na conexão com a Meta: ${errorDescription} (${errorCode})`,
          });
        }
      );

      // Usuário fechou o pop-up manualmente
      authWindow.on("closed", () => {
        finish({
          success: false,
          cancelled: true,
          error: "O processo de conexão foi cancelado pelo usuário.",
        });
      });

      console.log("⚡ [OAuthDialog] Abrindo janela oficial de login da Meta:", authUrl);
      authWindow.loadURL(authUrl).catch((err) => {
        finish({
          success: false,
          error: `Erro ao iniciar diálogo da Meta: ${err.message}`,
        });
      });
    });
  }
}

const oauthDialogManager = new OAuthDialogManager();
module.exports = {
  OAuthDialogManager,
  oauthDialogManager,
};
