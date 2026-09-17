// renderer/guiScripts/appGuiModules/settingsModule.js
// Gestão da Interface Comercial de Onboarding e Credenciais da Meta WhatsApp Cloud API

import { $ } from "./domUtils.js";
import { customAlert, customConfirm } from "../utils/confirmModal.js";

/**
 * Atualiza o status visual e preenche os dados da conta na aba de Configurações
 * @param {object} api - Instância da API (window.zweiPremiumApi)
 */
export async function loadConfigForm(api) {
  if (!api || typeof api.getConfig !== "function") return;

  const viewDisconnected = $("#view-disconnected");
  const viewConnected = $("#view-connected");
  const settingsQuickStatus = $("#settings-quick-status");

  // Campos do estado conectado
  const connVerifiedName = $("#conn-verified-name");
  const connDisplayPhone = $("#conn-display-phone");
  const connPhoneId = $("#conn-phone-id");
  const connQualityRating = $("#conn-quality-rating");
  const connMessagingTier = $("#conn-messaging-tier");

  // Campos do formulário técnico de suporte
  const cfgAppId = $("#cfg-app-id");
  const cfgConfigId = $("#cfg-config-id");
  const cfgPhoneId = $("#cfg-phone-id");
  const cfgWabaId = $("#cfg-waba-id");
  const cfgAccessToken = $("#cfg-access-token");
  const cfgAppSecret = $("#cfg-app-secret");
  const cfgVerifyToken = $("#cfg-verify-token");

  try {
    const config = await api.getConfig();
    if (config) {
      if (cfgAppId) cfgAppId.value = config.appId || "";
      if (cfgConfigId) cfgConfigId.value = config.configId || "";
      if (cfgPhoneId) cfgPhoneId.value = config.phoneNumberId || "";
      if (cfgWabaId) cfgWabaId.value = config.wabaId || "";
      if (cfgAccessToken) cfgAccessToken.value = config.accessToken || "";
      if (cfgAppSecret) cfgAppSecret.value = config.appSecret || "";
      if (cfgVerifyToken) cfgVerifyToken.value = config.verifyToken || "";
    }

    // Consulta o diagnóstico de saúde da conta Meta
    const health = await api.getAccountHealth();
    const isConnected = !!(health && health.success && health.data && health.data.isConnected);

    if (isConnected) {
      const data = health.data;

      // Exibe card de Conectado e oculta Onboarding
      if (viewDisconnected) viewDisconnected.style.display = "none";
      if (viewConnected) viewConnected.style.display = "block";

      if (settingsQuickStatus) {
        settingsQuickStatus.className = "status-pill status-green";
        settingsQuickStatus.innerHTML = '<span class="status-dot"></span> Conectado';
      }

      if (connVerifiedName) connVerifiedName.textContent = data.verifiedName || "Nome Comercial Registrado";
      if (connDisplayPhone) connDisplayPhone.textContent = data.displayPhoneNumber || "Número Ativo";
      if (connPhoneId) connPhoneId.textContent = `ID do Telefone: ${config?.phoneNumberId || "-"}`;
      if (connMessagingTier) connMessagingTier.textContent = data.messagingLimitTier || "TIER_1K";

      if (connQualityRating) {
        const rating = (data.qualityRating || "GREEN").toUpperCase();
        let pillClass = "status-green";
        if (rating === "YELLOW") pillClass = "status-yellow";
        else if (rating === "RED" || rating === "UNKNOWN") pillClass = "status-red";

        connQualityRating.innerHTML = `<span class="status-pill ${pillClass}"><span class="status-dot"></span> ${rating}</span>`;
      }
    } else {
      // Exibe card de Onboarding e oculta Conectado
      if (viewDisconnected) viewDisconnected.style.display = "block";
      if (viewConnected) viewConnected.style.display = "none";

      if (settingsQuickStatus) {
        settingsQuickStatus.className = "status-pill status-red";
        settingsQuickStatus.innerHTML = '<span class="status-dot"></span> Desconectado';
      }
    }
  } catch (error) {
    console.error("Erro ao carregar status da conta nas configurações:", error);
    if (viewDisconnected) viewDisconnected.style.display = "block";
    if (viewConnected) viewConnected.style.display = "none";
    if (settingsQuickStatus) {
      settingsQuickStatus.className = "status-pill status-red";
      settingsQuickStatus.innerHTML = '<span class="status-dot"></span> Erro de Conexão';
    }
  }
}

/**
 * Inicializa os ouvintes de eventos da aba de Configurações
 * @param {object} api - Instância da API
 * @param {object} [callbacks={}]
 * @param {Function} [callbacks.onConfigSaved] - Callback disparado após alteração de conexão
 */
export function initSettings(api, callbacks = {}) {
  // Botões de Onboarding e Conexão Comercial
  const btnStartOnboarding = $("#btn-start-onboarding");
  const btnOnboardingText = $("#btn-onboarding-text");
  const btnRefreshSettings = $("#btn-refresh-settings-status");
  const btnDisconnectAccount = $("#btn-disconnect-account");

  // Accordion do Modo Técnico
  const toggleTechnicalMode = $("#toggle-technical-mode");
  const technicalModeBody = $("#technical-mode-body");
  const accordionArrow = $("#accordion-arrow");

  // Formulário Manual de Suporte
  const formMetaConfig = $("#form-meta-config");
  const cfgAppId = $("#cfg-app-id");
  const cfgConfigId = $("#cfg-config-id");
  const cfgPhoneId = $("#cfg-phone-id");
  const cfgWabaId = $("#cfg-waba-id");
  const cfgAccessToken = $("#cfg-access-token");
  const cfgAppSecret = $("#cfg-app-secret");
  const cfgVerifyToken = $("#cfg-verify-token");
  const btnTestMetaConfig = $("#btn-test-meta-config");

  // ====================================================
  // 1. AÇÃO: INICIAR ONBOARDING META (EMBEDDED SIGNUP)
  // ====================================================
  if (btnStartOnboarding) {
    btnStartOnboarding.addEventListener("click", async () => {
      btnStartOnboarding.disabled = true;
      if (btnOnboardingText) {
        btnOnboardingText.textContent = "Aguardando cadastro na janela da Meta...";
      }

      try {
        const res = await api.startEmbeddedSignup();

        if (res && res.success) {
          await customAlert("✅ WhatsApp Comercial conectado e verificado com sucesso!");
          await loadConfigForm(api);
          if (typeof callbacks.onConfigSaved === "function") {
            await callbacks.onConfigSaved();
          }
        } else if (res && res.cancelled) {
          // Usuário fechou o diálogo sem concluir
          console.log("Onboarding cancelado pelo usuário.");
        } else {
          const errDetail = res?.error || "Não foi possível concluir o vínculo com a Meta.";
          await customAlert(`⚠️ Aviso de Conexão: ${errDetail}`);
        }
      } catch (err) {
        await customAlert(`❌ Erro ao abrir janela de conexão: ${err.message}`);
      } finally {
        btnStartOnboarding.disabled = false;
        if (btnOnboardingText) {
          btnOnboardingText.textContent = "Conectar meu WhatsApp Comercial";
        }
      }
    });
  }

  // ====================================================
  // 2. AÇÃO: DESVINCULAR NÚMERO
  // ====================================================
  if (btnDisconnectAccount) {
    btnDisconnectAccount.addEventListener("click", async () => {
      const confirmed = await customConfirm(
        "Tem certeza que deseja desvincular este número de WhatsApp do sistema? Os disparos e respostas automáticas serão pausados até que uma nova conexão seja feita.",
        "Desconectar WhatsApp",
        "Sim, Desvincular",
        "Cancelar",
        "btn-danger"
      );

      if (!confirmed) return;

      try {
        const res = await api.disconnectAccount();
        if (res && res.success) {
          await customAlert("Conta desvinculada com sucesso.");
          await loadConfigForm(api);
          if (typeof callbacks.onConfigSaved === "function") {
            await callbacks.onConfigSaved();
          }
        } else {
          await customAlert("❌ Falha ao desvincular conta.");
        }
      } catch (err) {
        await customAlert(`❌ Erro ao desvincular: ${err.message}`);
      }
    });
  }

  // ====================================================
  // 3. AÇÃO: ATUALIZAR STATUS
  // ====================================================
  if (btnRefreshSettings) {
    btnRefreshSettings.addEventListener("click", async () => {
      btnRefreshSettings.disabled = true;
      btnRefreshSettings.textContent = "Atualizando...";
      await loadConfigForm(api);
      btnRefreshSettings.disabled = false;
      btnRefreshSettings.textContent = "🔄 Atualizar Diagnóstico";
    });
  }

  // ====================================================
  // 4. ACCORDION DO MODO TÉCNICO
  // ====================================================
  if (toggleTechnicalMode && technicalModeBody) {
    toggleTechnicalMode.addEventListener("click", () => {
      const isHidden = technicalModeBody.style.display === "none";
      technicalModeBody.style.display = isHidden ? "block" : "none";
      if (accordionArrow) {
        accordionArrow.classList.toggle("open", isHidden);
      }
    });
  }

  // ====================================================
  // 5. SALVAR MANUALMENTE (MODO TÉCNICO)
  // ====================================================
  if (formMetaConfig) {
    formMetaConfig.addEventListener("submit", async (e) => {
      e.preventDefault();

      const newConfig = {
        appId: cfgAppId?.value?.trim() || "",
        configId: cfgConfigId?.value?.trim() || "",
        phoneNumberId: cfgPhoneId?.value?.trim() || "",
        wabaId: cfgWabaId?.value?.trim() || "",
        accessToken: cfgAccessToken?.value?.trim() || "",
        verifyToken: cfgVerifyToken?.value?.trim() || "",
      };

      // Apenas adiciona appSecret se o desenvolvedor preencheu explicitamente o campo avançado
      const secretInput = cfgAppSecret?.value?.trim();
      if (secretInput) {
        newConfig.appSecret = secretInput;
      }

      try {
        const res = await api.saveConfig(newConfig);
        if (res && res.success) {
          await customAlert("✅ Credenciais salvas com sucesso!");
          await loadConfigForm(api);
          if (typeof callbacks.onConfigSaved === "function") {
            await callbacks.onConfigSaved();
          }
        } else {
          await customAlert("❌ Falha ao salvar configurações.");
        }
      } catch (err) {
        await customAlert(`❌ Erro ao salvar: ${err.message}`);
      }
    });
  }

  // ====================================================
  // 6. TESTAR CONEXÃO (MODO TÉCNICO)
  // ====================================================
  if (btnTestMetaConfig) {
    btnTestMetaConfig.addEventListener("click", async () => {
      btnTestMetaConfig.disabled = true;
      btnTestMetaConfig.textContent = "Testando...";

      try {
        const testData = {
          phoneNumberId: cfgPhoneId?.value?.trim() || "",
          wabaId: cfgWabaId?.value?.trim() || "",
          accessToken: cfgAccessToken?.value?.trim() || "",
        };

        const res = await api.testConnection(testData);

        if (res && res.success && res.data) {
          const name = res.data.verified_name || res.data.displayPhoneNumber || "OK";
          const rating = res.data.quality_rating || "GREEN";
          await customAlert(
            `✅ Conexão bem-sucedida com a Meta!\nNome Verificado: ${name}\nQuality Rating: ${rating}`
          );
        } else {
          const errDetail = res?.error || "Verifique o Access Token e os IDs informados.";
          await customAlert(`⚠️ Falha no teste de conexão: ${errDetail}`);
        }
      } catch (error) {
        await customAlert(`❌ Erro no teste de conexão: ${error.message}`);
      } finally {
        btnTestMetaConfig.disabled = false;
        btnTestMetaConfig.textContent = "🔍 Testar Conexão";
      }
    });
  }

  return {
    loadConfigForm: () => loadConfigForm(api),
  };
}

// Compatibilidade para testes em ambiente Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = { loadConfigForm, initSettings };
}
