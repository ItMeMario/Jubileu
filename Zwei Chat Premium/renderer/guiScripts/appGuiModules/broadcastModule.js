// renderer/guiScripts/appGuiModules/broadcastModule.js
// Disparador Oficial em Lote (Broadcast) com Message Templates homologados pela Meta

import { $, $$, formatDate, escapeHtml, downloadCsvFile } from "./domUtils.js";
import { customAlert, customConfirm } from "../utils/confirmModal.js";
import { renderWhatsAppBubble } from "./whatsAppPreviewHelper.js";
import { extractTemplateVariables } from "./templatesModule.js";
import { IntervalSelector } from "../utils/intervalSelector.js";

// Estado interno em memória
let currentRecipients = [];
let broadcastIntervalSelector = null;
let broadcastIsActive = false;

/**
 * Faz o parse de texto com múltiplos contatos (uma linha por contato)
 * Formato esperado: "Telefone, Nome/Var1, Var2, Var3..." ou "Nome, Telefone"
 * @param {string} rawText
 * @returns {Array<{ phone: string, name: string, variables: string[] }>}
 */
export function parseRecipientsInput(rawText) {
  if (!rawText || typeof rawText !== "string") return [];

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const parsed = [];

  lines.forEach((line, index) => {
    // Ignora cabeçalhos comuns na linha 0
    if (
      index === 0 &&
      (line.toLowerCase().includes("telefone") ||
        line.toLowerCase().includes("phone") ||
        line.toLowerCase().includes("nome") ||
        line.toLowerCase().includes("name") ||
        line.toLowerCase().includes("celular"))
    ) {
      return;
    }

    const parts = line.split(/[;,]/).map((p) => p.trim().replace(/^["']|["']$/g, ""));
    if (parts.length === 0) return;

    // Detecta se a coluna 0 ou 1 é o telefone
    let phone = "";
    let name = "";
    let variables = [];

    const digits0 = parts[0].replace(/\D/g, "");
    const digits1 = parts[1] ? parts[1].replace(/\D/g, "") : "";

    if (digits0.length >= 8) {
      phone = parts[0];
      name = parts[1] || "";
      variables = parts.slice(1);
    } else if (digits1.length >= 8) {
      name = parts[0];
      phone = parts[1];
      variables = [name, ...parts.slice(2)];
    } else {
      phone = parts[0];
      name = parts[1] || "";
      variables = parts.slice(1);
    }

    if (phone.length > 0) {
      parsed.push({ phone, name, variables });
    }
  });

  return parsed;
}

/**
 * Carrega a lista de destinatários do backend e atualiza a interface
 * @param {object} api
 */
export async function loadBroadcastRecipients(api) {
  if (!api || typeof api.getRecipients !== "function") return;

  try {
    currentRecipients = (await api.getRecipients()) || [];
    renderRecipientsList(api);
    await updateBroadcastStats(api);
  } catch (err) {
    console.error("Erro ao carregar lista de destinatários:", err);
  }
}

/**
 * Renderiza a lista visual de contatos na fila
 * @param {object} api
 */
function renderRecipientsList(api) {
  const listEl = $("#bc-contacts-list");
  const placeholderEl = $("#bc-contacts-placeholder");
  const badgeCountEl = $("#bc-badge-count");

  if (badgeCountEl) {
    badgeCountEl.textContent = String(currentRecipients.length);
  }

  if (!listEl) return;

  listEl.innerHTML = "";

  if (currentRecipients.length === 0) {
    if (placeholderEl) placeholderEl.style.display = "flex";
    listEl.style.display = "none";
    return;
  }

  if (placeholderEl) placeholderEl.style.display = "none";
  listEl.style.display = "flex";

  currentRecipients.forEach((rcpt) => {
    const li = document.createElement("li");
    li.className = "contact-item";
    li.id = `contact-item-${rcpt.id}`;

    let statusLabel = "Pendente";
    let badgeClass = "status-pill status-yellow";

    if (rcpt.status === "sent") {
      statusLabel = "Enviado";
      badgeClass = "status-pill status-green";
    } else if (rcpt.status === "failed") {
      statusLabel = "Falha";
      badgeClass = "status-pill status-red";
    }

    const varsText = Array.isArray(rcpt.variables) && rcpt.variables.length > 0
      ? ` | Vars: [${rcpt.variables.join(", ")}]`
      : "";

    li.innerHTML = `
      <div class="contact-item-info">
        <span class="contact-item-phone">${escapeHtml(rcpt.phone)}</span>
        <span class="contact-item-meta" title="${escapeHtml(rcpt.name || "Sem Nome")}">
          👤 ${escapeHtml(rcpt.name || "Sem Nome")}${escapeHtml(varsText)}
        </span>
        ${
          rcpt.error
            ? `<span style="font-size: 10px; color: var(--status-red); margin-top: 2px;">⚠️ ${escapeHtml(rcpt.error)}</span>`
            : ""
        }
      </div>
      <div class="contact-item-actions">
        <span class="${badgeClass}" style="font-size: 11px; padding: 2px 8px;">${statusLabel}</span>
        <button class="btn-remove-contact" data-id="${rcpt.id}" title="Remover contato">✕</button>
      </div>
    `;

    li.querySelector(".btn-remove-contact")?.addEventListener("click", async (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      if (id) {
        try {
          await api.removeRecipient(id);
          currentRecipients = currentRecipients.filter((c) => c.id !== id);
          renderRecipientsList(api);
          await updateBroadcastStats(api);
        } catch (err) {
          await customAlert(`Erro ao remover contato: ${err.message}`);
        }
      }
    });

    listEl.appendChild(li);
  });
}

/**
 * Atualiza os contadores de estatísticas em tempo real
 * @param {object} api
 */
export async function updateBroadcastStats(api) {
  if (!api || typeof api.getBroadcastStats !== "function") return;

  try {
    const stats = (await api.getBroadcastStats()) || { total: 0, pending: 0, sent: 0, failed: 0 };

    const statTotal = $("#bc-stat-total");
    const statPending = $("#bc-stat-pending");
    const statSent = $("#bc-stat-sent");
    const statFailed = $("#bc-stat-failed");
    const badgeCount = $("#bc-badge-count");

    if (statTotal) statTotal.textContent = String(stats.total || 0);
    if (statPending) statPending.textContent = String(stats.pending || 0);
    if (statSent) statSent.textContent = String(stats.sent || 0);
    if (statFailed) statFailed.textContent = String(stats.failed || 0);
    if (badgeCount) badgeCount.textContent = String(stats.total || 0);
  } catch (err) {
    console.error("Erro ao atualizar estatísticas do broadcast:", err);
  }
}

/**
 * Carrega e renderiza o histórico de campanhas executadas
 * @param {object} api
 */
export async function loadBroadcastHistory(api) {
  if (!api || typeof api.getCampaignHistory !== "function") return;

  const broadcastHistoryTbody = $("#broadcast-history-tbody");
  if (!broadcastHistoryTbody) return;

  try {
    const history = await api.getCampaignHistory();
    broadcastHistoryTbody.innerHTML = "";

    if (!Array.isArray(history) || history.length === 0) {
      broadcastHistoryTbody.innerHTML =
        '<tr><td colspan="7" style="text-align: center; color: var(--text-dim);">Nenhuma campanha executada ainda.</td></tr>';
      return;
    }

    history.forEach((camp) => {
      const tr = document.createElement("tr");
      const dateStr = formatDate(camp.startedAt);

      tr.innerHTML = `
        <td><b>${escapeHtml(camp.campaignId)}</b></td>
        <td><span class="status-pill status-green">${escapeHtml(camp.templateName)}</span></td>
        <td>${camp.total}</td>
        <td style="color: var(--status-green); font-weight: bold;">${camp.sent}</td>
        <td style="color: var(--status-red); font-weight: bold;">${camp.failed}</td>
        <td>${dateStr}</td>
        <td>
          <button class="btn btn-secondary btn-export-csv" data-id="${camp.campaignId}" style="padding: 4px 8px; font-size: 11px;">
            📥 CSV
          </button>
        </td>
      `;
      broadcastHistoryTbody.appendChild(tr);
    });

    $$(".btn-export-csv", broadcastHistoryTbody).forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const campId = e.currentTarget.getAttribute("data-id");
        if (!campId) return;

        try {
          const res = await api.exportCampaignCsv(campId);
          if (res && res.success && res.csv) {
            downloadCsvFile(`relatorio_${campId}.csv`, res.csv);
          } else {
            await customAlert("Não foi possível gerar o arquivo CSV.");
          }
        } catch (err) {
          await customAlert(`Erro ao exportar CSV: ${err.message}`);
        }
      });
    });
  } catch (error) {
    console.error("Erro ao carregar histórico de disparos:", error);
  }
}

/**
 * Carrega as opções salvas de formatação e cadência
 * @param {object} api
 */
export async function loadBroadcastConfig(api) {
  if (!api || typeof api.getBroadcastConfig !== "function") return;

  try {
    const config = await api.getBroadcastConfig();
    if (!config) return;

    const opt9Digit = $("#bc-opt-9digit");
    const optDDD = $("#bc-opt-ddd");
    const optDDDVal = $("#bc-opt-ddd-val");
    const optPrefix = $("#bc-opt-prefix");
    const optPrefixVal = $("#bc-opt-prefix-val");

    if (opt9Digit) opt9Digit.checked = !!config.add9thDigit;
    if (optDDD) optDDD.checked = !!config.addDDD;
    if (optDDDVal) optDDDVal.value = config.defaultDDD || "11";
    if (optPrefix) optPrefix.checked = !!config.addCountryPrefix;
    if (optPrefixVal) optPrefixVal.value = config.defaultCountryPrefix || "55";

    if (broadcastIntervalSelector && config.dispatchInterval) {
      broadcastIntervalSelector.setValue(config.dispatchInterval);
    }
  } catch (err) {
    console.error("Erro ao carregar configurações de broadcast:", err);
  }
}

/**
 * Inicializa os controles, botões e listeners em tempo real do Disparador Oficial
 * @param {object} api - Instância da API
 * @param {object} [options={}]
 * @param {Function} [options.getLoadedTemplates] - Função para obter templates em cache
 */
export function initBroadcast(api, options = {}) {
  if (!api) return;

  // 1. Inicializa o seletor de cadência (IntervalSelector)
  const intervalContainer = $("#bc-interval-selector-container");
  if (intervalContainer) {
    broadcastIntervalSelector = IntervalSelector.init(intervalContainer, {
      defaultUnit: "seconds",
      showSeconds: true,
    });
  }

  // 2. Configuração de Navegação entre Sub-abas
  setupSubtabsNavigation();

  // 3. Configuração de Templates & Preview na Sub-aba 1
  setupTemplatePreviewHandlers(options.getLoadedTemplates);

  // 4. Configuração de Contatos & Importação CSV na Sub-aba 2
  setupContactsManagementHandlers(api);

  // 5. Configuração de Disparo & Console ao Vivo na Sub-aba 3
  setupDispatchExecutionHandlers(api, options.getLoadedTemplates);

  // 6. Listeners IPC em Tempo Real
  setupBroadcastIPCListeners(api);

  // 7. Atualização manual do Histórico na Sub-aba 4
  const btnRefreshHistory = $("#bc-btn-refresh-history");
  if (btnRefreshHistory) {
    btnRefreshHistory.addEventListener("click", () => loadBroadcastHistory(api));
  }
}

/**
 * Gerencia a alternância visual entre as 4 sub-abas
 */
function setupSubtabsNavigation() {
  const subtabButtons = [
    { btn: $("#bc-subtab-template"), sec: $("#bc-sec-template") },
    { btn: $("#bc-subtab-contacts"), sec: $("#bc-sec-contacts") },
    { btn: $("#bc-subtab-dispatch"), sec: $("#bc-sec-dispatch") },
    { btn: $("#bc-subtab-history"), sec: $("#bc-sec-history") },
  ];

  subtabButtons.forEach(({ btn, sec }) => {
    if (!btn || !sec) return;

    btn.addEventListener("click", () => {
      subtabButtons.forEach((item) => {
        if (item.btn) item.btn.classList.remove("active");
        if (item.sec) item.sec.style.display = "none";
      });

      btn.classList.add("active");
      sec.style.display = "block";
    });
  });
}

/**
 * Gerencia a seleção de templates e atualização do balão WhatsApp
 */
function setupTemplatePreviewHandlers(getLoadedTemplates) {
  const select = $("#broadcast-template-select");
  if (!select) return;

  select.addEventListener("change", () => {
    const templateName = select.value;
    const templates = typeof getLoadedTemplates === "function" ? getLoadedTemplates() : [];
    const template = templates.find((t) => t.name === templateName) || null;

    const metaInfo = $("#bc-template-meta-info");
    const badgeStatus = $("#bc-tmpl-badge-status");
    const badgeCat = $("#bc-tmpl-badge-cat");
    const badgeLang = $("#bc-tmpl-badge-lang");
    const varsGuideDesc = $("#bc-template-vars-desc");
    const varsList = $("#bc-template-vars-list");

    if (!template) {
      if (metaInfo) metaInfo.style.display = "none";
      if (varsGuideDesc) varsGuideDesc.textContent = "Selecione um template para visualizar suas variáveis.";
      if (varsList) varsList.innerHTML = "";
      renderWhatsAppBubble({
        elements: {
          headerEl: $("#bc-sim-bubble-header"),
          bodyEl: $("#bc-sim-bubble-body"),
          footerEl: $("#bc-sim-bubble-footer"),
          buttonsEl: $("#bc-sim-bubble-buttons"),
        },
        data: null,
      });
      return;
    }

    if (metaInfo) metaInfo.style.display = "block";
    if (badgeStatus) badgeStatus.textContent = template.status || "APPROVED";
    if (badgeCat) badgeCat.textContent = template.category || "MARKETING";
    if (badgeLang) badgeLang.textContent = template.language || "pt_BR";

    // Extrai e lista as variáveis
    const vars = extractTemplateVariables(template);
    if (varsList) {
      varsList.innerHTML = "";
      if (vars.length === 0) {
        if (varsGuideDesc) varsGuideDesc.textContent = "Este template não contém variáveis dinâmicas (texto fixo).";
      } else {
        if (varsGuideDesc) varsGuideDesc.textContent = `Este template requer ${vars.length} variável(is) dinâmica(s):`;
        vars.forEach((v) => {
          const chip = document.createElement("div");
          chip.style.cssText = "font-size: 12px; color: var(--text-main); display: flex; align-items: center; gap: 6px;";
          chip.innerHTML = `<span class="btn-var-chip">{{${v}}}</span> <span>Variável ${v} (ex: ${v === "1" ? "Nome do Cliente" : `Valor ${v}`})</span>`;
          varsList.appendChild(chip);
        });
      }
    }

    // Renderiza a pré-visualização no balão do WhatsApp
    renderWhatsAppBubble({
      elements: {
        headerEl: $("#bc-sim-bubble-header"),
        bodyEl: $("#bc-sim-bubble-body"),
        footerEl: $("#bc-sim-bubble-footer"),
        buttonsEl: $("#bc-sim-bubble-buttons"),
      },
      data: template,
    });
  });
}

/**
 * Gerencia a adição manual, dropzone CSV, colar em lote e limpeza de contatos
 */
function setupContactsManagementHandlers(api) {
  // 1. Adicionar Contato Manual
  const btnAdd = $("#bc-btn-add-contact");
  const inputPhone = $("#bc-input-phone");
  const inputName = $("#bc-input-name");
  const inputVars = $("#bc-input-vars");

  if (btnAdd) {
    btnAdd.addEventListener("click", async () => {
      const phone = inputPhone?.value?.trim();
      const name = inputName?.value?.trim() || "";
      const rawVars = inputVars?.value?.trim() || "";

      if (!phone) {
        await customAlert("Por favor, informe ao menos o número de telefone com DDD.");
        return;
      }

      let variables = [];
      if (name) variables.push(name);
      if (rawVars) {
        const extraVars = rawVars.split(",").map((v) => v.trim()).filter((v) => v.length > 0);
        variables.push(...extraVars);
      }

      try {
        await api.addRecipient({ phone, name, variables });
        if (inputPhone) inputPhone.value = "";
        if (inputName) inputName.value = "";
        if (inputVars) inputVars.value = "";
        await loadBroadcastRecipients(api);
      } catch (err) {
        await customAlert(`Erro ao adicionar contato: ${err.message}`);
      }
    });
  }

  // 2. Dropzone e Input de Arquivo CSV
  const dropzone = $("#bc-csv-dropzone");
  const fileInput = $("#bc-csv-file-input");

  if (dropzone && fileInput) {
    dropzone.addEventListener("click", () => fileInput.click());

    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });

    dropzone.addEventListener("dragleave", () => {
      dropzone.classList.remove("dragover");
    });

    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
      if (e.dataTransfer?.files?.length > 0) {
        processCsvFile(e.dataTransfer.files[0], api);
      }
    });

    fileInput.addEventListener("change", (e) => {
      if (e.target?.files?.length > 0) {
        processCsvFile(e.target.files[0], api);
      }
    });
  }

  // 3. Colar em Lote (Bulk Paste)
  const btnToggleBulk = $("#bc-btn-toggle-bulk-paste");
  const bulkContainer = $("#bc-bulk-paste-container");
  const bulkInput = $("#bc-bulk-paste-input");
  const btnImportBulk = $("#bc-btn-import-bulk");

  if (btnToggleBulk && bulkContainer) {
    btnToggleBulk.addEventListener("click", () => {
      const isHidden = bulkContainer.style.display === "none";
      bulkContainer.style.display = isHidden ? "block" : "none";
      btnToggleBulk.textContent = isHidden ? "✕ Fechar Caixa de Texto" : "📋 Colar Lista de Texto";
    });
  }

  if (btnImportBulk && bulkInput) {
    btnImportBulk.addEventListener("click", async () => {
      const text = bulkInput.value?.trim();
      if (!text) {
        await customAlert("Por favor, cole ao menos um contato na caixa de texto.");
        return;
      }

      const contacts = parseRecipientsInput(text);
      if (contacts.length === 0) {
        await customAlert("Nenhum contato válido detectado no texto informado.");
        return;
      }

      try {
        const count = await api.addRecipientsBatch(contacts);
        await customAlert(`✅ ${count} contato(s) importado(s) com sucesso para a fila!`);
        bulkInput.value = "";
        if (bulkContainer) bulkContainer.style.display = "none";
        if (btnToggleBulk) btnToggleBulk.textContent = "📋 Colar Lista de Texto";
        await loadBroadcastRecipients(api);
      } catch (err) {
        await customAlert(`Erro ao importar contatos: ${err.message}`);
      }
    });
  }

  // 4. Salvar Configurações de Formatação
  const btnSaveConfig = $("#bc-btn-save-format-config");
  if (btnSaveConfig) {
    btnSaveConfig.addEventListener("click", async () => {
      const opt9Digit = $("#bc-opt-9digit");
      const optDDD = $("#bc-opt-ddd");
      const optDDDVal = $("#bc-opt-ddd-val");
      const optPrefix = $("#bc-opt-prefix");
      const optPrefixVal = $("#bc-opt-prefix-val");

      const intervalVal = broadcastIntervalSelector ? broadcastIntervalSelector.getValue() : null;

      const configToSave = {
        add9thDigit: !!opt9Digit?.checked,
        addDDD: !!optDDD?.checked,
        defaultDDD: optDDDVal?.value?.trim() || "11",
        addCountryPrefix: !!optPrefix?.checked,
        defaultCountryPrefix: optPrefixVal?.value?.trim() || "55",
      };

      if (intervalVal) {
        configToSave.dispatchInterval = intervalVal;
      }

      try {
        await api.saveBroadcastConfig(configToSave);
        await customAlert("Configurações de formatação e intervalo salvas com sucesso!");
      } catch (err) {
        await customAlert(`Erro ao salvar configurações: ${err.message}`);
      }
    });
  }

  // 5. Botões de Limpeza Rápida
  $("#bc-btn-clear-failed")?.addEventListener("click", async () => {
    try {
      const count = await api.clearRecipients("failed");
      await loadBroadcastRecipients(api);
      await customAlert(`🧹 ${count} contato(s) com falha removido(s).`);
    } catch (err) {
      await customAlert(`Erro ao limpar contatos com falha: ${err.message}`);
    }
  });

  $("#bc-btn-clear-sent")?.addEventListener("click", async () => {
    try {
      const count = await api.clearRecipients("sent");
      await loadBroadcastRecipients(api);
      await customAlert(`🧹 ${count} contato(s) já enviados removido(s).`);
    } catch (err) {
      await customAlert(`Erro ao limpar contatos enviados: ${err.message}`);
    }
  });

  $("#bc-btn-clear-all")?.addEventListener("click", async () => {
    const confirmed = await customConfirm(
      "Deseja realmente esvaziar toda a fila de destinatários?",
      "Limpar Fila Completa",
      "Sim, Limpar",
      "Cancelar",
      "btn-danger"
    );
    if (confirmed) {
      try {
        await api.clearRecipients("all");
        await loadBroadcastRecipients(api);
      } catch (err) {
        await customAlert(`Erro ao limpar fila: ${err.message}`);
      }
    }
  });
}

/**
 * Lê e processa arquivo CSV enviado pelo usuário
 * @param {File} file
 * @param {object} api
 */
function processCsvFile(file, api) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const content = e.target?.result;
      if (!content || typeof content !== "string") {
        await customAlert("O arquivo CSV selecionado está vazio.");
        return;
      }

      const contacts = parseRecipientsInput(content);
      if (contacts.length === 0) {
        await customAlert("Nenhum contato válido identificado no arquivo CSV.");
        return;
      }

      const count = await api.addRecipientsBatch(contacts);
      await customAlert(`🎉 Importação Concluída!\n${count} contato(s) adicionados à fila de disparo.`);
      await loadBroadcastRecipients(api);
    } catch (err) {
      await customAlert(`Erro ao processar arquivo CSV: ${err.message}`);
    }
  };
  reader.readAsText(file, "UTF-8");
}

/**
 * Gerencia a execução de disparo, controles de pausa/parada e console de logs
 */
function setupDispatchExecutionHandlers(api, getLoadedTemplates) {
  const btnStart = $("#btn-start-broadcast");
  const btnPause = $("#btn-pause-broadcast");
  const btnResume = $("#btn-resume-broadcast");
  const btnStop = $("#btn-stop-broadcast");
  const btnClearLogs = $("#bc-btn-clear-logs");
  const terminalContainer = $("#bc-logs-terminal-container");
  const statusLabel = $("#bc-dispatch-status-label");
  const globalIndicator = $("#broadcast-global-indicator");
  const globalStatusText = $("#broadcast-global-status-text");

  function setDispatchActiveUI(active) {
    broadcastIsActive = !!active;

    if (globalIndicator) {
      globalIndicator.className = active ? "status-indicator connected" : "status-indicator disconnected";
    }
    if (globalStatusText) {
      globalStatusText.textContent = active ? "Disparando Mensagens..." : "Disparo Inativo";
    }

    if (btnStart) btnStart.style.display = active ? "none" : "inline-flex";
    if (btnPause) btnPause.style.display = active ? "inline-flex" : "none";
    if (btnResume) btnResume.style.display = "none";
    if (btnStop) btnStop.style.display = active ? "inline-flex" : "none";
  }

  // 1. Iniciar Campanha
  if (btnStart) {
    btnStart.addEventListener("click", async () => {
      const templateSelect = $("#broadcast-template-select");
      const templateName = templateSelect?.value;

      if (!templateName) {
        await customAlert("Por favor, selecione um template aprovado na primeira sub-aba (Template & Preview).");
        return;
      }

      if (currentRecipients.length === 0) {
        await customAlert("A fila de contatos está vazia! Adicione ou importe contatos antes de disparar.");
        return;
      }

      const pendingCount = currentRecipients.filter((r) => r.status === "pending" || r.status === "failed").length;
      if (pendingCount === 0) {
        await customAlert("Todos os contatos da fila já foram enviados com sucesso. Limpe os enviados ou adicione novos.");
        return;
      }

      const templates = typeof getLoadedTemplates === "function" ? getLoadedTemplates() : [];
      const selectedTmpl = templates.find((t) => t.name === templateName);
      const languageCode = selectedTmpl?.language || "pt_BR";

      const intervalSettings = broadcastIntervalSelector ? broadcastIntervalSelector.getValue() : null;

      // Salva a configuração de intervalo
      if (intervalSettings) {
        await api.saveBroadcastConfig({ dispatchInterval: intervalSettings });
      }

      setDispatchActiveUI(true);
      if (statusLabel) statusLabel.textContent = "Disparo em andamento...";

      try {
        await api.startBroadcast({
          templateName,
          languageCode,
          dispatchInterval: intervalSettings,
        });
      } catch (err) {
        setDispatchActiveUI(false);
        if (statusLabel) statusLabel.textContent = "Erro ao iniciar";
        await customAlert(`❌ Falha ao iniciar campanha: ${err.message}`);
      }
    });
  }

  // 2. Pausar
  if (btnPause) {
    btnPause.addEventListener("click", async () => {
      try {
        await api.pauseBroadcast();
        btnPause.style.display = "none";
        if (btnResume) btnResume.style.display = "inline-flex";
        if (statusLabel) statusLabel.textContent = "Disparo Pausado";
        if (globalIndicator) globalIndicator.className = "status-indicator warning";
        if (globalStatusText) globalStatusText.textContent = "Disparo Pausado";
      } catch (err) {
        console.error("Erro ao pausar disparo:", err);
      }
    });
  }

  // 3. Retomar
  if (btnResume) {
    btnResume.addEventListener("click", async () => {
      try {
        await api.resumeBroadcast();
        btnResume.style.display = "none";
        if (btnPause) btnPause.style.display = "inline-flex";
        if (statusLabel) statusLabel.textContent = "Disparo em andamento...";
        if (globalIndicator) globalIndicator.className = "status-indicator connected";
        if (globalStatusText) globalStatusText.textContent = "Disparando Mensagens...";
      } catch (err) {
        console.error("Erro ao retomar disparo:", err);
      }
    });
  }

  // 4. Interromper
  if (btnStop) {
    btnStop.addEventListener("click", async () => {
      const confirmed = await customConfirm(
        "Deseja realmente interromper o disparo desta campanha?",
        "Interromper Campanha",
        "Sim, Interromper",
        "Continuar",
        "btn-danger"
      );
      if (confirmed) {
        try {
          await api.stopBroadcast();
          setDispatchActiveUI(false);
          if (statusLabel) statusLabel.textContent = "Disparo Interrompido";
        } catch (err) {
          console.error("Erro ao parar disparo:", err);
        }
      }
    });
  }

  // 5. Limpar Logs
  if (btnClearLogs && terminalContainer) {
    btnClearLogs.addEventListener("click", () => {
      terminalContainer.innerHTML =
        '<div class="terminal-placeholder" id="bc-terminal-placeholder">Console de logs limpo.</div>';
    });
  }
}

/**
 * Registra os ouvintes em tempo real para alimentação do console, progresso e conclusão
 * @param {object} api
 */
function setupBroadcastIPCListeners(api) {
  const terminalContainer = $("#bc-logs-terminal-container");
  const progressBar = $("#bc-dispatch-progress-bar");
  const percentLabel = $("#bc-dispatch-percent-label");
  const statusLabel = $("#bc-dispatch-status-label");
  const statTotal = $("#bc-stat-total");
  const statPending = $("#bc-stat-pending");
  const statSent = $("#bc-stat-sent");
  const statFailed = $("#bc-stat-failed");
  const globalIndicator = $("#broadcast-global-indicator");
  const globalStatusText = $("#broadcast-global-status-text");

  // Log linha a linha
  if (typeof api.onBroadcastLog === "function") {
    api.onBroadcastLog((logEntry) => {
      if (!terminalContainer) return;

      const placeholder = $("#bc-terminal-placeholder");
      if (placeholder) placeholder.remove();

      const timeStr = new Date(logEntry.timestamp || Date.now()).toLocaleTimeString("pt-BR");
      const entryDiv = document.createElement("div");
      entryDiv.className = `log-entry ${logEntry.status || "info"}`;

      entryDiv.innerHTML = `
        <span class="log-time">[${timeStr}]</span>
        <span class="log-text">${escapeHtml(logEntry.message)}</span>
      `;

      terminalContainer.appendChild(entryDiv);
      terminalContainer.scrollTop = terminalContainer.scrollHeight;
    });
  }

  // Progresso geral
  if (typeof api.onBroadcastProgress === "function") {
    api.onBroadcastProgress((stats) => {
      const percent = stats.progressPercent || 0;
      if (progressBar) progressBar.style.width = `${percent}%`;
      if (percentLabel) percentLabel.textContent = `${percent}%`;
      if (statTotal) statTotal.textContent = String(stats.total || 0);
      if (statSent) statSent.textContent = String(stats.sent || 0);
      if (statFailed) statFailed.textContent = String(stats.failed || 0);
      if (statPending) statPending.textContent = String(stats.total - (stats.processed || 0));
    });
  }

  // Conclusão
  if (typeof api.onBroadcastCompleted === "function") {
    api.onBroadcastCompleted(async (stats) => {
      if (globalIndicator) globalIndicator.className = "status-indicator disconnected";
      if (globalStatusText) globalStatusText.textContent = "Disparo Concluído";
      if (statusLabel) statusLabel.textContent = "✅ Campanha Concluída!";

      const btnStart = $("#btn-start-broadcast");
      const btnPause = $("#btn-pause-broadcast");
      const btnResume = $("#btn-resume-broadcast");
      const btnStop = $("#btn-stop-broadcast");

      if (btnStart) btnStart.style.display = "inline-flex";
      if (btnPause) btnPause.style.display = "none";
      if (btnResume) btnResume.style.display = "none";
      if (btnStop) btnStop.style.display = "none";

      await customAlert(
        `🎉 Campanha finalizada com sucesso!\nTotal: ${stats.total}\nEnviados: ${stats.sent}\nFalhas: ${stats.failed}`
      );

      await loadBroadcastRecipients(api);
      await loadBroadcastHistory(api);
    });
  }

  // Atualização unitária de destinatário
  if (typeof api.onRecipientUpdated === "function") {
    api.onRecipientUpdated((data) => {
      const item = currentRecipients.find((r) => r.id === data.id || r.phone === data.phone);
      if (item) {
        item.status = data.status;
        const domItem = document.getElementById(`contact-item-${item.id}`);
        if (domItem) {
          const badge = domItem.querySelector(".status-pill");
          if (badge) {
            badge.className = data.status === "sent" ? "status-pill status-green" : "status-pill status-red";
            badge.textContent = data.status === "sent" ? "Enviado" : "Falha";
          }
        }
      }
    });
  }
}

// Compatibilidade para testes em ambiente Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    parseRecipientsInput,
    loadBroadcastHistory,
    loadBroadcastRecipients,
    loadBroadcastConfig,
  };
}
