// renderer/guiScripts/appGuiModules/broadcastModules/broadcastHistory.js
// Histórico de campanhas de disparo executadas e exportação de relatórios em CSV

import { $, $$, formatDate, escapeHtml, downloadCsvFile } from "../domUtils.js";
import { customAlert } from "../../utils/confirmModal.js";

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
 * Registra os listeners para atualização manual do histórico
 * @param {object} api
 */
export function setupHistoryHandlers(api) {
  const btnRefreshHistory = $("#bc-btn-refresh-history");
  if (btnRefreshHistory) {
    btnRefreshHistory.addEventListener("click", () => loadBroadcastHistory(api));
  }
}

// Compatibilidade para testes em ambiente Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    loadBroadcastHistory,
    setupHistoryHandlers,
  };
}
