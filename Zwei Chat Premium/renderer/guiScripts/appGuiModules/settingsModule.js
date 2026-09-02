// renderer/guiScripts/appGuiModules/settingsModule.js
// Gestão de credenciais da Meta WhatsApp Cloud API e testes de conectividade

import { $ } from "./domUtils.js";

/**
 * Carrega as credenciais salvas no formulário de configurações
 * @param {object} api - Instância da API
 */
export async function loadConfigForm(api) {
  if (!api || typeof api.getConfig !== "function") return;

  const cfgPhoneId = $("#cfg-phone-id");
  const cfgWabaId = $("#cfg-waba-id");
  const cfgAccessToken = $("#cfg-access-token");
  const cfgAppSecret = $("#cfg-app-secret");
  const cfgVerifyToken = $("#cfg-verify-token");

  try {
    const config = await api.getConfig();
    if (config) {
      if (cfgPhoneId) cfgPhoneId.value = config.phoneNumberId || "";
      if (cfgWabaId) cfgWabaId.value = config.wabaId || "";
      if (cfgAccessToken) cfgAccessToken.value = config.accessToken || "";
      if (cfgAppSecret) cfgAppSecret.value = config.appSecret || "";
      if (cfgVerifyToken) cfgVerifyToken.value = config.verifyToken || "";
    }
  } catch (error) {
    console.error("Erro ao carregar configurações salvas:", error);
  }
}

/**
 * Inicializa os formulários e botões da aba de Configurações
 * @param {object} api - Instância da API
 * @param {object} [callbacks={}]
 * @param {Function} [callbacks.onConfigSaved] - Callback disparado após salvar com sucesso
 */
export function initSettings(api, callbacks = {}) {
  const formMetaConfig = $("#form-meta-config");
  const cfgPhoneId = $("#cfg-phone-id");
  const cfgWabaId = $("#cfg-waba-id");
  const cfgAccessToken = $("#cfg-access-token");
  const cfgAppSecret = $("#cfg-app-secret");
  const cfgVerifyToken = $("#cfg-verify-token");
  const btnTestMetaConfig = $("#btn-test-meta-config");

  // 1. Envio do Formulário de Salvamento
  if (formMetaConfig) {
    formMetaConfig.addEventListener("submit", async (e) => {
      e.preventDefault();

      const newConfig = {
        phoneNumberId: cfgPhoneId?.value?.trim() || "",
        wabaId: cfgWabaId?.value?.trim() || "",
        accessToken: cfgAccessToken?.value?.trim() || "",
        appSecret: cfgAppSecret?.value?.trim() || "",
        verifyToken: cfgVerifyToken?.value?.trim() || "",
      };

      try {
        const res = await api.saveConfig(newConfig);
        if (res && res.success) {
          alert("✅ Credenciais salvas com sucesso!");
          if (typeof callbacks.onConfigSaved === "function") {
            await callbacks.onConfigSaved();
          }
        } else {
          alert("❌ Falha ao salvar configurações.");
        }
      } catch (err) {
        alert(`❌ Erro ao salvar: ${err.message}`);
      }
    });
  }

  // 2. Teste de Conexão com a Graph API
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
          alert(`✅ Conexão bem-sucedida com a Meta!\nNome Verificado: ${name}\nQuality Rating: ${rating}`);
        } else {
          const errDetail = res?.error || "Verifique o Access Token e os IDs informados.";
          alert(`⚠️ Falha no teste de conexão: ${errDetail}`);
        }
      } catch (error) {
        alert(`❌ Erro no teste de conexão: ${error.message}`);
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
