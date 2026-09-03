// renderer/guiScripts/appGuiModules/flowsModules/flowsState.js
// Estado centralizado e reativo para o Flow Builder do Zwei Chat Premium

let currentEditingFlow = null;
let activeEditingStepId = null;

/**
 * Retorna o fluxo atualmente em edição no Flow Builder
 * @returns {object|null}
 */
export function getCurrentEditingFlow() {
  return currentEditingFlow;
}

/**
 * Define o fluxo atualmente em edição
 * @param {object|null} flow
 */
export function setCurrentEditingFlow(flow) {
  currentEditingFlow = flow;
}

/**
 * Retorna o ID do passo atualmente selecionado para prévia
 * @returns {string|null}
 */
export function getActiveEditingStepId() {
  return activeEditingStepId;
}

/**
 * Define o ID do passo selecionado para prévia
 * @param {string|null} stepId
 */
export function setActiveEditingStepId(stepId) {
  activeEditingStepId = stepId;
}

/**
 * Reseta o estado do fluxo e do passo ativo
 */
export function resetFlowsState() {
  currentEditingFlow = null;
  activeEditingStepId = null;
}

// Compatibilidade para testes em ambiente Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    getCurrentEditingFlow,
    setCurrentEditingFlow,
    getActiveEditingStepId,
    setActiveEditingStepId,
    resetFlowsState,
  };
}
