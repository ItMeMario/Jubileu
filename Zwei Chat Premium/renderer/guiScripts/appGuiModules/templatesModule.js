// renderer/guiScripts/appGuiModules/templatesModule.js
// Gestão de Message Templates oficiais da Meta, criação, sincronização, edição e simulador dinâmico

import { $, $$, escapeHtml } from "./domUtils.js";
import { renderWhatsAppBubble } from "./whatsAppPreviewHelper.js";
import { customAlert, customConfirm } from "../utils/confirmModal.js";
import { toastSuccess, toastError, toastWarning, toastInfo } from "../utils/toastNotification.js";
import { navigateToTab } from "./navigationModule.js";

let loadedTemplates = [];
let selectedTemplate = null;
let currentFilter = "ALL";
let searchQuery = "";
let editorMode = "create"; // 'create' | 'edit'
let editingTemplateId = null;
let editorButtons = []; // array of { type: 'QUICK_REPLY'|'URL'|'PHONE_NUMBER', text: '', value: '' }

/**
 * Retorna os templates carregados em memória
 * @returns {Array}
 */
export function getLoadedTemplates() {
  return loadedTemplates;
}

/**
 * Carrega a lista de templates do backend e popula a lista e os selects da interface
 * @param {object} api - Instância da API do Context Bridge
 */
export async function loadTemplatesList(api) {
  if (!api) return;

  const broadcastTemplateSelect = $("#broadcast-template-select");
  const templateSelect = $("#template-select");

  try {
    if (typeof api.getAllTemplates === "function") {
      loadedTemplates = await api.getAllTemplates();
    } else if (typeof api.getTemplates === "function") {
      loadedTemplates = await api.getTemplates();
    } else if (typeof api.getApprovedTemplates === "function") {
      loadedTemplates = await api.getApprovedTemplates();
    } else if (typeof api.syncTemplates === "function") {
      const res = await api.syncTemplates();
      loadedTemplates = res?.templates || [];
    }

    if (!Array.isArray(loadedTemplates)) {
      loadedTemplates = [];
    }

    // Atualiza dropdown de disparos em massa (Broadcast) com os aprovados
    if (broadcastTemplateSelect) {
      broadcastTemplateSelect.innerHTML = '<option value="">Selecione um template aprovado...</option>';
      loadedTemplates
        .filter((t) => t.status === "APPROVED" || !t.status)
        .forEach((t) => {
          const bOpt = document.createElement("option");
          bOpt.value = t.name;
          bOpt.textContent = `${t.name} (${t.category || "UTILITY"})`;
          broadcastTemplateSelect.appendChild(bOpt);
        });
    }

    // Atualiza select invisível para retrocompatibilidade
    if (templateSelect) {
      templateSelect.innerHTML = '<option value="">Selecione um template...</option>';
      loadedTemplates.forEach((t) => {
        const opt = document.createElement("option");
        opt.value = t.name;
        opt.textContent = `[${t.status || "APPROVED"}] ${t.name} (${t.language || "pt_BR"})`;
        templateSelect.appendChild(opt);
      });
    }

    // Atualiza contadores dos filtros
    updateCounts();

    // Renderiza a lista de cards
    renderTemplatesList(api);

    // Se havia um template selecionado, re-seleciona para atualizar dados
    if (selectedTemplate) {
      const refreshed = loadedTemplates.find((t) => t.name === selectedTemplate.name);
      if (refreshed) {
        selectTemplate(refreshed);
      } else if (loadedTemplates.length > 0) {
        selectTemplate(loadedTemplates[0]);
      } else {
        clearPreview();
      }
    } else if (loadedTemplates.length > 0) {
      selectTemplate(loadedTemplates[0]);
    } else {
      clearPreview();
    }
  } catch (error) {
    console.error("Erro ao carregar templates:", error);
  }
}

/**
 * Atualiza os contadores numéricos dos chips de filtro
 */
function updateCounts() {
  const countAll = $("#tmpl-count-all");
  const countApproved = $("#tmpl-count-approved");
  const countPending = $("#tmpl-count-pending");
  const countRejected = $("#tmpl-count-rejected");

  const total = loadedTemplates.length;
  const approved = loadedTemplates.filter((t) => t.status === "APPROVED").length;
  const pending = loadedTemplates.filter((t) => t.status === "PENDING").length;
  const rejected = loadedTemplates.filter((t) => t.status === "REJECTED").length;

  if (countAll) countAll.textContent = total;
  if (countApproved) countApproved.textContent = approved;
  if (countPending) countPending.textContent = pending;
  if (countRejected) countRejected.textContent = rejected;
}

/**
 * Renderiza os cartões de templates com base nos filtros e busca ativos
 * @param {object} api
 */
function renderTemplatesList(api) {
  const container = $("#templates-cards-container");
  const emptyState = $("#templates-empty-state");
  if (!container) return;

  container.innerHTML = "";

  const filtered = loadedTemplates.filter((t) => {
    // Filtro por Status
    if (currentFilter !== "ALL") {
      if (t.status !== currentFilter) return false;
    }
    // Filtro por Busca
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const nameMatch = (t.name || "").toLowerCase().includes(q);
      const bodyMatch = (t.components?.body?.text || "").toLowerCase().includes(q);
      if (!nameMatch && !bodyMatch) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  if (emptyState) emptyState.style.display = "none";

  filtered.forEach((tmpl) => {
    const card = document.createElement("div");
    card.className = `tmpl-card ${selectedTemplate && selectedTemplate.name === tmpl.name ? "selected" : ""}`;
    card.setAttribute("data-template-name", tmpl.name);

    // Determina badge de status
    let statusClass = "status-green";
    let statusText = tmpl.status || "APPROVED";
    let statusIcon = "🟢";

    if (tmpl.status === "PENDING") {
      statusClass = "status-yellow tmpl-pulse-pending";
      statusIcon = "⏳";
      statusText = "EM ANÁLISE";
    } else if (tmpl.status === "REJECTED") {
      statusClass = "status-red";
      statusIcon = "❌";
      statusText = "REJEITADO";
    } else if (tmpl.status === "PAUSED") {
      statusClass = "status-paused";
      statusIcon = "⏸️";
      statusText = "PAUSADO";
    } else if (tmpl.status === "DISABLED") {
      statusClass = "status-disabled";
      statusIcon = "⚫";
      statusText = "DESATIVADO";
    }

    const bodyText = tmpl.components?.body?.text || "";

    card.innerHTML = `
      <div class="tmpl-card-header">
        <div class="tmpl-card-title-wrap">
          <span style="font-size: 16px;">📄</span>
          <span class="tmpl-card-name" title="${escapeHtml(tmpl.name)}">${escapeHtml(tmpl.name)}</span>
        </div>
        <div class="tmpl-card-badges">
          <span class="status-pill ${statusClass}" style="padding: 2px 8px; font-size: 11px;">
            ${statusIcon} ${statusText}
          </span>
        </div>
      </div>

      <div class="tmpl-card-preview-text">
        ${escapeHtml(bodyText || "Sem texto de corpo definido.")}
      </div>

      ${
        tmpl.status === "REJECTED" && (tmpl.rejectionReason || tmpl.rejectionRecommendation)
          ? `<div style="background: rgba(239, 68, 68, 0.1); border-left: 2px solid var(--status-red); padding: 4px 8px; border-radius: 4px; font-size: 11px; color: #fca5a5; margin-bottom: 8px;">
              ⚠️ ${escapeHtml(tmpl.rejectionReason || "Rejeitado pela Meta")}
            </div>`
          : ""
      }

      <div class="tmpl-card-footer">
        <div>
          <span class="status-pill status-yellow" style="padding: 1px 6px; font-size: 10px;">${escapeHtml(tmpl.category || "UTILITY")}</span>
          <span style="margin-left: 4px;">${escapeHtml(tmpl.language || "pt_BR")}</span>
        </div>
        <div class="tmpl-card-actions">
          <button class="tmpl-action-btn btn-view" title="Visualizar no simulador">
            <span>👁️</span> Ver
          </button>
          <button class="tmpl-action-btn btn-edit" title="Editar este template">
            <span>✏️</span> Editar
          </button>
          <button class="tmpl-action-btn btn-refresh" title="Consultar status mais recente na Meta">
            <span>🔄</span> Checar
          </button>
          <button class="tmpl-action-btn btn-danger btn-delete" title="Excluir da Meta">
            <span>🗑️</span>
          </button>
        </div>
      </div>
    `;

    // Eventos do card
    card.addEventListener("click", (e) => {
      if (e.target.closest(".tmpl-action-btn")) return;
      selectTemplate(tmpl);
    });

    card.querySelector(".btn-view")?.addEventListener("click", () => selectTemplate(tmpl));
    card.querySelector(".btn-edit")?.addEventListener("click", () => openEditor("edit", tmpl));
    card.querySelector(".btn-refresh")?.addEventListener("click", () => refreshTemplateAction(tmpl, api));
    card.querySelector(".btn-delete")?.addEventListener("click", () => deleteTemplateAction(tmpl, api));

    container.appendChild(card);
  });
}

/**
 * Seleciona um template e atualiza a área de pré-visualização e variáveis
 * @param {object} tmpl
 */
function selectTemplate(tmpl) {
  selectedTemplate = tmpl;

  // Atualiza classes selected nos cards
  $$(".tmpl-card").forEach((card) => {
    if (card.getAttribute("data-template-name") === tmpl.name) {
      card.classList.add("selected");
    } else {
      card.classList.remove("selected");
    }
  });

  const metaInfo = $("#template-meta-info");
  const actionsCard = $("#template-actions-card");
  const selectedName = $("#tmpl-selected-name");
  const badgeStatus = $("#tmpl-badge-status");
  const badgeCat = $("#tmpl-badge-cat");
  const badgeLang = $("#tmpl-badge-lang");

  if (metaInfo) metaInfo.style.display = "block";
  if (actionsCard) actionsCard.style.display = "block";

  if (selectedName) selectedName.textContent = tmpl.name;
  if (badgeStatus) {
    badgeStatus.textContent = tmpl.status || "APPROVED";
    badgeStatus.className = `status-pill ${
      tmpl.status === "APPROVED"
        ? "status-green"
        : tmpl.status === "PENDING"
        ? "status-yellow tmpl-pulse-pending"
        : tmpl.status === "REJECTED"
        ? "status-red"
        : "status-yellow"
    }`;
  }
  if (badgeCat) badgeCat.textContent = tmpl.category || "UTILITY";
  if (badgeLang) badgeLang.textContent = tmpl.language || "pt_BR";

  // Banner de rejeição
  const rejectionBanner = $("#tmpl-rejection-banner");
  const rejectionReasonText = $("#tmpl-rejection-reason-text");
  const rejectionRecBox = $("#tmpl-rejection-rec-box");
  const rejectionRecText = $("#tmpl-rejection-rec-text");

  if (tmpl.status === "REJECTED") {
    if (rejectionBanner) rejectionBanner.style.display = "block";
    if (rejectionReasonText) {
      rejectionReasonText.textContent = tmpl.rejectionReason || "O template foi rejeitado pela Meta por não conformidade com as diretrizes.";
    }
    if (tmpl.rejectionRecommendation && rejectionRecBox && rejectionRecText) {
      rejectionRecBox.style.display = "block";
      rejectionRecText.textContent = tmpl.rejectionRecommendation;
    } else if (rejectionRecBox) {
      rejectionRecBox.style.display = "none";
    }
  } else if (rejectionBanner) {
    rejectionBanner.style.display = "none";
  }

  // Gera inputs dinâmicos de variáveis e renderiza simulador
  generateVariableInputs(tmpl);
  renderTemplateSimulator(tmpl);
}

/**
 * Limpa a pré-visualização quando nenhum template está selecionado
 */
function clearPreview() {
  selectedTemplate = null;
  const metaInfo = $("#template-meta-info");
  const actionsCard = $("#template-actions-card");
  const rejectionBanner = $("#tmpl-rejection-banner");
  const varCard = $("#template-variables-card");

  if (metaInfo) metaInfo.style.display = "none";
  if (actionsCard) actionsCard.style.display = "none";
  if (rejectionBanner) rejectionBanner.style.display = "none";
  if (varCard) varCard.style.display = "none";

  renderTemplateSimulator(null);
}

/**
 * Extrai os índices únicos de variáveis {{1}}, {{2}} de um template
 * @param {object} tmpl
 * @returns {string[]}
 */
export function extractTemplateVariables(tmpl) {
  if (!tmpl) return [];
  let bodyText = "";

  if (tmpl.components) {
    if (Array.isArray(tmpl.components)) {
      const bodyComp = tmpl.components.find((c) => String(c.type || "").toUpperCase() === "BODY");
      bodyText = bodyComp?.text || "";
    } else if (tmpl.components.body) {
      bodyText = tmpl.components.body.text || "";
    }
  }

  const matches = bodyText.match(/\{\{(\d+)\}\}/g) || [];
  return [...new Set(matches.map((m) => m.replace(/[{}]/g, "")))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10)
  );
}

/**
 * Gera dinamicamente campos de entrada para as variáveis {{1}}, {{2}} do template
 * @param {object} tmpl
 */
export function generateVariableInputs(tmpl) {
  const container = $("#template-variables-inputs");
  const card = $("#template-variables-card");
  if (!container) return;

  container.innerHTML = "";
  if (!tmpl) {
    if (card) card.style.display = "none";
    return;
  }

  const uniqueVars = extractTemplateVariables(tmpl);

  if (uniqueVars.length > 0) {
    if (card) card.style.display = "block";

    const title = document.createElement("div");
    title.style.fontSize = "12px";
    title.style.fontWeight = "600";
    title.style.color = "var(--text-muted)";
    title.style.marginBottom = "8px";
    title.textContent = "Variáveis Dinâmicas do Template:";
    container.appendChild(title);

    uniqueVars.forEach((varNum) => {
      const group = document.createElement("div");
      group.className = "form-group";
      group.style.marginBottom = "10px";

      group.innerHTML = `
        <label style="font-size: 11px;">Variável {{${varNum}}}:</label>
        <input type="text" class="form-control tmpl-var-input" data-var="${varNum}" placeholder="Ex: Valor para {{${varNum}}}">
      `;
      container.appendChild(group);
    });

    $$(".tmpl-var-input", container).forEach((inp) => {
      inp.addEventListener("input", () => renderTemplateSimulator(tmpl));
    });
  } else if (card) {
    card.style.display = "none";
  }
}

/**
 * Renderiza a pré-visualização ao vivo do template no simulador do celular
 * @param {object|null} tmpl
 */
export function renderTemplateSimulator(tmpl) {
  const elements = {
    headerEl: $("#sim-bubble-header"),
    bodyEl: $("#sim-bubble-body"),
    footerEl: $("#sim-bubble-footer"),
    buttonsEl: $("#sim-bubble-buttons"),
  };

  const values = {};
  $$(".tmpl-var-input").forEach((inp) => {
    const varKey = inp.getAttribute("data-var");
    if (varKey) values[varKey] = inp.value;
  });

  renderWhatsAppBubble({
    elements,
    data: tmpl,
    values,
    emptyBodyMessage: "Selecione um template para visualizar o conteúdo.",
  });
}

/**
 * Abre a visão de criação ou edição de templates
 * @param {'create'|'edit'} mode
 * @param {object|null} tmpl
 */
function openEditor(mode = "create", tmpl = null) {
  editorMode = mode;
  editingTemplateId = tmpl ? tmpl.id : null;

  const listView = $("#templates-list-view");
  const editorView = $("#templates-editor-view");
  const titleEl = $("#editor-view-title");
  const badgeEl = $("#editor-preview-badge");
  const nameInput = $("#editor-tmpl-name");
  const categorySelect = $("#editor-tmpl-category");
  const langSelect = $("#editor-tmpl-language");
  const headerTypeSelect = $("#editor-tmpl-header-type");
  const headerTextInput = $("#editor-tmpl-header-text");
  const headerTextGroup = $("#editor-tmpl-header-text-group");
  const bodyTextarea = $("#editor-tmpl-body-text");
  const footerInput = $("#editor-tmpl-footer-text");

  if (listView) listView.style.display = "none";
  if (editorView) editorView.style.display = "block";

  editorButtons = [];

  if (mode === "create") {
    if (titleEl) titleEl.textContent = "Criar Novo Message Template";
    if (badgeEl) {
      badgeEl.textContent = "NOVO";
      badgeEl.className = "status-pill status-yellow";
    }

    if (nameInput) {
      nameInput.value = "";
      nameInput.disabled = false;
    }
    if (categorySelect) categorySelect.value = "UTILITY";
    if (langSelect) langSelect.value = "pt_BR";
    if (headerTypeSelect) headerTypeSelect.value = "NONE";
    if (headerTextGroup) headerTextGroup.style.display = "none";
    if (headerTextInput) headerTextInput.value = "";
    if (bodyTextarea) bodyTextarea.value = "";
    if (footerInput) footerInput.value = "";
  } else if (mode === "edit" && tmpl) {
    if (titleEl) titleEl.textContent = `Editar Template: ${tmpl.name}`;
    if (badgeEl) {
      badgeEl.textContent = "EDITANDO";
      badgeEl.className = "status-pill status-yellow";
    }

    if (nameInput) {
      nameInput.value = tmpl.name || "";
      nameInput.disabled = true; // Meta não permite renomear templates existentes
    }
    if (categorySelect) categorySelect.value = tmpl.category || "UTILITY";
    if (langSelect) langSelect.value = tmpl.language || "pt_BR";

    // Componentes existentes
    const comps = tmpl.components || {};
    const header = comps.header;
    const body = comps.body;
    const footer = comps.footer;
    const buttons = comps.buttons || [];

    if (header && header.format) {
      if (headerTypeSelect) headerTypeSelect.value = header.format;
      if (header.format === "TEXT") {
        if (headerTextGroup) headerTextGroup.style.display = "block";
        if (headerTextInput) headerTextInput.value = header.text || "";
      } else {
        if (headerTextGroup) headerTextGroup.style.display = "none";
        if (headerTextInput) headerTextInput.value = "";
      }
    } else {
      if (headerTypeSelect) headerTypeSelect.value = "NONE";
      if (headerTextGroup) headerTextGroup.style.display = "none";
      if (headerTextInput) headerTextInput.value = "";
    }

    if (bodyTextarea) bodyTextarea.value = body?.text || "";
    if (footerInput) footerInput.value = footer?.text || "";

    // Botões existentes
    if (Array.isArray(buttons)) {
      buttons.forEach((b) => {
        editorButtons.push({
          type: b.type || "QUICK_REPLY",
          text: b.text || b.title || "",
          value: b.url || b.phone_number || "",
        });
      });
    }
  }

  renderEditorButtons();
  updateBodyCharCount();
  renderLiveEditorPreview();
}

/**
 * Fecha a tela do editor e retorna à lista de templates
 */
function closeEditor() {
  const listView = $("#templates-list-view");
  const editorView = $("#templates-editor-view");
  if (editorView) editorView.style.display = "none";
  if (listView) listView.style.display = "block";
}

/**
 * Atualiza o contador de caracteres do corpo do template
 */
function updateBodyCharCount() {
  const textarea = $("#editor-tmpl-body-text");
  const counter = $("#editor-tmpl-body-count");
  if (!textarea || !counter) return;

  const count = textarea.value.length;
  counter.textContent = `${count} / 1024`;
  counter.style.color = count > 1000 ? "var(--status-red)" : "var(--text-dim)";
}

/**
 * Renderiza a prévia do WhatsApp no editor em tempo real
 */
function renderLiveEditorPreview() {
  const headerType = $("#editor-tmpl-header-type")?.value || "NONE";
  const headerText = $("#editor-tmpl-header-text")?.value || "";
  const bodyText = $("#editor-tmpl-body-text")?.value || "";
  const footerText = $("#editor-tmpl-footer-text")?.value || "";

  let headerComp = null;
  if (headerType === "TEXT" && headerText.trim()) {
    headerComp = { format: "TEXT", text: headerText.trim() };
  } else if (headerType === "IMAGE") {
    headerComp = { format: "IMAGE", text: "📷 [Imagem de Cabeçalho]" };
  } else if (headerType === "VIDEO") {
    headerComp = { format: "VIDEO", text: "🎥 [Vídeo de Cabeçalho]" };
  } else if (headerType === "DOCUMENT") {
    headerComp = { format: "DOCUMENT", text: "📄 [Documento/PDF de Cabeçalho]" };
  }

  const buttons = editorButtons.map((b) => ({
    type: b.type,
    text: b.text || "Botão",
  }));

  const mockTmpl = {
    components: {
      header: headerComp,
      body: { text: bodyText },
      footer: footerText.trim() ? { text: footerText.trim() } : null,
      buttons,
    },
  };

  const elements = {
    headerEl: $("#editor-sim-header"),
    bodyEl: $("#editor-sim-body"),
    footerEl: $("#editor-sim-footer"),
    buttonsEl: $("#editor-sim-buttons"),
  };

  renderWhatsAppBubble({
    elements,
    data: mockTmpl,
    values: {},
    emptyBodyMessage: "Comece a preencher o formulário para visualizar seu template aqui...",
  });
}

/**
 * Insere uma variável sequencial {{1}}, {{2}} na posição do cursor na textarea do corpo
 */
function insertVariableIntoBody() {
  const textarea = $("#editor-tmpl-body-text");
  if (!textarea) return;

  const currentText = textarea.value;
  const matches = currentText.match(/\{\{(\d+)\}\}/g) || [];
  let nextNumber = 1;

  if (matches.length > 0) {
    const numbers = matches.map((m) => parseInt(m.replace(/[{}]/g, ""), 10));
    nextNumber = Math.max(...numbers) + 1;
  }

  const tag = `{{${nextNumber}}}`;
  const start = textarea.selectionStart || currentText.length;
  const end = textarea.selectionEnd || currentText.length;

  textarea.value = currentText.substring(0, start) + tag + currentText.substring(end);
  textarea.selectionStart = textarea.selectionEnd = start + tag.length;
  textarea.focus();

  updateBodyCharCount();
  renderLiveEditorPreview();
}

/**
 * Renderiza a lista dinâmica de botões no editor
 */
function renderEditorButtons() {
  const container = $("#editor-buttons-container");
  if (!container) return;

  container.innerHTML = "";

  if (editorButtons.length === 0) {
    container.innerHTML = `<span style="font-size: 12px; color: var(--text-dim);">Nenhum botão adicionado ainda.</span>`;
    return;
  }

  editorButtons.forEach((btn, index) => {
    const row = document.createElement("div");
    row.className = "editor-button-item";

    const isUrl = btn.type === "URL";
    const isPhone = btn.type === "PHONE_NUMBER";

    row.innerHTML = `
      <select class="form-control btn-type-select" style="max-width: 160px;">
        <option value="QUICK_REPLY" ${btn.type === "QUICK_REPLY" ? "selected" : ""}>Resposta Rápida</option>
        <option value="URL" ${btn.type === "URL" ? "selected" : ""}>Link / URL</option>
        <option value="PHONE_NUMBER" ${btn.type === "PHONE_NUMBER" ? "selected" : ""}>Telefone / Ligar</option>
      </select>

      <input type="text" class="form-control btn-text-input" placeholder="Texto do Botão (máx 25)" maxlength="25" value="${escapeHtml(btn.text)}">

      <input type="text" class="form-control btn-val-input" placeholder="${isUrl ? "https://seusite.com/{{1}}" : isPhone ? "+5511999998888" : ""}" style="display: ${isUrl || isPhone ? "block" : "none"};" value="${escapeHtml(btn.value)}">

      <button type="button" class="btn-icon-delete btn-remove-btn" title="Remover Botão">
        <span>🗑️</span>
      </button>
    `;

    const typeSelect = row.querySelector(".btn-type-select");
    const textInput = row.querySelector(".btn-text-input");
    const valInput = row.querySelector(".btn-val-input");
    const removeBtn = row.querySelector(".btn-remove-btn");

    typeSelect?.addEventListener("change", (e) => {
      btn.type = e.target.value;
      if (btn.type === "URL") {
        valInput.style.display = "block";
        valInput.placeholder = "https://seusite.com/{{1}}";
      } else if (btn.type === "PHONE_NUMBER") {
        valInput.style.display = "block";
        valInput.placeholder = "+5511999998888";
      } else {
        valInput.style.display = "none";
        btn.value = "";
      }
      renderLiveEditorPreview();
    });

    textInput?.addEventListener("input", (e) => {
      btn.text = e.target.value;
      renderLiveEditorPreview();
    });

    valInput?.addEventListener("input", (e) => {
      btn.value = e.target.value;
      renderLiveEditorPreview();
    });

    removeBtn?.addEventListener("click", () => {
      editorButtons.splice(index, 1);
      renderEditorButtons();
      renderLiveEditorPreview();
    });

    container.appendChild(row);
  });
}

/**
 * Valida o formulário e envia o template para aprovação na Meta via API
 * @param {object} api
 */
async function submitTemplate(api) {
  const name = $("#editor-tmpl-name")?.value.trim().toLowerCase();
  const category = $("#editor-tmpl-category")?.value;
  const language = $("#editor-tmpl-language")?.value || "pt_BR";
  const headerType = $("#editor-tmpl-header-type")?.value || "NONE";
  const headerText = $("#editor-tmpl-header-text")?.value.trim();
  const bodyText = $("#editor-tmpl-body-text")?.value.trim();
  const footerText = $("#editor-tmpl-footer-text")?.value.trim();

  // 1. Validações locais
  if (!name) {
    await customAlert("Por favor, preencha o nome do template.", "Campo Obrigatório");
    $("#editor-tmpl-name")?.focus();
    return;
  }

  if (!/^[a-z0-9_]+$/.test(name)) {
    await customAlert("O nome do template deve conter apenas letras minúsculas (a-z), números (0-9) e sublinhados (_).", "Nome Inválido");
    $("#editor-tmpl-name")?.focus();
    return;
  }

  if (!bodyText) {
    await customAlert("O corpo (Body) da mensagem é obrigatório.", "Campo Obrigatório");
    $("#editor-tmpl-body-text")?.focus();
    return;
  }

  // Validação de variáveis sequenciais
  const matches = bodyText.match(/\{\{(\d+)\}\}/g) || [];
  if (matches.length > 0) {
    const indices = matches.map((m) => parseInt(m.replace(/[{}]/g, ""), 10));
    const unique = [...new Set(indices)].sort((a, b) => a - b);
    if (unique[0] !== 1) {
      await customAlert(`As variáveis devem começar em {{1}}. Primeira variável encontrada: {{${unique[0]}}}.`, "Formato Inválido");
      return;
    }
    for (let i = 0; i < unique.length; i++) {
      if (unique[i] !== i + 1) {
        await customAlert(`As variáveis devem ser estritamente sequenciais. Falta {{${i + 1}}} antes de {{${unique[i]}}}.`, "Sequência Inválida");
        return;
      }
    }
  }

  // 2. Construção dos componentes no formato esperado pela Meta Graph API
  const components = [];

  // Cabeçalho
  if (headerType === "TEXT" && headerText) {
    components.push({
      type: "HEADER",
      format: "TEXT",
      text: headerText,
    });
  } else if (headerType !== "NONE") {
    components.push({
      type: "HEADER",
      format: headerType, // 'IMAGE' | 'VIDEO' | 'DOCUMENT'
    });
  }

  // Corpo
  components.push({
    type: "BODY",
    text: bodyText,
  });

  // Rodapé
  if (footerText) {
    components.push({
      type: "FOOTER",
      text: footerText,
    });
  }

  // Botões
  if (editorButtons.length > 0) {
    const formattedButtons = editorButtons.map((b) => {
      if (b.type === "URL") {
        return {
          type: "URL",
          text: b.text || "Visitar Site",
          url: b.value || "https://exemplo.com",
        };
      } else if (b.type === "PHONE_NUMBER") {
        return {
          type: "PHONE_NUMBER",
          text: b.text || "Ligar Agora",
          phone_number: b.value || "",
        };
      } else {
        return {
          type: "QUICK_REPLY",
          text: b.text || "Opção",
        };
      }
    });

    components.push({
      type: "BUTTONS",
      buttons: formattedButtons,
    });
  }

  // 3. Envio à API
  const submitBtnTop = $("#btn-submit-template-top");
  const submitBtnBottom = $("#btn-submit-template-bottom");

  const setSubmitting = (isSubmitting) => {
    if (submitBtnTop) {
      submitBtnTop.disabled = isSubmitting;
      submitBtnTop.textContent = isSubmitting ? "Enviando..." : "📤 Enviar para a Meta";
    }
    if (submitBtnBottom) {
      submitBtnBottom.disabled = isSubmitting;
      submitBtnBottom.textContent = isSubmitting ? "Enviando..." : "📤 Enviar para Análise da Meta";
    }
  };

  setSubmitting(true);

  try {
    let res;
    if (editorMode === "create") {
      res = await api.createTemplate({
        name,
        category,
        language,
        components,
      });
    } else {
      res = await api.updateTemplate(editingTemplateId, {
        category,
        components,
      });
    }

    if (res && res.success) {
      await customAlert(
        editorMode === "create"
          ? "✅ Template enviado com sucesso para a Meta! Ele entrará na fila de análise automática."
          : "✅ Alterações salvas com sucesso! O template foi reenviado para análise da Meta.",
        "Sucesso!"
      );
      if (editorMode === "create") {
        toastInfo(
          "Template em Análise ⏳",
          `O template "${name}" foi submetido à Meta. Você receberá uma notificação automática assim que for analisado.`
        );
      }
      closeEditor();
      await loadTemplatesList(api);
    } else {
      await customAlert(
        `❌ Falha ao processar template na Meta:\n\n${res?.error || "Erro desconhecido"}`,
        "Erro na Meta API"
      );
    }
  } catch (err) {
    await customAlert(`❌ Erro inesperado: ${err.message}`, "Erro");
  } finally {
    setSubmitting(false);
  }
}

/**
 * Exclui um template com confirmação e atualiza a interface
 * @param {object} tmpl
 * @param {object} api
 */
async function deleteTemplateAction(tmpl, api) {
  if (!tmpl) return;

  const confirmed = await customConfirm(
    `Tem certeza que deseja excluir o template "${tmpl.name}" da Meta?\n\nEsta ação é definitiva e removerá o template da sua conta do WhatsApp Business.`,
    "Excluir Message Template",
    "Sim, Excluir",
    "Cancelar",
    "btn-danger"
  );

  if (!confirmed) return;

  try {
    const res = await api.deleteTemplate(tmpl.name, tmpl.id);
    if (res && res.success) {
      await customAlert(`✅ Template "${tmpl.name}" excluído com sucesso!`, "Excluído");
      if (selectedTemplate && selectedTemplate.name === tmpl.name) {
        selectedTemplate = null;
      }
      await loadTemplatesList(api);
    } else {
      await customAlert(`❌ Não foi possível excluir: ${res?.error || "Erro desconhecido"}`, "Erro");
    }
  } catch (err) {
    await customAlert(`❌ Erro: ${err.message}`, "Erro");
  }
}

/**
 * Consulta o status mais recente do template na Meta sob demanda
 * @param {object} tmpl
 * @param {object} api
 */
async function refreshTemplateAction(tmpl, api) {
  if (!tmpl) return;

  try {
    const res = await api.refreshTemplateStatus(tmpl.id);
    if (res && res.success) {
      await customAlert(
        `Status atualizado para "${tmpl.name}":\n\nStatus: ${res.template?.status || "APPROVED"}`,
        "Status Atualizado"
      );
      await loadTemplatesList(api);
    } else {
      await customAlert(`Não foi possível checar o status: ${res?.error || "Erro desconhecido"}`, "Aviso");
    }
  } catch (err) {
    await customAlert(`Erro: ${err.message}`, "Erro");
  }
}

/**
 * Inicializa os controles da aba de Message Templates
 * @param {object} api - Instância da API do Context Bridge
 */
export function initTemplates(api) {
  // 1. Sincronização de Templates com a Graph API
  const btnSyncTemplates = $("#btn-sync-templates-action");
  if (btnSyncTemplates) {
    btnSyncTemplates.addEventListener("click", async () => {
      btnSyncTemplates.disabled = true;
      btnSyncTemplates.textContent = "Sincronizando...";

      try {
        const res = await api.syncTemplates();
        if (res && res.success) {
          await customAlert(`✅ Sincronização concluída! ${res.count || (res.templates && res.templates.length) || 0} templates encontrados.`);
          await loadTemplatesList(api);
        } else {
          await customAlert(`⚠️ Falha ao sincronizar: ${res?.error || "Erro desconhecido"}`);
        }
      } catch (err) {
        await customAlert(`❌ Erro: ${err.message}`);
      } finally {
        btnSyncTemplates.disabled = false;
        btnSyncTemplates.textContent = "🔄 Sincronizar com a Meta";
      }
    });
  }

  // 2. Filtros de Status (Pills / Chips)
  $$(".tmpl-filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      $$(".tmpl-filter-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      currentFilter = chip.getAttribute("data-status") || "ALL";
      renderTemplatesList(api);
    });
  });

  // 3. Campo de Busca
  const searchInput = $("#tmpl-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.trim();
      renderTemplatesList(api);
    });
  }

  // 4. Botões de Abertura do Criador
  $("#btn-open-create-template")?.addEventListener("click", () => openEditor("create"));
  $("#btn-empty-create-template")?.addEventListener("click", () => openEditor("create"));

  // 5. Botões de Voltar / Cancelar no Editor
  $("#btn-back-to-templates-list")?.addEventListener("click", closeEditor);
  $("#btn-cancel-template-top")?.addEventListener("click", closeEditor);
  $("#btn-cancel-template-bottom")?.addEventListener("click", closeEditor);

  // 6. Botão "Corrigir e Reenviar" no banner de rejeição
  $("#btn-fix-rejected-template")?.addEventListener("click", () => {
    if (selectedTemplate) {
      openEditor("edit", selectedTemplate);
    }
  });

  // 7. Ações de rodapé da visualização
  $("#btn-edit-selected-template")?.addEventListener("click", () => {
    if (selectedTemplate) openEditor("edit", selectedTemplate);
  });
  $("#btn-refresh-selected-template")?.addEventListener("click", () => {
    if (selectedTemplate) refreshTemplateAction(selectedTemplate, api);
  });
  $("#btn-delete-selected-template")?.addEventListener("click", () => {
    if (selectedTemplate) deleteTemplateAction(selectedTemplate, api);
  });

  // 8. Auto-formatação do nome do template no editor
  const nameInput = $("#editor-tmpl-name");
  if (nameInput) {
    nameInput.addEventListener("input", (e) => {
      const clean = e.target.value
        .toLowerCase()
        .replace(/[\s\-]+/g, "_")
        .replace(/[^a-z0-9_]/g, "");
      e.target.value = clean;
    });
  }

  // 9. Alternância do tipo de cabeçalho
  const headerTypeSelect = $("#editor-tmpl-header-type");
  const headerTextGroup = $("#editor-tmpl-header-text-group");
  const headerTextInput = $("#editor-tmpl-header-text");
  if (headerTypeSelect) {
    headerTypeSelect.addEventListener("change", () => {
      if (headerTypeSelect.value === "TEXT") {
        if (headerTextGroup) headerTextGroup.style.display = "block";
      } else {
        if (headerTextGroup) headerTextGroup.style.display = "none";
      }
      renderLiveEditorPreview();
    });
  }
  if (headerTextInput) {
    headerTextInput.addEventListener("input", renderLiveEditorPreview);
  }

  // 10. Atualização ao vivo do corpo e contador
  const bodyTextarea = $("#editor-tmpl-body-text");
  if (bodyTextarea) {
    bodyTextarea.addEventListener("input", () => {
      updateBodyCharCount();
      renderLiveEditorPreview();
    });
  }

  // 11. Botão Inserir Variável {{n}}
  $("#btn-insert-variable")?.addEventListener("click", insertVariableIntoBody);

  // 12. Atualização ao vivo do rodapé
  const footerInput = $("#editor-tmpl-footer-text");
  if (footerInput) {
    footerInput.addEventListener("input", renderLiveEditorPreview);
  }

  // 13. Botão Adicionar Botão no editor
  $("#btn-add-editor-button")?.addEventListener("click", () => {
    if (editorButtons.length >= 3) {
      customAlert("A Meta permite no máximo 3 botões por mensagem.", "Limite Atingido");
      return;
    }
    editorButtons.push({ type: "QUICK_REPLY", text: "", value: "" });
    renderEditorButtons();
    renderLiveEditorPreview();
  });

  // 14. Submissão do Template
  $("#btn-submit-template-top")?.addEventListener("click", () => submitTemplate(api));
  $("#btn-submit-template-bottom")?.addEventListener("click", () => submitTemplate(api));

  // 15. Listener em tempo real para atualizações de status de templates via Webhook
  if (typeof api.onTemplateStatusChanged === "function") {
    api.onTemplateStatusChanged((update) => {
      console.log("🔔 [Templates] Atualização de status recebida via Webhook:", update);
      if (!update) return;

      const { templateId, templateName, event, reason, recommendation } = update;
      const target = loadedTemplates.find(
        (t) => (templateId && String(t.id) === String(templateId)) || (templateName && t.name.toLowerCase() === String(templateName).toLowerCase())
      );

      if (target) {
        target.status = event;
        if (reason) target.rejectionReason = reason;
        if (recommendation) target.rejectionRecommendation = recommendation;
        updateCounts();
        renderTemplatesList(api);

        if (selectedTemplate && selectedTemplate.name === target.name) {
          selectTemplate(target);
        }
      } else {
        loadTemplatesList(api);
      }

      // Disparo de Toasts em tempo real com ações contextuais
      if (event === "APPROVED") {
        toastSuccess(
          "Template Aprovado! 🎉",
          `O template "${templateName}" foi aprovado pela Meta e já está disponível para envio.`,
          {
            duration: 8000,
            action: {
              label: "Ver no Disparador",
              onClick: () => {
                navigateToTab("tab-broadcast");
                const bcSelect = $("#broadcast-template-select");
                if (bcSelect) bcSelect.value = templateName;
              },
            },
          }
        );
      } else if (event === "REJECTED") {
        toastError(
          "Template Rejeitado pela Meta ⚠️",
          `O template "${templateName}" foi rejeitado. Motivo: ${reason || "Não especificado"}.`,
          {
            duration: 10000,
            action: {
              label: "Corrigir e Reenviar",
              onClick: () => {
                navigateToTab("tab-templates");
                const tmplToFix = loadedTemplates.find((t) => t.name === templateName);
                if (tmplToFix) {
                  openEditor("edit", tmplToFix);
                }
              },
            },
          }
        );
      } else if (event === "PAUSED") {
        toastWarning(
          "Template Pausado ⏸️",
          `O template "${templateName}" foi pausado temporariamente pela Meta.`,
          { duration: 7000 }
        );
      } else if (event === "DISABLED") {
        toastError(
          "Template Desativado ⚫",
          `O template "${templateName}" foi desativado pela Meta devido ao índice de qualidade.`,
          { duration: 8000 }
        );
      }
    });
  }

  return {
    loadTemplatesList: () => loadTemplatesList(api),
    getLoadedTemplates,
    renderTemplateSimulator,
  };
}

// Compatibilidade para testes em ambiente Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    getLoadedTemplates,
    loadTemplatesList,
    extractTemplateVariables,
    generateVariableInputs,
    renderTemplateSimulator,
    initTemplates,
  };
}
