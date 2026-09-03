// renderer/guiScripts/appGuiModules/broadcastModule.js
// Disparador Oficial em Lote (Broadcast) com Message Templates homologados pela Meta

import { $, $$, formatDate, downloadCsvFile } from "./domUtils.js";
import { customAlert, customConfirm } from "../utils/confirmModal.js";

/**
 * Faz o parse da lista de contatos em formato de linhas separadas por vírgula
 * Formato esperado por linha: "Telefone, Nome/Var1, Var2, Var3..."
 * @param {string} rawText
 * @returns {Array<{ phone: string, name: string, variables: string[] }>}
 */
export function parseRecipientsInput(rawText) {
  if (!rawText || typeof rawText !== "string") return [];

  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return lines.map((line) => {
    const parts = line.split(",").map((p) => p.trim());
    const phone = parts[0] || "";
    const name = parts[1] || "";
    const variables = parts.slice(1);
    return { phone, name, variables };
  }).filter((r) => r.phone.length > 0);
}

/**
 * Carrega e renderiza o histórico de campanhas executadas
 * @param {object} api - Instância da API
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
        <td><b>${camp.campaignId}</b></td>
        <td><span class="status-pill status-green">${camp.templateName}</span></td>
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

    // Vincula eventos de exportação de CSV para cada campanha
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
 * Inicializa os controles, botões e listeners em tempo real do Disparador
 * @param {object} api - Instância da API
 * @param {object} [options={}]
 * @param {Function} [options.getLoadedTemplates] - Função para obter templates em cache
 */
export function initBroadcast(api, options = {}) {
  const broadcastTemplateSelect = $("#broadcast-template-select");
  const broadcastRecipientsInput = $("#broadcast-recipients-input");
  const btnStartBroadcast = $("#btn-start-broadcast");
  const btnPauseBroadcast = $("#btn-pause-broadcast");
  const btnResumeBroadcast = $("#btn-resume-broadcast");
  const btnStopBroadcast = $("#btn-stop-broadcast");
  const broadcastProgressPanel = $("#broadcast-progress-panel");
  const broadcastProgressBar = $("#broadcast-progress-bar");
  const broadcastPercentLabel = $("#broadcast-percent-label");
  const broadcastStatusLabel = $("#broadcast-status-label");
  const bcTotal = $("#bc-total");
  const bcSent = $("#bc-sent");
  const bcFailed = $("#bc-failed");

  function resetBroadcastControls() {
    if (btnStartBroadcast) btnStartBroadcast.style.display = "inline-flex";
    if (btnPauseBroadcast) btnPauseBroadcast.style.display = "none";
    if (btnResumeBroadcast) btnResumeBroadcast.style.display = "none";
    if (btnStopBroadcast) btnStopBroadcast.style.display = "none";
  }

  // 1. Iniciar Disparo
  if (btnStartBroadcast) {
    btnStartBroadcast.addEventListener("click", async () => {
      const templateName = broadcastTemplateSelect?.value;
      const rawText = broadcastRecipientsInput?.value?.trim();

      if (!templateName) {
        await customAlert("Por favor, selecione um template aprovado para o disparo.");
        return;
      }

      if (!rawText) {
        await customAlert("Por favor, insira a lista de destinatários.");
        return;
      }

      const recipients = parseRecipientsInput(rawText);
      if (recipients.length === 0) {
        await customAlert("Nenhum contato válido informado.");
        return;
      }

      if (broadcastProgressPanel) broadcastProgressPanel.style.display = "block";
      if (btnStartBroadcast) btnStartBroadcast.style.display = "none";
      if (btnPauseBroadcast) btnPauseBroadcast.style.display = "inline-flex";
      if (btnStopBroadcast) btnStopBroadcast.style.display = "inline-flex";
      if (broadcastStatusLabel) broadcastStatusLabel.textContent = "Iniciando disparo...";

      const templates = typeof options.getLoadedTemplates === "function" ? options.getLoadedTemplates() : [];
      const selectedTmpl = templates.find((t) => t.name === templateName);
      const language = selectedTmpl ? selectedTmpl.language : "pt_BR";

      try {
        await api.startBroadcast({
          templateName,
          language,
          recipients,
          delayBetweenMessagesMs: 1500,
        });
      } catch (err) {
        await customAlert(`❌ Falha ao iniciar disparo: ${err.message}`);
        resetBroadcastControls();
      }
    });
  }

  // 2. Pausar Disparo
  if (btnPauseBroadcast) {
    btnPauseBroadcast.addEventListener("click", async () => {
      try {
        await api.pauseBroadcast();
        btnPauseBroadcast.style.display = "none";
        if (btnResumeBroadcast) btnResumeBroadcast.style.display = "inline-flex";
        if (broadcastStatusLabel) broadcastStatusLabel.textContent = "Disparo Pausado";
      } catch (err) {
        console.error("Erro ao pausar disparo:", err);
      }
    });
  }

  // 3. Retomar Disparo
  if (btnResumeBroadcast) {
    btnResumeBroadcast.addEventListener("click", async () => {
      try {
        await api.resumeBroadcast();
        btnResumeBroadcast.style.display = "none";
        if (btnPauseBroadcast) btnPauseBroadcast.style.display = "inline-flex";
        if (broadcastStatusLabel) broadcastStatusLabel.textContent = "Enviando mensagens...";
      } catch (err) {
        console.error("Erro ao retomar disparo:", err);
      }
    });
  }

  // 4. Parar / Cancelar Disparo
  if (btnStopBroadcast) {
    btnStopBroadcast.addEventListener("click", async () => {
      const confirmed = await customConfirm(
        "Deseja realmente interromper esta campanha?",
        "Interromper Campanha",
        "Sim, Interromper",
        "Continuar",
        "btn-danger"
      );
      if (confirmed) {
        try {
          await api.stopBroadcast();
          resetBroadcastControls();
          if (broadcastStatusLabel) broadcastStatusLabel.textContent = "Disparo Interrompido";
        } catch (err) {
          console.error("Erro ao parar disparo:", err);
        }
      }
    });
  }

  // 5. Listener de Progresso em Tempo Real
  if (typeof api.onBroadcastProgress === "function") {
    api.onBroadcastProgress((stats) => {
      if (broadcastProgressBar) broadcastProgressBar.style.width = `${stats.progressPercent || 0}%`;
      if (broadcastPercentLabel) broadcastPercentLabel.textContent = `${stats.progressPercent || 0}%`;
      if (bcTotal) bcTotal.textContent = String(stats.total || 0);
      if (bcSent) bcSent.textContent = String(stats.sent || 0);
      if (bcFailed) bcFailed.textContent = String(stats.failed || 0);
      if (broadcastStatusLabel) broadcastStatusLabel.textContent = "Enviando mensagens...";
    });
  }

  // 6. Listener de Conclusão de Campanha
  if (typeof api.onBroadcastCompleted === "function") {
    api.onBroadcastCompleted(async (stats) => {
      resetBroadcastControls();
      if (broadcastStatusLabel) broadcastStatusLabel.textContent = "✅ Campanha Concluída!";
      await customAlert(`🎉 Campanha finalizada!\nEnviados com sucesso: ${stats?.sent || 0}\nFalhas: ${stats?.failed || 0}`);
      loadBroadcastHistory(api);
    });
  }

  return {
    loadBroadcastHistory: () => loadBroadcastHistory(api),
    parseRecipientsInput,
    resetBroadcastControls,
  };
}

// Compatibilidade para testes em ambiente Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    parseRecipientsInput,
    loadBroadcastHistory,
    initBroadcast,
  };
}
