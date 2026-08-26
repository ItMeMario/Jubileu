// main/ipc/authHandlers.js
const authService = require("../../services/authService");
const firebaseService = require("../../services/firebaseService");

class AuthHandlers {
  constructor(windowManager) {
    this.windowManager = windowManager;
    this.removeStateListener = null;
  }

  register(ipcMain) {
    // 1. Obter estado atual de autenticação e licença
    ipcMain.handle("auth:get-state", async () => {
      return authService.getAuthState();
    });

    // 2. Login
    ipcMain.handle("auth:login", async (event, { email, password } = {}) => {
      return authService.login(email || "", password || "");
    });

    // 3. Cadastro
    ipcMain.handle("auth:register", async (event, { name, email, password } = {}) => {
      return authService.register(name || "", email || "", password || "");
    });

    // 4. Recuperação de Senha
    ipcMain.handle("auth:reset-password", async (event, { email } = {}) => {
      return authService.sendPasswordReset(email || "");
    });

    // 5. Logout
    ipcMain.handle("auth:logout", async () => {
      return authService.logout();
    });

    // 6. Ativação de Chave de Licença
    ipcMain.handle("auth:activate-key", async (event, { key } = {}) => {
      return authService.activateLicenseKey(key || "");
    });

    // 7. Salvar e aplicar configuração do Firebase
    ipcMain.handle("auth:save-firebase-config", async (event, config) => {
      try {
        const result = await firebaseService.reinitialize(config);
        if (result.success) {
          await authService.initialize();
        }
        return { success: true, result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // 8. Checagem manual de renovação
    ipcMain.handle("auth:check-renewal", async () => {
      return authService.checkRenewal();
    });

    // Escuta mudanças de estado no AuthService e transmite para a janela do Renderer
    this.removeStateListener = authService.addStateListener((state) => {
      const mainWindow = this.windowManager?.getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("auth:state-changed", state);
      }
    });

    console.log("🔐 Handlers de Autenticação e Licença (IPC) registrados com sucesso.");
  }

  unregister(ipcMain) {
    ipcMain.removeHandler("auth:get-state");
    ipcMain.removeHandler("auth:login");
    ipcMain.removeHandler("auth:register");
    ipcMain.removeHandler("auth:reset-password");
    ipcMain.removeHandler("auth:logout");
    ipcMain.removeHandler("auth:activate-key");
    ipcMain.removeHandler("auth:save-firebase-config");
    ipcMain.removeHandler("auth:check-renewal");

    if (this.removeStateListener) {
      this.removeStateListener();
      this.removeStateListener = null;
    }
  }
}

module.exports = AuthHandlers;
