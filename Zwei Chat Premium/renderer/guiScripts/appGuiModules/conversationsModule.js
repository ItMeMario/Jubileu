// renderer/guiScripts/appGuiModules/conversationsModule.js
// Controlador da Interface Gráfica de Conversas, Cards e Transbordo Humano (Takeover)

import { $, $$, escapeHtml } from "./domUtils.js";
import { customConfirm, customAlert } from "../utils/confirmModal.js";

// Estado interno do módulo
let conversations = [];
let selectedPhone = null;
let currentFilter = "all";
let searchTerm = "";
let apiInstance = null;

/**
 * Formata telefone para exibição amigável
 * @param {string} phone
 * @returns {string}
 */
function formatPhone(phone) {
  if (!phone) return "--";
  const clean = String(phone).replace(/\D/g, "");
  // Formato brasileiro com DDI (55): 55 11 99999-9999
  if (clean.startsWith("55") && clean.length === 13) {
    return `+55 (${clean.substring(2, 4)}) ${clean.substring(4, 9)}-${clean.substring(9)}`;
  }
  if (clean.startsWith("55") && clean.length === 12) {
    return `+55 (${clean.substring(2, 4)}) ${clean.substring(4, 8)}-${clean.substring(8)}`;
  }
  return `+${clean}`;
}

/**
 * Formata timestamp em tempo relativo amigável
 * @param {number} timestamp
 * @returns {string}
 */
function formatRelativeTime(timestamp) {
  if (!timestamp) return "";
  const now = Date.now();
  const diffSec = Math.floor((now - timestamp) / 1000);

  if (diffSec < 60) return "Agora";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    const d = new Date(timestamp);
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return `${diffDays}d atrás`;
  const d = new Date(timestamp);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/**
 * Filtra as conversas de acordo com a busca e o filtro selecionado
 * @returns {Array<object>}
 */
function getFilteredConversations() {
  return conversations.filter((conv) => {
    // 1. Filtro por texto de busca (nome, telefone ou mensagem)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchPhone = (conv.contactPhone || "").toLowerCase().includes(term);
      const matchName = (conv.contactName || "").toLowerCase().includes(term);
      const matchMsg = (conv.lastMessage || "").toLowerCase().includes(term);
      if (!matchPhone && !matchName && !matchMsg) return false;
    }

    // 2. Filtro rápido de status
    if (currentFilter === "client") {
      return conv.lastSender === "client";
    }
    if (currentFilter === "bot") {
      return conv.lastSender !== "client";
    }
    if (currentFilter === "human") {
      return conv.isBotActive === false;
    }

    return true;
  });
}

/**
 * Atualiza os contadores numéricos dos filtros rápidos
 */
function updateFilterCounters() {
  const countAll = conversations.length;
  const countClient = conversations.filter((c) => c.lastSender === "client").length;
  const countBot = conversations.filter((c) => c.lastSender !== "client").length;
  const countHuman = conversations.filter((c) => c.isBotActive === false).length;

  const elAll = $("#conv-count-all");
  const elClient = $("#conv-count-client");
  const elBot = $("#conv-count-bot");
  const elHuman = $("#conv-count-human");

  if (elAll) elAll.textContent = countAll;
  if (elClient) elClient.textContent = countClient;
  if (elBot) elBot.textContent = countBot;
  if (elHuman) elHuman.textContent = countHuman;
}

/**
 * Cria com segurança o elemento DOM de um card de conversa (100% imune a XSS)
 * @param {object} conv
 * @returns {HTMLElement}
 */
function createCardElement(conv) {
  const card = document.createElement("div");
  card.className = "conv-card-item";
  card.setAttribute("data-phone", conv.contactPhone);

  if (conv.contactPhone === selectedPhone) {
    card.classList.add("active");
  }

  // 1. Avatar com iniciais ou ícone
  const avatar = document.createElement("div");
  avatar.className = "conv-card-avatar";
  const nameFirstLetter = (conv.contactName || conv.contactPhone || "").trim().charAt(0).toUpperCase();
  avatar.textContent = nameFirstLetter || "👤";
  card.appendChild(avatar);

  // 2. Corpo do Card
  const body = document.createElement("div");
  body.className = "conv-card-body";

  // Topo: Nome e Horário
  const topRow = document.createElement("div");
  topRow.className = "conv-card-top";

  const title = document.createElement("div");
  title.className = "conv-card-title";
  title.textContent = conv.contactName && conv.contactName !== conv.contactPhone
    ? `${conv.contactName} (${formatPhone(conv.contactPhone)})`
    : formatPhone(conv.contactPhone);
  topRow.appendChild(title);

  const time = document.createElement("div");
  time.className = "conv-card-time";
  time.textContent = formatRelativeTime(conv.lastInteractionTimestamp);
  topRow.appendChild(time);
  body.appendChild(topRow);

  // Meio: Prévia da última mensagem
  const midRow = document.createElement("div");
  midRow.className = "conv-card-mid";

  const preview = document.createElement("div");
  preview.className = "conv-card-preview";
  preview.textContent = conv.lastMessage || "[Sem mensagens]";
  midRow.appendChild(preview);

  if (conv.unreadCount > 0) {
    const unread = document.createElement("span");
    unread.className = "conv-unread-badge";
    unread.textContent = conv.unreadCount > 99 ? "99+" : conv.unreadCount;
    midRow.appendChild(unread);
  }
  body.appendChild(midRow);

  // Rodapé: Tags e Indicador Verde / Vermelho
  const bottomRow = document.createElement("div");
  bottomRow.className = "conv-card-bottom";

  const tagsArea = document.createElement("div");
  tagsArea.className = "conv-card-tags";

  const botTag = document.createElement("span");
  botTag.className = `conv-bot-tag ${conv.isBotActive === false ? "tag-human" : "tag-bot"}`;
  botTag.textContent = conv.isBotActive === false ? "👤 Humano" : "🤖 Robô";
  tagsArea.appendChild(botTag);
  bottomRow.appendChild(tagsArea);

  // Indicador Rápido: Verde (Cliente) e Vermelho (Bot)
  const indicator = document.createElement("span");
  if (conv.lastSender === "client") {
    indicator.className = "conv-interaction-indicator indicator-client";
    indicator.title = "Última mensagem enviada pelo Cliente (Aguardando resposta)";
    indicator.innerHTML = '<span class="indicator-dot"></span> Cliente';
  } else {
    indicator.className = "conv-interaction-indicator indicator-bot";
    indicator.title = "Última mensagem enviada pelo Bot/Operador";
    indicator.innerHTML = '<span class="indicator-dot"></span> Bot';
  }
  bottomRow.appendChild(indicator);

  body.appendChild(bottomRow);
  card.appendChild(body);

  // Evento de clique para selecionar conversa
  card.addEventListener("click", () => {
    selectConversation(conv.contactPhone);
  });

  return card;
}

/**
 * Renderiza a lista de cards na coluna esquerda
 */
export function renderCardsList() {
  const container = $("#conv-cards-container");
  if (!container) return;

  container.innerHTML = "";
  updateFilterCounters();

  const filtered = getFilteredConversations();

  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "conv-empty-state";
    empty.innerHTML = `
      <div class="empty-icon">💬</div>
      <div class="empty-title">Nenhuma conversa encontrada</div>
      <div class="empty-subtext">Não há conversas correspondentes aos filtros selecionados.</div>
    `;
    container.appendChild(empty);
    return;
  }

  filtered.forEach((conv) => {
    const cardEl = createCardElement(conv);
    container.appendChild(cardEl);
  });
}

/**
 * Seleciona uma conversa ativa e exibe o histórico no painel direito
 * @param {string} phone
 */
export async function selectConversation(phone) {
  if (!phone) return;
  selectedPhone = phone;

  // Atualiza classe ativa nos cards
  $$(".conv-card-item").forEach((card) => {
    if (card.getAttribute("data-phone") === phone) {
      card.classList.add("active");
    } else {
      card.classList.remove("active");
    }
  });

  const placeholder = $("#conv-chat-placeholder");
  const activeChat = $("#conv-chat-active");
  if (placeholder) placeholder.style.display = "none";
  if (activeChat) activeChat.style.display = "flex";

  // Busca conversa detalhada
  let conv = conversations.find((c) => c.contactPhone === phone);
  if (!conv && apiInstance && typeof apiInstance.getConversationByPhone === "function") {
    try {
      conv = await apiInstance.getConversationByPhone(phone);
    } catch (_e) {}
  }
  if (!conv) return;

  // Zera contador de não lidas localmente e no backend
  if (conv.unreadCount > 0) {
    conv.unreadCount = 0;
    if (apiInstance && typeof apiInstance.markConversationAsRead === "function") {
      apiInstance.markConversationAsRead(phone).catch(() => {});
    }
    renderCardsList();
  }

  // 1. Atualiza cabeçalho do contato
  const avatarEl = $("#conv-active-avatar");
  const nameEl = $("#conv-active-name");
  const phoneEl = $("#conv-active-phone");
  const timeEl = $("#conv-active-last-time");
  const botStatusEl = $("#conv-active-bot-status");
  const btnToggleBot = $("#btn-conv-toggle-bot");
  const btnToggleIcon = $("#btn-conv-toggle-icon");
  const btnToggleText = $("#btn-conv-toggle-text");

  if (avatarEl) {
    avatarEl.textContent = (conv.contactName || conv.contactPhone || "").trim().charAt(0).toUpperCase() || "👤";
  }
  if (nameEl) {
    nameEl.textContent = conv.contactName && conv.contactName !== conv.contactPhone
      ? conv.contactName
      : formatPhone(conv.contactPhone);
  }
  if (phoneEl) {
    phoneEl.textContent = formatPhone(conv.contactPhone);
  }
  if (timeEl) {
    timeEl.textContent = `Última interação: ${formatRelativeTime(conv.lastInteractionTimestamp)}`;
  }

  // 2. Status do Bot e Botão de Transbordo (Handover)
  if (conv.isBotActive !== false) {
    if (botStatusEl) {
      botStatusEl.className = "status-pill status-green";
      botStatusEl.textContent = "🤖 Robô Ativo";
    }
    if (btnToggleBot) {
      btnToggleBot.className = "btn btn-secondary";
    }
    if (btnToggleIcon) btnToggleIcon.textContent = "👤";
    if (btnToggleText) btnToggleText.textContent = "Assumir Conversa";
  } else {
    if (botStatusEl) {
      botStatusEl.className = "status-pill status-yellow";
      botStatusEl.textContent = "👤 Atendimento Humano";
    }
    if (btnToggleBot) {
      btnToggleBot.className = "btn btn-primary"; // Destaque visual para reativar!
    }
    if (btnToggleIcon) btnToggleIcon.textContent = "🤖";
    if (btnToggleText) btnToggleText.textContent = "Reativar Robô para este Contato";
  }

  // 3. Checagem da Janela de 24 Horas da Meta
  await refreshActiveWindowStatus(phone);

  // 4. Renderiza histórico de mensagens
  renderMessagesHistory(conv.messages || []);

  // Foco no campo de digitação
  $("#conv-message-input")?.focus();
}

/**
 * Consulta e atualiza o badge e alerta da Janela de 24 Horas
 * @param {string} phone
 */
async function refreshActiveWindowStatus(phone) {
  const badgeEl = $("#conv-active-window-badge");
  const textEl = $("#conv-active-window-text");
  const alertEl = $("#conv-window-expired-alert");
  const inputEl = $("#conv-message-input");
  const sendBtn = $("#btn-conv-send-message");

  if (!apiInstance || typeof apiInstance.check24hWindow !== "function") return;

  try {
    const winStatus = await apiInstance.check24hWindow(phone);

    if (winStatus.isOpen) {
      if (badgeEl) {
        badgeEl.className = "conv-window-badge window-open";
      }
      if (textEl) {
        textEl.textContent = winStatus.formattedStatus || "Janela de 24h aberta";
      }
      if (alertEl) alertEl.style.display = "none";
      if (inputEl) inputEl.disabled = false;
      if (sendBtn) sendBtn.disabled = false;
    } else {
      if (badgeEl) {
        badgeEl.className = "conv-window-badge window-expired";
      }
      if (textEl) {
        textEl.textContent = winStatus.formattedStatus || "Janela de 24h expirada";
      }
      if (alertEl) alertEl.style.display = "flex";
      // Não desabilita o input completamente, mas exibe aviso
    }
  } catch (err) {
    console.warn("Aviso ao checar janela de 24h:", err);
  }
}

/**
 * Renderiza o histórico de balões de mensagens com segurança anti-XSS
 * @param {Array<object>} messages
 */
function renderMessagesHistory(messages = []) {
  const container = $("#conv-messages-history");
  if (!container) return;

  container.innerHTML = "";

  if (messages.length === 0) {
    const empty = document.createElement("div");
    empty.style.textAlign = "center";
    empty.style.color = "var(--text-dim)";
    empty.style.padding = "30px 10px";
    empty.style.fontSize = "13px";
    empty.textContent = "Nenhuma mensagem gravada neste contato.";
    container.appendChild(empty);
    return;
  }

  messages.forEach((msg) => {
    const bubble = document.createElement("div");
    bubble.className = "conv-msg-bubble";

    if (msg.sender === "client" || msg.direction === "inbound") {
      bubble.classList.add("bubble-client");
    } else if (msg.sender === "operator") {
      bubble.classList.add("bubble-operator");
    } else {
      bubble.classList.add("bubble-bot");
    }

    // Corpo da mensagem estritamente via textContent
    const textDiv = document.createElement("div");
    textDiv.className = "conv-msg-text";
    textDiv.textContent = msg.body || "";
    bubble.appendChild(textDiv);

    // Metadados (horário e tag do remetente)
    const metaDiv = document.createElement("div");
    metaDiv.className = "conv-msg-meta";

    const senderTag = document.createElement("span");
    senderTag.className = "conv-sender-tag";
    if (msg.sender === "client" || msg.direction === "inbound") {
      senderTag.textContent = "Cliente";
    } else if (msg.sender === "operator") {
      senderTag.textContent = "👤 Atendente";
    } else {
      senderTag.textContent = "🤖 Bot";
    }
    metaDiv.appendChild(senderTag);

    const timeSpan = document.createElement("span");
    const d = new Date(msg.timestamp || Date.now());
    timeSpan.textContent = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    metaDiv.appendChild(timeSpan);

    bubble.appendChild(metaDiv);
    container.appendChild(bubble);
  });

  // Auto-scroll para o final da conversa
  container.scrollTop = container.scrollHeight;
}

/**
 * Alterna o estado do robô (Assumir vs Reativar Robô)
 */
async function handleToggleBot() {
  if (!selectedPhone || !apiInstance) return;

  const conv = conversations.find((c) => c.contactPhone === selectedPhone);
  if (!conv) return;

  const isCurrentlyActive = conv.isBotActive !== false;

  try {
    if (isCurrentlyActive) {
      // 1. Desativa o robô (Operador assume o contato)
      const res = await apiInstance.takeoverConversation(selectedPhone);
      if (res && res.success) {
        conv.isBotActive = false;
        selectConversation(selectedPhone);
        renderCardsList();
      }
    } else {
      // 2. Reativa o robô para este contato
      const res = await apiInstance.activateBotForContact(selectedPhone);
      if (res && res.success) {
        conv.isBotActive = true;
        selectConversation(selectedPhone);
        renderCardsList();
      }
    }
  } catch (err) {
    console.error("Erro ao alternar status do robô para o contato:", err);
    await customAlert(`Falha ao alterar status do robô: ${err.message}`, "Erro no Atendimento");
  }
}

/**
 * Envia uma mensagem manual do operador
 */
async function handleSendMessage() {
  if (!selectedPhone || !apiInstance) return;

  const input = $("#conv-message-input");
  const sendBtn = $("#btn-conv-send-message");
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  // Validação prévia da Janela de 24 horas
  try {
    const winStatus = await apiInstance.check24hWindow(selectedPhone);
    if (winStatus.isExpired) {
      const confirmed = await customConfirm(
        "A janela de atendimento de 24 horas da Meta para este contato está expirada. A Meta costuma recusar mensagens livres fora da janela. Deseja tentar o envio mesmo assim?",
        "Janela de 24 Horas Expirada",
        "Tentar Enviar",
        "Cancelar",
        "btn-warning"
      );
      if (!confirmed) return;
    }
  } catch (_e) {}

  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<span>Enviando...</span> <span class="send-icon">⏳</span>';
  }

  try {
    const res = await apiInstance.sendManualMessage(selectedPhone, text);

    if (res && res.success) {
      input.value = "";
      input.style.height = "auto";

      // A mensagem é adicionada automaticamente via evento, mas recarrega por garantia
      await selectConversation(selectedPhone);
      await loadConversationsList(apiInstance);
    } else {
      await customAlert(res.error || "Não foi possível enviar a mensagem pela Meta API.", "Erro no Envio");
    }
  } catch (err) {
    console.error("Erro ao enviar mensagem manual:", err);
    await customAlert(`Erro ao enviar mensagem: ${err.message}`, "Erro no Envio");
  } finally {
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.innerHTML = '<span>Enviar</span> <span class="send-icon">📤</span>';
    }
    input.focus();
  }
}

/**
 * Carrega a lista de conversas a partir do backend
 * @param {object} api
 */
export async function loadConversationsList(api) {
  if (!api || typeof api.getConversations !== "function") return;
  apiInstance = api;

  try {
    const list = await api.getConversations();
    conversations = Array.isArray(list) ? list : [];
    renderCardsList();

    // Se houver uma conversa selecionada, atualiza seu conteúdo
    if (selectedPhone) {
      selectConversation(selectedPhone);
    }
  } catch (err) {
    console.error("Erro ao carregar lista de conversas:", err);
  }
}

/**
 * Inicializa o módulo de conversas e vincula os eventos da interface
 * @param {object} api
 */
export function initConversations(api) {
  apiInstance = api;

  // 1. Campo de Busca com filtro em tempo real
  const searchInput = $("#conv-search-input");
  const searchClear = $("#btn-conv-search-clear");

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchTerm = e.target.value.trim();
      if (searchClear) {
        searchClear.style.display = searchTerm ? "block" : "none";
      }
      renderCardsList();
    });
  }

  if (searchClear) {
    searchClear.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      searchTerm = "";
      searchClear.style.display = "none";
      renderCardsList();
      searchInput?.focus();
    });
  }

  // 2. Filtros Rápidos
  $$(".conv-filter-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      $$(".conv-filter-pill").forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      currentFilter = pill.getAttribute("data-filter") || "all";
      renderCardsList();
    });
  });

  // 3. Botão de Atualizar
  const btnRefresh = $("#btn-refresh-conversations");
  if (btnRefresh) {
    btnRefresh.addEventListener("click", async () => {
      await loadConversationsList(api);
    });
  }

  // 4. Botão de Limpar Histórico Local
  const btnClear = $("#btn-clear-conversations");
  if (btnClear) {
    btnClear.addEventListener("click", async () => {
      const confirmed = await customConfirm(
        "Tem certeza que deseja limpar todo o histórico local de conversas gravado neste dispositivo?",
        "Limpar Histórico de Conversas",
        "Limpar Tudo",
        "Cancelar",
        "btn-danger"
      );

      if (confirmed && typeof api.clearConversations === "function") {
        await api.clearConversations();
        conversations = [];
        selectedPhone = null;
        renderCardsList();
        const placeholder = $("#conv-chat-placeholder");
        const activeChat = $("#conv-chat-active");
        if (placeholder) placeholder.style.display = "flex";
        if (activeChat) activeChat.style.display = "none";
      }
    });
  }

  // 5. Botão de Alternar Robô (Assumir vs Reativar)
  const btnToggleBot = $("#btn-conv-toggle-bot");
  if (btnToggleBot) {
    btnToggleBot.addEventListener("click", handleToggleBot);
  }

  // 6. Envio de Mensagem Manual
  const btnSend = $("#btn-conv-send-message");
  if (btnSend) {
    btnSend.addEventListener("click", handleSendMessage);
  }

  const messageInput = $("#conv-message-input");
  if (messageInput) {
    // Envio com tecla Enter (sem Shift)
    messageInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    });

    // Auto-ajuste de altura da textarea
    messageInput.addEventListener("input", () => {
      messageInput.style.height = "auto";
      messageInput.style.height = `${Math.min(messageInput.scrollHeight, 120)}px`;
    });
  }

  // 7. Eventos Reativos em Tempo Real vindos do IPC Electron
  if (api && typeof api.onConversationUpdated === "function") {
    api.onConversationUpdated((updatedConv) => {
      if (!updatedConv || !updatedConv.contactPhone) return;

      const idx = conversations.findIndex((c) => c.contactPhone === updatedConv.contactPhone);
      if (idx >= 0) {
        conversations[idx] = updatedConv;
      } else {
        conversations.unshift(updatedConv);
      }

      // Reordena pelo mais recente
      conversations.sort((a, b) => (b.lastInteractionTimestamp || 0) - (a.lastInteractionTimestamp || 0));
      renderCardsList();

      if (selectedPhone === updatedConv.contactPhone) {
        // Atualiza cabeçalho e histórico se estiver na conversa aberta
        const botStatusEl = $("#conv-active-bot-status");
        const btnToggleBot = $("#btn-conv-toggle-bot");
        const btnToggleIcon = $("#btn-conv-toggle-icon");
        const btnToggleText = $("#btn-conv-toggle-text");

        if (updatedConv.isBotActive !== false) {
          if (botStatusEl) {
            botStatusEl.className = "status-pill status-green";
            botStatusEl.textContent = "🤖 Robô Ativo";
          }
          if (btnToggleBot) btnToggleBot.className = "btn btn-secondary";
          if (btnToggleIcon) btnToggleIcon.textContent = "👤";
          if (btnToggleText) btnToggleText.textContent = "Assumir Conversa";
        } else {
          if (botStatusEl) {
            botStatusEl.className = "status-pill status-yellow";
            botStatusEl.textContent = "👤 Atendimento Humano";
          }
          if (btnToggleBot) btnToggleBot.className = "btn btn-primary";
          if (btnToggleIcon) btnToggleIcon.textContent = "🤖";
          if (btnToggleText) btnToggleText.textContent = "Reativar Robô para este Contato";
        }

        renderMessagesHistory(updatedConv.messages || []);
      }
    });
  }

  if (api && typeof api.onConversationMessageAdded === "function") {
    api.onConversationMessageAdded(({ phone, message }) => {
      if (phone === selectedPhone && message) {
        const historyContainer = $("#conv-messages-history");
        if (historyContainer) {
          // Se tiver mensagem vazia, limpa
          const emptyMsg = historyContainer.querySelector("div");
          if (emptyMsg && emptyMsg.textContent.includes("Nenhuma mensagem")) {
            historyContainer.innerHTML = "";
          }

          // Adiciona o novo balão
          const bubble = document.createElement("div");
          bubble.className = "conv-msg-bubble";

          if (message.sender === "client" || message.direction === "inbound") {
            bubble.classList.add("bubble-client");
          } else if (message.sender === "operator") {
            bubble.classList.add("bubble-operator");
          } else {
            bubble.classList.add("bubble-bot");
          }

          const textDiv = document.createElement("div");
          textDiv.className = "conv-msg-text";
          textDiv.textContent = message.body || "";
          bubble.appendChild(textDiv);

          const metaDiv = document.createElement("div");
          metaDiv.className = "conv-msg-meta";

          const senderTag = document.createElement("span");
          senderTag.className = "conv-sender-tag";
          senderTag.textContent = message.sender === "client" ? "Cliente" : message.sender === "operator" ? "👤 Atendente" : "🤖 Bot";
          metaDiv.appendChild(senderTag);

          const timeSpan = document.createElement("span");
          const d = new Date(message.timestamp || Date.now());
          timeSpan.textContent = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
          metaDiv.appendChild(timeSpan);

          bubble.appendChild(metaDiv);
          historyContainer.appendChild(bubble);
          historyContainer.scrollTop = historyContainer.scrollHeight;
        }
      }
    });
  }

  if (api && typeof api.onConversationsCleared === "function") {
    api.onConversationsCleared(() => {
      conversations = [];
      selectedPhone = null;
      renderCardsList();
      const placeholder = $("#conv-chat-placeholder");
      const activeChat = $("#conv-chat-active");
      if (placeholder) placeholder.style.display = "flex";
      if (activeChat) activeChat.style.display = "none";
    });
  }
}
