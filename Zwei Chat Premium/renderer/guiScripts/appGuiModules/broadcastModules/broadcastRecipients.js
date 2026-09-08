// renderer/guiScripts/appGuiModules/broadcastModules/broadcastRecipients.js
// Gestão visual da fila de contatos, adição manual, importação CSV/lote e limpeza

import { $, escapeHtml } from "../domUtils.js";
import { customAlert, customConfirm } from "../../utils/confirmModal.js";
import { getCurrentRecipients, setCurrentRecipients } from "./broadcastState.js";
import { parseRecipientsInput, processCsvFile } from "./broadcastParser.js";

/**
 * Carrega a lista de destinatários do backend e atualiza a interface
 * @param {object} api
 */
export async function loadBroadcastRecipients(api) {
  if (!api || typeof api.getRecipients !== "function") return;

  try {
    const list = (await api.getRecipients()) || [];
    setCurrentRecipients(list);
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
export function renderRecipientsList(api) {
  const currentRecipients = getCurrentRecipients();
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
          const updated = getCurrentRecipients().filter((c) => c.id !== id);
          setCurrentRecipients(updated);
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
 * Gerencia a adição manual, dropzone CSV, colar em lote e limpeza de contatos
 * @param {object} api
 */
export function setupContactsManagementHandlers(api) {
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
        processCsvFile(e.dataTransfer.files[0], api, () => loadBroadcastRecipients(api));
      }
    });

    fileInput.addEventListener("change", (e) => {
      if (e.target?.files?.length > 0) {
        processCsvFile(e.target.files[0], api, () => loadBroadcastRecipients(api));
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

  // 4. Botões de Limpeza Rápida
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

// Compatibilidade para testes em ambiente Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    loadBroadcastRecipients,
    renderRecipientsList,
    updateBroadcastStats,
    setupContactsManagementHandlers,
  };
}
