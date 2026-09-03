// renderer/guiScripts/appGuiModules/flowsModules/flowsVariables.js
// Gestão de variáveis dinâmicas e chips interativos do Flow Builder

import { $, $$, escapeHtml } from "../domUtils.js";
import { customPrompt } from "../../utils/confirmModal.js";
import { getCurrentEditingFlow, getActiveEditingStepId } from "./flowsState.js";
import { updateBuilderSimulator } from "./flowsSimulator.js";

/**
 * Extrai dinamicamente todas as variáveis declaradas nos blocos do fluxo fornecido
 * @param {object} flow
 * @returns {Array<string>}
 */
export function getAvailableFlowVariables(flow) {
  const discovered = new Set(["telefone", "link"]);

  if (flow && flow.steps) {
    for (const [stepId, stepData] of Object.entries(flow.steps)) {
      if (stepData.variableName && stepData.variableName.trim()) {
        discovered.add(stepData.variableName.trim().toLowerCase());
      }
      discovered.add(stepId);

      for (const btn of stepData.buttons || []) {
        if (btn.variableName && btn.variableName.trim()) {
          discovered.add(btn.variableName.trim().toLowerCase());
        }
      }

      for (const sec of stepData.sections || []) {
        for (const row of sec.rows || []) {
          if (row.variableName && row.variableName.trim()) {
            discovered.add(row.variableName.trim().toLowerCase());
          }
        }
      }
    }
  }

  return Array.from(discovered);
}

/**
 * Vincula cliques nos chips de variáveis de um container específico
 * @param {HTMLElement} container
 */
export function bindChipsClickEvents(container) {
  if (!container) return;

  $$(".btn-var-chip:not(.btn-add-custom-var-chip)", container).forEach((chip) => {
    chip.addEventListener("click", (e) => {
      const varTag = e.currentTarget.getAttribute("data-var");
      const card = container.closest(".builder-step-card");
      const bodyInput = $(".step-body-input", card);
      const stepId = card?.getAttribute("data-step-id");
      const flow = getCurrentEditingFlow();
      const step = flow?.steps?.[stepId];

      if (bodyInput && varTag && step) {
        const start = bodyInput.selectionStart || bodyInput.value.length;
        const end = bodyInput.selectionEnd || bodyInput.value.length;
        const text = bodyInput.value;
        bodyInput.value = text.substring(0, start) + varTag + text.substring(end);
        step.body = bodyInput.value;
        bodyInput.focus();
        const newPos = start + varTag.length;
        bodyInput.setSelectionRange(newPos, newPos);
        if (getActiveEditingStepId() === stepId) {
          updateBuilderSimulator(stepId);
        }
      }
    });
  });

  const btnAddCustom = $(".btn-add-custom-var-chip", container);
  if (btnAddCustom) {
    btnAddCustom.addEventListener("click", async () => {
      const customName = await customPrompt(
        "Variável Personalizada",
        "Digite o nome da variável desejada (ex: estado, pais, plano, produto):"
      );
      if (customName && customName.trim()) {
        const cleanVar = customName.trim().replace(/[{}]/g, "").toLowerCase();
        const varTag = `{{${cleanVar}}}`;
        const card = container.closest(".builder-step-card");
        const bodyInput = $(".step-body-input", card);
        const stepId = card?.getAttribute("data-step-id");
        const flow = getCurrentEditingFlow();
        const step = flow?.steps?.[stepId];

        if (bodyInput && step) {
          const start = bodyInput.selectionStart || bodyInput.value.length;
          const end = bodyInput.selectionEnd || bodyInput.value.length;
          const text = bodyInput.value;
          bodyInput.value = text.substring(0, start) + varTag + text.substring(end);
          step.body = bodyInput.value;
          bodyInput.focus();
          const newPos = start + varTag.length;
          bodyInput.setSelectionRange(newPos, newPos);
          if (getActiveEditingStepId() === stepId) {
            updateBuilderSimulator(stepId);
          }
        }
      }
    });
  }
}

/**
 * Atualiza todos os botões de chips de variáveis no Canvas em tempo real
 */
export function updateAllVariableChips() {
  const currentEditingFlow = getCurrentEditingFlow();
  const availableVars = getAvailableFlowVariables(currentEditingFlow);
  const chipsContainers = $$(".var-chips-container");

  chipsContainers.forEach((container) => {
    container.innerHTML = `
      <span class="var-chips-label">🏷️ Variáveis disponíveis:</span>
      ${availableVars
        .map(
          (v) =>
            `<button type="button" class="btn-var-chip" data-var="{{${escapeHtml(v)}}}">+ {{${escapeHtml(v)}}}</button>`
        )
        .join("")}
      <button type="button" class="btn-var-chip btn-add-custom-var-chip" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6; border-color: rgba(59, 130, 246, 0.3);">+ Outra Variável</button>
    `;

    bindChipsClickEvents(container);
  });
}

// Compatibilidade para testes em ambiente Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    getAvailableFlowVariables,
    bindChipsClickEvents,
    updateAllVariableChips,
  };
}
