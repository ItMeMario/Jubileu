// renderer/guiScripts/appGuiModules/dashboardModule.js
// Diagnóstico, visão geral e monitoramento de saúde da conta Meta WhatsApp Cloud API

import { $ } from "./domUtils.js";

/**
 * Consulta e atualiza as métricas e saúde da conta Meta no Dashboard
 * @param {object} api - Instância da API do Zwei Chat Premium (window.zweiPremiumApi)
 */
export async function refreshAccountHealth(api) {
  if (!api || typeof api.getAccountHealth !== "function") return;

  const dashConnStatus = $("#dash-conn-status");
  const dashPhoneNumber = $("#dash-phone-number");
  const dashQualityRating = $("#dash-quality-rating");
  const dashLimitTier = $("#dash-limit-tier");
  const dashVerifiedName = $("#dash-verified-name");

  try {
    if (dashConnStatus) {
      dashConnStatus.innerHTML = '<span class="status-pill status-yellow"><span class="status-dot"></span> Verificando...</span>';
    }

    const health = await api.getAccountHealth();

    if (health && health.success && health.data) {
      const data = health.data;

      if (dashConnStatus) {
        dashConnStatus.innerHTML = '<span class="status-pill status-green"><span class="status-dot"></span> Conectado</span>';
      }

      if (dashPhoneNumber) {
        dashPhoneNumber.textContent = `Telefone: ${data.displayPhoneNumber || "-"}`;
      }

      if (dashVerifiedName) {
        dashVerifiedName.textContent = data.verifiedName || "-";
      }

      if (dashLimitTier) {
        dashLimitTier.textContent = data.messagingLimitTier || "TIER_1K";
      }

      if (dashQualityRating) {
        const rating = (data.qualityRating || "GREEN").toUpperCase();
        let pillClass = "status-green";
        if (rating === "YELLOW") pillClass = "status-yellow";
        else if (rating === "RED" || rating === "UNKNOWN") pillClass = "status-red";

        dashQualityRating.innerHTML = `<span class="status-pill ${pillClass}"><span class="status-dot"></span> ${rating}</span>`;
      }
    } else {
      if (dashConnStatus) {
        dashConnStatus.innerHTML = '<span class="status-pill status-red"><span class="status-dot"></span> Desconectado</span>';
      }
    }
  } catch (error) {
    console.error("Erro ao verificar saúde da conta Meta:", error);
    if (dashConnStatus) {
      dashConnStatus.innerHTML = '<span class="status-pill status-red"><span class="status-dot"></span> Erro de Conexão</span>';
    }
  }
}

/**
 * Inicializa os listeners e ações da aba Dashboard
 * @param {object} api - Instância da API
 */
export function initDashboard(api) {
  const btnRefreshHealth = $("#btn-refresh-health");
  if (btnRefreshHealth) {
    btnRefreshHealth.addEventListener("click", () => {
      refreshAccountHealth(api);
    });
  }

  return {
    refreshAccountHealth: () => refreshAccountHealth(api),
  };
}

// Compatibilidade para testes em ambiente Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = { refreshAccountHealth, initDashboard };
}
