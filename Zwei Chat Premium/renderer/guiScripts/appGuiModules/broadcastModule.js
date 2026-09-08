// renderer/guiScripts/appGuiModules/broadcastModule.js
// Disparador Oficial em Lote (Broadcast) com Message Templates homologados pela Meta
// Ponto de entrada modularizado (Facade) para os submódulos de broadcast

export {
  getCurrentRecipients,
  setCurrentRecipients,
  getBroadcastIntervalSelector,
  setBroadcastIntervalSelector,
  getBroadcastIsActive,
  setBroadcastIsActive,
  resetBroadcastState,
} from "./broadcastModules/broadcastState.js";

export { parseRecipientsInput, processCsvFile } from "./broadcastModules/broadcastParser.js";
export { setupSubtabsNavigation } from "./broadcastModules/broadcastNavigation.js";
export { setupTemplatePreviewHandlers } from "./broadcastModules/broadcastTemplatePreview.js";

export {
  loadBroadcastRecipients,
  renderRecipientsList,
  updateBroadcastStats,
  setupContactsManagementHandlers,
} from "./broadcastModules/broadcastRecipients.js";

export {
  loadBroadcastConfig,
  setupBroadcastConfigHandlers,
} from "./broadcastModules/broadcastConfig.js";

export {
  setDispatchActiveUI,
  setupDispatchExecutionHandlers,
  setupBroadcastIPCListeners,
} from "./broadcastModules/broadcastExecution.js";

export {
  loadBroadcastHistory,
  setupHistoryHandlers,
} from "./broadcastModules/broadcastHistory.js";

import { $ } from "./domUtils.js";
import { IntervalSelector } from "../utils/intervalSelector.js";
import {
  getCurrentRecipients,
  setCurrentRecipients,
  getBroadcastIntervalSelector,
  setBroadcastIntervalSelector,
  getBroadcastIsActive,
  setBroadcastIsActive,
  resetBroadcastState,
} from "./broadcastModules/broadcastState.js";
import { parseRecipientsInput, processCsvFile } from "./broadcastModules/broadcastParser.js";
import { setupSubtabsNavigation } from "./broadcastModules/broadcastNavigation.js";
import { setupTemplatePreviewHandlers } from "./broadcastModules/broadcastTemplatePreview.js";
import {
  loadBroadcastRecipients,
  renderRecipientsList,
  updateBroadcastStats,
  setupContactsManagementHandlers,
} from "./broadcastModules/broadcastRecipients.js";
import {
  loadBroadcastConfig,
  setupBroadcastConfigHandlers,
} from "./broadcastModules/broadcastConfig.js";
import {
  setupDispatchExecutionHandlers,
  setupBroadcastIPCListeners,
} from "./broadcastModules/broadcastExecution.js";
import {
  loadBroadcastHistory,
  setupHistoryHandlers,
} from "./broadcastModules/broadcastHistory.js";

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
    const intervalSelector = IntervalSelector.init(intervalContainer, {
      defaultUnit: "seconds",
      showSeconds: true,
    });
    setBroadcastIntervalSelector(intervalSelector);
  }

  // 2. Configuração de Navegação entre Sub-abas
  setupSubtabsNavigation();

  // 3. Configuração de Templates & Preview na Sub-aba 1
  setupTemplatePreviewHandlers(options.getLoadedTemplates);

  // 4. Configuração de Contatos & Importação CSV na Sub-aba 2
  setupContactsManagementHandlers(api);

  // 5. Configuração de Regras de Formatação e Cadência
  setupBroadcastConfigHandlers(api);

  // 6. Configuração de Disparo & Console ao Vivo na Sub-aba 3
  setupDispatchExecutionHandlers(api, options.getLoadedTemplates);

  // 7. Listeners IPC em Tempo Real
  setupBroadcastIPCListeners(api);

  // 8. Atualização manual do Histórico na Sub-aba 4
  setupHistoryHandlers(api);
}

// Compatibilidade para testes em ambiente Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    parseRecipientsInput,
    processCsvFile,
    loadBroadcastHistory,
    loadBroadcastRecipients,
    renderRecipientsList,
    updateBroadcastStats,
    loadBroadcastConfig,
    initBroadcast,
    getCurrentRecipients,
    setCurrentRecipients,
    getBroadcastIntervalSelector,
    setBroadcastIntervalSelector,
    getBroadcastIsActive,
    setBroadcastIsActive,
    resetBroadcastState,
  };
}
