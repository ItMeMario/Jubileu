// renderer/guiScripts/appGuiModules/flowsModule.js
// Construtor Visual de Fluxos de Atendimento (Flow Builder), nós interativos e gestão do Bot
// Ponto de entrada modularizado (Facade) para os submódulos de fluxos

export {
  getCurrentEditingFlow,
  getActiveEditingStepId,
  setCurrentEditingFlow,
  setActiveEditingStepId,
  resetFlowsState,
} from "./flowsModules/flowsState.js";

export { updateBuilderSimulator } from "./flowsModules/flowsSimulator.js";

export {
  getAvailableFlowVariables,
  bindChipsClickEvents,
  updateAllVariableChips,
} from "./flowsModules/flowsVariables.js";

export { loadFlowsList } from "./flowsModules/flowsList.js";

export {
  renderBuilderSteps,
  bindBuilderStepEvents,
} from "./flowsModules/flowsBuilderCanvas.js";

export { openFlowBuilder, initFlows } from "./flowsModules/flowsActions.js";

import { getCurrentEditingFlow, getActiveEditingStepId } from "./flowsModules/flowsState.js";
import { updateBuilderSimulator } from "./flowsModules/flowsSimulator.js";
import { getAvailableFlowVariables, updateAllVariableChips } from "./flowsModules/flowsVariables.js";
import { loadFlowsList } from "./flowsModules/flowsList.js";
import { renderBuilderSteps, bindBuilderStepEvents } from "./flowsModules/flowsBuilderCanvas.js";
import { openFlowBuilder, initFlows } from "./flowsModules/flowsActions.js";

// Compatibilidade para testes em ambiente Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    loadFlowsList,
    openFlowBuilder,
    renderBuilderSteps,
    bindBuilderStepEvents,
    updateBuilderSimulator,
    initFlows,
    getCurrentEditingFlow,
    getActiveEditingStepId,
    getAvailableFlowVariables,
    updateAllVariableChips,
  };
}
