// renderer/guiScripts/appGuiModules/broadcastModules/broadcastExecution.js
// Execução de disparo em massa, controles de ciclo de vida (Start/Pause/Resume/Stop) e console de telemetria ao vivo

import { $, escapeHtml } from "../domUtils.js";
import { customAlert, customConfirm } from "../../utils/confirmModal.js";
import {
  getCurrentRecipients,
  getBroadcastIntervalSelector,
  setBroadcastIsActive,
} from "./broadcastState.js";
import { loadBroadcastRecipients } from "./broadcastRecipients.js";
import { loadBroadcastHistory } from "./broadcastHistory.js";

/**
 * Atualiza os controles visuais e indicadores quando o disparo é iniciado ou finalizado
 * @param {boolean} active
 */
export function setDispatchActiveUI(active) {
  setBroadcastIsActive(!!active);

  const globalIndicator = $("#broadcast-global-indicator");
  const globalStatusText = $("#broadcast-global-status-text");
  const btnStart = $("#btn-start-broadcast");
  const btnPause = $("#btn-pause-broadcast");
  const btnResume = $("#btn-resume-broadcast");
  const btnStop = $("#btn-stop-broadcast");

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

/**
 * Gerencia a execução de disparo, controles de pausa/parada e console de logs
 * @param {object} api
 * @param {Function} [getLoadedTemplates] - Função para obter templates em cache
 */
export function setupDispatchExecutionHandlers(api, getLoadedTemplates) {
  const btnStart = $("#btn-start-broadcast");
  const btnPause = $("#btn-pause-broadcast");
  const btnResume = $("#btn-resume-broadcast");
  const btnStop = $("#btn-stop-broadcast");
  const btnClearLogs = $("#bc-btn-clear-logs");
  const terminalContainer = $("#bc-logs-terminal-container");
  const statusLabel = $("#bc-dispatch-status-label");

  // 1. Iniciar Campanha
  if (btnStart) {
    btnStart.addEventListener("click", async () => {
      const templateSelect = $("#broadcast-template-select");
      const templateName = templateSelect?.value;

      if (!templateName) {
        await customAlert("Por favor, selecione um template aprovado na primeira sub-aba (Template & Preview).");
        return;
      }

      const currentRecipients = getCurrentRecipients();
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

      const broadcastIntervalSelector = getBroadcastIntervalSelector();
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
        const globalIndicator = $("#broadcast-global-indicator");
        const globalStatusText = $("#broadcast-global-status-text");
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
        const globalIndicator = $("#broadcast-global-indicator");
        const globalStatusText = $("#broadcast-global-status-text");
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
export function setupBroadcastIPCListeners(api) {
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
      const currentRecipients = getCurrentRecipients();
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
    setDispatchActiveUI,
    setupDispatchExecutionHandlers,
    setupBroadcastIPCListeners,
  };
}
