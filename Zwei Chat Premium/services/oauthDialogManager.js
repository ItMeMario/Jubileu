// services/oauthDialogManager.js
// Gerenciador de Janela Modal OAuth para Login e Embedded Signup da Meta

const { BrowserWindow } = require("electron");
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
      const redirectUri = "https://www.facebook.com/connect/login_success.html";
      const authUrl = metaOnboardingService.getEmbeddedSignupUrl(redirectUri);

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
        },
      });

      let isResolved = false;

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
       * Inspeciona a URL de navegação para identificar o retorno do OAuth
       * @param {string} navUrl
       */
      const checkNavigation = (navUrl) => {
        if (!navUrl) return;

        try {
          const parsed = new URL(navUrl);

          // Verifica se atingiu a URL de retorno ou possui os parâmetros code / error
          const isRedirectTarget =
            navUrl.startsWith(redirectUri) ||
            parsed.pathname.includes("login_success") ||
            parsed.searchParams.has("code") ||
            parsed.searchParams.has("error");

          if (isRedirectTarget) {
            const code = parsed.searchParams.get("code");
            const error =
              parsed.searchParams.get("error_description") ||
              parsed.searchParams.get("error");

            if (code) {
              finish({ success: true, code, redirectUri });
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
          if (validatedURL && validatedURL.startsWith(redirectUri)) return;
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
