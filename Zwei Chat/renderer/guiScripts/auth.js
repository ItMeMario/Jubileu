// renderer/guiScripts/auth.js

(function () {
  // Elementos do DOM
  const authOverlay = document.getElementById("auth-overlay");
  const authCard = document.getElementById("auth-card");
  const authTabs = document.getElementById("auth-tabs");
  const authAlert = document.getElementById("auth-alert");

  // Abas
  const tabLogin = document.getElementById("tab-login");
  const tabRegister = document.getElementById("tab-register");

  // Visualizações (Views)
  const viewLogin = document.getElementById("auth-view-login");
  const viewRegister = document.getElementById("auth-view-register");
  const viewForgot = document.getElementById("auth-view-forgot");
  const viewActivate = document.getElementById("auth-view-activate");
  const viewConfig = document.getElementById("auth-view-config");

  // Formulários
  const formLogin = document.getElementById("form-login");
  const formRegister = document.getElementById("form-register");
  const formForgot = document.getElementById("form-forgot");
  const formActivate = document.getElementById("form-activate");
  const formConfig = document.getElementById("form-config");

  // Inputs
  const inputLoginEmail = document.getElementById("login-email");
  const inputLoginPassword = document.getElementById("login-password");
  const inputRegisterName = document.getElementById("register-name");
  const inputRegisterEmail = document.getElementById("register-email");
  const inputRegisterPassword = document.getElementById("register-password");
  const inputRegisterConfirm = document.getElementById("register-confirm-password");
  const inputForgotEmail = document.getElementById("forgot-email");
  const inputLicenseKey = document.getElementById("input-license-key");

  // Botões e Links de Navegação
  const linkToRegister = document.getElementById("link-to-register");
  const linkToLogin = document.getElementById("link-to-login");
  const linkToForgot = document.getElementById("link-to-forgot");
  const linkBackToLogin = document.getElementById("link-back-to-login");
  const btnLogoutFromActivate = document.getElementById("btn-logout-activate");
  const btnConfigToggle = document.getElementById("btn-auth-config-toggle");
  const btnCloseConfig = document.getElementById("btn-close-config");

  // Elementos da Sidebar
  const sidebarUserWidget = document.getElementById("sidebar-user-widget");
  const sidebarUserEmail = document.getElementById("sidebar-user-email");
  const sidebarLicenseBadge = document.getElementById("sidebar-license-badge");
  const sidebarBtnLogout = document.getElementById("sidebar-btn-logout");

  // Estado Local
  let currentAuthState = {
    isAuthenticated: false,
    isActivated: false,
    isFirebaseConfigured: false,
    user: null,
    license: null
  };

  /**
   * Exibe uma mensagem de alerta/notificação no card de autenticação
   */
  function showAlert(message, type = "error", duration = 6000) {
    if (!authAlert) return;

    authAlert.className = `auth-alert ${type} active`;
    const icon = type === "error" ? "⚠️" : type === "success" ? "✅" : "ℹ️";
    authAlert.innerHTML = `<span class="auth-alert-icon">${icon}</span><span>${message}</span>`;

    if (duration > 0) {
      setTimeout(() => {
        authAlert.classList.remove("active");
      }, duration);
    }
  }

  function hideAlert() {
    if (authAlert) {
      authAlert.classList.remove("active");
    }
  }

  /**
   * Alterna o estado de carregamento de um botão
   */
  function setButtonLoading(button, isLoading, text = "") {
    if (!button) return;
    button.disabled = isLoading;
    if (isLoading) {
      button.dataset.originalText = button.innerHTML;
      button.innerHTML = `<span class="btn-spinner"></span> ${text || "Processando..."}`;
    } else {
      button.innerHTML = button.dataset.originalText || text;
    }
  }

  /**
   * Alterna a visualização ativa (Login, Cadastro, Recuperação, Ativação, Configuração)
   */
  function showView(viewName) {
    hideAlert();

    const views = {
      login: viewLogin,
      register: viewRegister,
      forgot: viewForgot,
      activate: viewActivate,
      config: viewConfig
    };

    // Oculta todas as views
    Object.values(views).forEach(v => {
      if (v) v.classList.remove("active");
    });

    // Ativa a view solicitada
    if (views[viewName]) {
      views[viewName].classList.add("active");
    }

    // Gerencia visibilidade das abas (Login / Cadastro)
    if (authTabs) {
      if (viewName === "login" || viewName === "register") {
        authTabs.style.display = "flex";
        if (tabLogin) tabLogin.classList.toggle("active", viewName === "login");
        if (tabRegister) tabRegister.classList.toggle("active", viewName === "register");
      } else {
        authTabs.style.display = "none";
      }
    }
  }

  /**
   * Atualiza a interface com base no estado global de autenticação
   */
  function renderAuthState(state) {
    currentAuthState = state;

    if (!state.isAuthenticated) {
      // Usuário não está logado -> Exibe modal e vai para tela de login
      if (authOverlay) authOverlay.classList.remove("hidden");
      if (sidebarUserWidget) sidebarUserWidget.style.display = "none";
      showView("login");
    } else if (state.isAuthenticated && !state.isActivated) {
      // Usuário logado mas sem licença ativa -> Tela de ativação de chave
      if (authOverlay) authOverlay.classList.remove("hidden");
      if (sidebarUserWidget) sidebarUserWidget.style.display = "none";

      const activateUserEmail = document.getElementById("activate-user-email");
      if (activateUserEmail && state.user) {
        activateUserEmail.textContent = state.user.email;
      }

      showView("activate");
    } else if (state.isAuthenticated && state.isActivated) {
      // Usuário logado e produto ativado -> Desbloqueia app e atualiza sidebar
      if (authOverlay) authOverlay.classList.add("hidden");

      if (sidebarUserWidget) {
        sidebarUserWidget.style.display = "flex";
        if (sidebarUserEmail && state.user) {
          sidebarUserEmail.textContent = state.user.displayName || state.user.email;
          sidebarUserEmail.title = state.user.email;
        }
        if (sidebarLicenseBadge && state.license) {
          sidebarLicenseBadge.textContent = state.license.plan === "lifetime" ? "Vitalício" : "Ativo";
        }
      }
    }
  }

  /**
   * Formatação automática da chave de licença no padrão ZWEI-XXXX-XXXX-XXXX
   */
  function setupLicenseKeyMask() {
    if (!inputLicenseKey) return;

    inputLicenseKey.addEventListener("input", (e) => {
      let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");

      // Se não começa com ZWEI, adiciona ou preserva conforme o usuário digita
      if (val.length > 0 && !val.startsWith("ZWEI")) {
        // Se o usuário colou uma chave sem ZWEI ou está digitando
        if (val.length <= 4 && "ZWEI".startsWith(val)) {
          // Deixa digitar Z, ZW, ZWE, ZWEI
        }
      }

      // Agrupa em blocos de 4 caracteres separados por hífen
      const parts = [];
      for (let i = 0; i < val.length && i < 16; i += 4) {
        parts.push(val.substring(i, i + 4));
      }

      e.target.value = parts.join("-");
    });

    // Suporte a colar (Paste)
    inputLicenseKey.addEventListener("paste", (e) => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData).getData("text");
      let clean = pasteData.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
      
      const parts = [];
      for (let i = 0; i < clean.length; i += 4) {
        parts.push(clean.substring(i, i + 4));
      }
      inputLicenseKey.value = parts.join("-");
    });
  }

  /**
   * Configura alternância de visibilidade das senhas
   */
  function setupPasswordToggles() {
    document.querySelectorAll(".auth-input-toggle-pwd").forEach((btn) => {
      btn.addEventListener("click", () => {
        const targetId = btn.dataset.target;
        const input = document.getElementById(targetId);
        if (input) {
          if (input.type === "password") {
            input.type = "text";
            btn.textContent = "🙈";
          } else {
            input.type = "password";
            btn.textContent = "👁️";
          }
        }
      });
    });
  }

  /**
   * Handlers de Formulários
   */
  function setupFormHandlers() {
    // 1. Formulário de Login
    if (formLogin) {
      formLogin.addEventListener("submit", async (e) => {
        e.preventDefault();
        hideAlert();

        const email = inputLoginEmail.value.trim();
        const password = inputLoginPassword.value;
        const btnSubmit = formLogin.querySelector("button[type='submit']");

        if (!email || !password) {
          showAlert("Preencha todos os campos para continuar.");
          return;
        }

        try {
          setButtonLoading(btnSubmit, true, "Entrando...");
          const result = await window.authAPI.login(email, password);

          if (!result.success) {
            showAlert(result.message || "Erro ao realizar login.");
          } else {
            // Sucesso - o listener global cuidará da transição
          }
        } catch (err) {
          showAlert(err.message || "Falha de comunicação com o servidor de autenticação.");
        } finally {
          setButtonLoading(btnSubmit, false);
        }
      });
    }

    // 2. Formulário de Cadastro
    if (formRegister) {
      formRegister.addEventListener("submit", async (e) => {
        e.preventDefault();
        hideAlert();

        const name = inputRegisterName.value.trim();
        const email = inputRegisterEmail.value.trim();
        const password = inputRegisterPassword.value;
        const confirm = inputRegisterConfirm.value;
        const btnSubmit = formRegister.querySelector("button[type='submit']");

        if (!email || !password) {
          showAlert("Preencha o e-mail e a senha.");
          return;
        }

        if (password.length < 6) {
          showAlert("A senha deve conter no mínimo 6 caracteres.");
          return;
        }

        if (password !== confirm) {
          showAlert("As senhas informadas não coincidem.");
          return;
        }

        try {
          setButtonLoading(btnSubmit, true, "Criando conta...");
          const result = await window.authAPI.register(name, email, password);

          if (!result.success) {
            showAlert(result.message || "Erro ao criar conta.");
          } else {
            showAlert("Conta criada com sucesso! Redirecionando para ativação...", "success", 3000);
          }
        } catch (err) {
          showAlert(err.message || "Falha ao processar cadastro.");
        } finally {
          setButtonLoading(btnSubmit, false);
        }
      });
    }

    // 3. Formulário de Recuperação de Senha
    if (formForgot) {
      formForgot.addEventListener("submit", async (e) => {
        e.preventDefault();
        hideAlert();

        const email = inputForgotEmail.value.trim();
        const btnSubmit = formForgot.querySelector("button[type='submit']");

        if (!email) {
          showAlert("Informe o e-mail cadastrado.");
          return;
        }

        try {
          setButtonLoading(btnSubmit, true, "Enviando e-mail...");
          const result = await window.authAPI.resetPassword(email);

          if (!result.success) {
            showAlert(result.message || "Erro ao enviar e-mail de recuperação.");
          } else {
            showAlert("Link de redefinição enviado! Verifique sua caixa de entrada.", "success", 8000);
            setTimeout(() => showView("login"), 4000);
          }
        } catch (err) {
          showAlert(err.message || "Falha ao enviar solicitação.");
        } finally {
          setButtonLoading(btnSubmit, false);
        }
      });
    }

    // 4. Formulário de Ativação de Chave
    if (formActivate) {
      formActivate.addEventListener("submit", async (e) => {
        e.preventDefault();
        hideAlert();

        const key = inputLicenseKey.value.trim().toUpperCase();
        const btnSubmit = formActivate.querySelector("button[type='submit']");

        if (!key || key.length < 8) {
          showAlert("Por favor, informe uma chave de ativação válida.");
          return;
        }

        try {
          setButtonLoading(btnSubmit, true, "Validando chave...");
          const result = await window.authAPI.activateKey(key);

          if (!result.success) {
            showAlert(result.message || "Chave de ativação inválida.");
          } else {
            showAlert("🎉 Produto ativado com sucesso! Carregando Zwei Chat...", "success", 4000);
          }
        } catch (err) {
          showAlert(err.message || "Falha ao validar a chave no servidor.");
        } finally {
          setButtonLoading(btnSubmit, false);
        }
      });
    }

    // 5. Formulário de Configuração do Firebase (Manual/Ajuste)
    if (formConfig) {
      formConfig.addEventListener("submit", async (e) => {
        e.preventDefault();
        hideAlert();

        const apiKey = document.getElementById("config-apikey").value.trim();
        const projectId = document.getElementById("config-projectid").value.trim();
        const authDomain = document.getElementById("config-authdomain").value.trim() || `${projectId}.firebaseapp.com`;
        const appId = document.getElementById("config-appid").value.trim();
        const btnSubmit = formConfig.querySelector("button[type='submit']");

        if (!apiKey || !projectId) {
          showAlert("API Key e Project ID são obrigatórios.");
          return;
        }

        try {
          setButtonLoading(btnSubmit, true, "Salvando credenciais...");
          const res = await window.authAPI.saveFirebaseConfig({
            apiKey,
            projectId,
            authDomain,
            appId: appId || "1:1234567890:web:abcdef"
          });

          if (res.success) {
            showAlert("Firebase configurado com sucesso!", "success", 3000);
            setTimeout(() => showView("login"), 1500);
          } else {
            showAlert(res.error || "Erro ao salvar credenciais.");
          }
        } catch (err) {
          showAlert(err.message || "Falha ao conectar com o Firebase.");
        } finally {
          setButtonLoading(btnSubmit, false);
        }
      });
    }
  }

  /**
   * Configura eventos de clique e navegação entre telas
   */
  function setupNavigationEvents() {
    if (tabLogin) tabLogin.addEventListener("click", () => showView("login"));
    if (tabRegister) tabRegister.addEventListener("click", () => showView("register"));
    if (linkToRegister) linkToRegister.addEventListener("click", () => showView("register"));
    if (linkToLogin) linkToLogin.addEventListener("click", () => showView("login"));
    if (linkToForgot) linkToForgot.addEventListener("click", () => showView("forgot"));
    if (linkBackToLogin) linkBackToLogin.addEventListener("click", () => showView("login"));

    // Logout da tela de ativação
    if (btnLogoutFromActivate) {
      btnLogoutFromActivate.addEventListener("click", async () => {
        await window.authAPI.logout();
        showView("login");
      });
    }

    // Logout da Sidebar
    if (sidebarBtnLogout) {
      sidebarBtnLogout.addEventListener("click", async () => {
        const confirmLogout = confirm("Deseja realmente encerrar a sessão no Zwei Chat?");
        if (confirmLogout) {
          await window.authAPI.logout();
        }
      });
    }

    // Abrir/Fechar modal de configuração de credenciais
    if (btnConfigToggle) {
      btnConfigToggle.addEventListener("click", () => showView("config"));
    }
    if (btnCloseConfig) {
      btnCloseConfig.addEventListener("click", () => {
        if (currentAuthState.isAuthenticated && !currentAuthState.isActivated) {
          showView("activate");
        } else {
          showView("login");
        }
      });
    }
  }

  /**
   * Inicialização do Módulo de Autenticação na interface
   */
  async function initAuth() {
    setupLicenseKeyMask();
    setupPasswordToggles();
    setupFormHandlers();
    setupNavigationEvents();

    // Escuta mudanças de estado em tempo real emitidas pelo processo principal
    if (window.authAPI && typeof window.authAPI.onAuthStateChanged === "function") {
      window.authAPI.onAuthStateChanged((newState) => {
        console.log("🔄 Novo estado de autenticação recebido:", newState);
        renderAuthState(newState);
      });

      // Obtém estado inicial
      try {
        const initialState = await window.authAPI.getAuthState();
        console.log("🔐 Estado inicial de autenticação:", initialState);
        renderAuthState(initialState);
      } catch (err) {
        console.error("Erro ao obter estado de autenticação:", err);
      }
    } else {
      console.warn("⚠️ window.authAPI não encontrada no preload.");
    }
  }

  // Inicializa quando o DOM estiver pronto
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAuth);
  } else {
    initAuth();
  }
})();
