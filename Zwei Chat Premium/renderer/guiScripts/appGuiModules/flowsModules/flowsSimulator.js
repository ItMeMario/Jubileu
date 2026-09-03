// renderer/guiScripts/appGuiModules/flowsModules/flowsSimulator.js
// Atualização e integração do simulador visual de WhatsApp ao vivo para o Flow Builder

import { $ } from "../domUtils.js";
import { renderWhatsAppBubble } from "../whatsAppPreviewHelper.js";
import { getCurrentEditingFlow } from "./flowsState.js";

/**
 * Atualiza o simulador visual de WhatsApp ao vivo para o passo selecionado
 * @param {string|null} stepId
 */
export function updateBuilderSimulator(stepId) {
  const simStepBadge = $("#sim-step-badge");
  const currentEditingFlow = getCurrentEditingFlow();
  const step = currentEditingFlow?.steps?.[stepId];

  if (simStepBadge) {
    simStepBadge.textContent = stepId ? `# ${stepId.toUpperCase()}` : "NENHUM PASSO";
  }

  const elements = {
    headerEl: $("#builder-sim-header"),
    bodyEl: $("#builder-sim-body"),
    footerEl: $("#builder-sim-footer"),
    buttonsEl: $("#builder-sim-buttons"),
  };

  renderWhatsAppBubble({
    elements,
    data: step,
    emptyBodyMessage: "Selecione ou crie um bloco para pré-visualizar.",
  });
}

// Compatibilidade para testes em ambiente Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    updateBuilderSimulator,
  };
}
