import { $, escapeHtml, safeCreateMessageElement } from "./domUtils.js";

let receivedMessagesCount = 0;

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

        dashQualityRating.innerHTML = `<span class="status-pill ${pillClass}"><span class="status-dot"></span> ${escapeHtml(rating)}</span>`;
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
 * Renderiza uma mensagem recebida no feed em tempo real de forma 100% segura contra XSS
 * @param {object} msg - Mensagem recebida do WhatsApp
 */
export function renderInboundMessage(msg) {
  if (!msg) return;

  const container = $("#dash-inbound-feed-container");
  if (!container) return;

  const placeholder = $("#dash-feed-placeholder");
  if (placeholder) {
    placeholder.remove();
  }

  // Criação segura de elemento garantindo que o corpo seja tratado como puro textContent
  const messageElement = safeCreateMessageElement(msg);
  container.insertBefore(messageElement, container.firstChild);

  receivedMessagesCount++;
  updateFeedCountBadge();
}

/**
 * Atualiza o contador de mensagens exibido no cabeçalho do feed
 */
function updateFeedCountBadge() {
  const badge = $("#dash-feed-count-badge");
  if (badge) {
    badge.textContent = `${receivedMessagesCount} ${receivedMessagesCount === 1 ? "mensagem" : "mensagens"}`;
  }
}

/**
 * Carrega mensagens recebidas recentemente a partir do buffer em memória do backend
 * @param {object} api
 */
export async function loadRecentInboundMessages(api) {
  const container = $("#dash-inbound-feed-container");
  if (!container || !api || typeof api.getRecentInboundMessages !== "function") return;

  try {
    const recentMessages = await api.getRecentInboundMessages(50);
    container.innerHTML = "";

    if (!Array.isArray(recentMessages) || recentMessages.length === 0) {
      receivedMessagesCount = 0;
      updateFeedCountBadge();
      container.innerHTML = `
        <div class="feed-placeholder" id="dash-feed-placeholder">
          <div class="feed-placeholder-icon">💬</div>
          <div class="feed-placeholder-text">Aguardando novas mensagens de clientes pelo WhatsApp...</div>
          <div class="feed-placeholder-subtext">As mensagens recebidas serão exibidas aqui em tempo real de forma segura.</div>
        </div>
      `;
      return;
    }

    receivedMessagesCount = recentMessages.length;
    updateFeedCountBadge();

    recentMessages.forEach((msg) => {
      const el = safeCreateMessageElement(msg);
      container.appendChild(el);
    });
  } catch (err) {
    console.error("Erro ao carregar mensagens inbound recentes:", err);
  }
}

/**
 * Limpa o histórico de mensagens exibido no feed
 * @param {object} api
 */
export async function clearInboundFeed(api) {
  const container = $("#dash-inbound-feed-container");
  if (!container) return;

  if (api && typeof api.clearRecentInboundMessages === "function") {
    try {
      await api.clearRecentInboundMessages();
    } catch (err) {
      console.warn("Aviso ao limpar buffer no backend:", err);
    }
  }

  receivedMessagesCount = 0;
  updateFeedCountBadge();

  container.innerHTML = `
    <div class="feed-placeholder" id="dash-feed-placeholder">
      <div class="feed-placeholder-icon">🧹</div>
      <div class="feed-placeholder-text">Feed de mensagens limpo.</div>
      <div class="feed-placeholder-subtext">Novas mensagens recebidas aparecerão aqui automaticamente.</div>
    </div>
  `;
}

/**
 * Configura os ouvintes em tempo real para alimentação do feed de mensagens
 * @param {object} api
 */
export function setupLiveFeedListeners(api) {
  // Listener do evento em tempo real do IPC
  if (api && typeof api.onMessageInbound === "function") {
    api.onMessageInbound((msg) => {
      renderInboundMessage(msg);
    });
  }

  // Botão de Atualização Manual
  const btnRefresh = $("#btn-refresh-inbound-feed");
  if (btnRefresh) {
    btnRefresh.addEventListener("click", () => {
      loadRecentInboundMessages(api);
    });
  }

  // Botão de Limpeza do Feed
  const btnClear = $("#btn-clear-inbound-feed");
  if (btnClear) {
    btnClear.addEventListener("click", () => {
      clearInboundFeed(api);
    });
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

  setupLiveFeedListeners(api);
  loadRecentInboundMessages(api);

  return {
    refreshAccountHealth: () => refreshAccountHealth(api),
    loadRecentInboundMessages: () => loadRecentInboundMessages(api),
    renderInboundMessage,
    clearInboundFeed: () => clearInboundFeed(api),
  };
}

// Compatibilidade para testes em ambiente Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    refreshAccountHealth,
    initDashboard,
    renderInboundMessage,
    loadRecentInboundMessages,
    clearInboundFeed,
  };
}
