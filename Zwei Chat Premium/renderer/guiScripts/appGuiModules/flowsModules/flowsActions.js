// renderer/guiScripts/appGuiModules/flowsModules/flowsActions.js
// Ações do Flow Builder: inicialização, transição de telas, criação, salvamento e adição de blocos

import { $, $$ } from "../domUtils.js";
import { customAlert } from "../../utils/confirmModal.js";
import {
  getCurrentEditingFlow,
  setCurrentEditingFlow,
  getActiveEditingStepId,
  setActiveEditingStepId,
} from "./flowsState.js";
import { loadFlowsList } from "./flowsList.js";
import { renderBuilderSteps } from "./flowsBuilderCanvas.js";
import { updateBuilderSimulator } from "./flowsSimulator.js";

/**
 * Abre o Flow Builder para visualização e edição de um fluxo
 * @param {object} flow
 */
export function openFlowBuilder(flow) {
  if (!flow) return;

  const currentEditingFlow = JSON.parse(JSON.stringify(flow));
  setCurrentEditingFlow(currentEditingFlow);

  const flowListView = $("#flow-list-view");
  const flowBuilderView = $("#flow-builder-view");
  const builderFlowName = $("#builder-flow-name");
  const builderTriggerKeywords = $("#builder-trigger-keywords");

  if (flowListView) flowListView.style.display = "none";
  if (flowBuilderView) flowBuilderView.style.display = "block";

  if (builderFlowName) builderFlowName.value = currentEditingFlow.name || "";
  if (builderTriggerKeywords) {
    builderTriggerKeywords.value = (currentEditingFlow.triggerKeywords || []).join(", ");
  }

  const stepKeys = Object.keys(currentEditingFlow.steps || {});
  const initialStepId = stepKeys[0] || null;
  setActiveEditingStepId(initialStepId);

  // Sincroniza configurações de Mensagens Fora do Padrão (Mídias, Vídeos, Áudios, Stickers)
  const outConfig = currentEditingFlow.outOfPatternConfig || {
    enabled: true,
    types: ["image", "video", "audio", "document", "sticker"],
    message: "Desculpe, nosso atendimento automático não aceita este tipo de arquivo ou mídia. Por favor, utilize as opções abaixo para prosseguirmos: 👇",
    action: "resume",
  };

  const toggleOutOfPattern = $("#toggle-out-of-pattern");
  const outOfPatternBody = $("#out-of-pattern-body");
  const outOfPatternPanel = $("#out-of-pattern-panel");
  const outOfPatternMessage = $("#out-of-pattern-message");

  if (toggleOutOfPattern) {
    toggleOutOfPattern.checked = Boolean(outConfig.enabled);
  }
  if (outOfPatternBody) {
    outOfPatternBody.style.display = outConfig.enabled ? "flex" : "none";
  }
  if (outOfPatternPanel) {
    if (outConfig.enabled) {
      outOfPatternPanel.classList.add("is-active");
    } else {
      outOfPatternPanel.classList.remove("is-active");
    }
  }
  if (outOfPatternMessage) {
    outOfPatternMessage.value = outConfig.message || "";
  }

  // Sincroniza checkboxes de tipos
  const configuredTypes = Array.isArray(outConfig.types)
    ? outConfig.types
    : ["image", "video", "audio", "document", "sticker"];
  $$(".out-type-cb").forEach((cb) => {
    cb.checked = configuredTypes.includes(cb.value);
  });

  // Sincroniza radio da ação
  const configuredAction = outConfig.action || "resume";
  const actionRadio = $(`input[name="out-of-pattern-action"][value="${configuredAction}"]`);
  if (actionRadio) {
    actionRadio.checked = true;
  }

  renderBuilderSteps();
  updateBuilderSimulator(initialStepId);
}

/**
 * Inicializa todos os botões, listeners e ações da aba de Fluxos e Flow Builder
 * @param {object} api - Instância da API
 */
export function initFlows(api) {
  const btnCreateNewFlow = $("#btn-create-new-flow");
  const btnBackToFlowsList = $("#btn-back-to-flows-list");
  const btnSaveCurrentFlow = $("#btn-save-current-flow");
  const btnToggleAddStep = $("#btn-toggle-add-step");
  const addStepMenu = $("#add-step-menu");
  const toggleBotSwitch = $("#toggle-bot-switch");
  const builderFlowName = $("#builder-flow-name");
  const builderTriggerKeywords = $("#builder-trigger-keywords");

  // 1. Botão Criar Novo Fluxo em Branco
  if (btnCreateNewFlow) {
    btnCreateNewFlow.addEventListener("click", async () => {
      try {
        const newFlow = await api.createEmptyFlow("Novo Fluxo de Atendimento");
        if (newFlow) {
          openFlowBuilder(newFlow);
        }
      } catch (err) {
        await customAlert(`Erro ao criar novo fluxo: ${err.message}`);
      }
    });
  }

  // 2. Botão Voltar para Lista
  if (btnBackToFlowsList) {
    btnBackToFlowsList.addEventListener("click", () => {
      const flowBuilderView = $("#flow-builder-view");
      const flowListView = $("#flow-list-view");
      if (flowBuilderView) flowBuilderView.style.display = "none";
      if (flowListView) flowListView.style.display = "block";
      loadFlowsList(api);
    });
  }

  // 3. Menu de Adição de Novos Passos
  if (btnToggleAddStep && addStepMenu) {
    btnToggleAddStep.addEventListener("click", () => {
      const isHidden = addStepMenu.style.display === "none";
      addStepMenu.style.display = isHidden ? "flex" : "none";
    });
  }

  $$(".add-step-option").forEach((opt) => {
    opt.addEventListener("click", (e) => {
      const type = e.currentTarget.getAttribute("data-type");
      if (addStepMenu) addStepMenu.style.display = "none";
      const currentEditingFlow = getCurrentEditingFlow();
      if (!currentEditingFlow) return;

      const stepCount = Object.keys(currentEditingFlow.steps || {}).length + 1;
      const newStepId = `step_${stepCount}`;

      const newStepData = {
        id: newStepId,
        type: type,
        body: "Nova mensagem de atendimento",
      };

      if (type === "interactive_buttons") {
        newStepData.header = "Atendimento";
        newStepData.footer = "Selecione uma opção:";
        newStepData.buttons = [
          { id: `btn_${newStepId}_1`, title: "Opção 1", nextStepId: null },
          { id: `btn_${newStepId}_2`, title: "Opção 2", nextStepId: null },
        ];
      } else if (type === "interactive_list") {
        newStepData.buttonTitle = "Abrir Opções";
        newStepData.sections = [
          {
            title: "Categoria 1",
            rows: [
              { id: `row_${newStepId}_1`, title: "Serviço A", description: "Descrição do serviço", nextStepId: null },
              { id: `row_${newStepId}_2`, title: "Serviço B", description: "Descrição do serviço", nextStepId: null },
            ],
          },
        ];
      } else if (type === "text") {
        newStepData.nextStepId = null;
      }

      currentEditingFlow.steps[newStepId] = newStepData;
      setActiveEditingStepId(newStepId);
      renderBuilderSteps();
      updateBuilderSimulator(newStepId);
    });
  });

  // 4. Salvar Fluxo
  if (btnSaveCurrentFlow) {
    btnSaveCurrentFlow.addEventListener("click", async () => {
      const currentEditingFlow = getCurrentEditingFlow();
      if (!currentEditingFlow) return;

      const name = builderFlowName?.value?.trim();
      if (!name) {
        await customAlert("Por favor, dê um nome ao seu fluxo.");
        return;
      }

      const rawKeywords = builderTriggerKeywords?.value || "";
      const keywords = rawKeywords
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter((k) => k.length > 0);

      currentEditingFlow.name = name;
      currentEditingFlow.triggerKeywords = keywords.length > 0 ? keywords : ["oi", "ola", "menu"];

      const stepKeys = Object.keys(currentEditingFlow.steps || {});
      if (stepKeys.length === 0) {
        await customAlert("O fluxo precisa de ao menos 1 passo/bloco de mensagem.");
        return;
      }

      if (!currentEditingFlow.initialStepId || !currentEditingFlow.steps[currentEditingFlow.initialStepId]) {
        currentEditingFlow.initialStepId = stepKeys[0];
      }

      // 4.1 Coleta e salva as configurações de Mensagens Fora do Padrão
      const toggleOutOfPattern = $("#toggle-out-of-pattern");
      const outOfPatternMessage = $("#out-of-pattern-message");
      const selectedTypes = [];
      $$(".out-type-cb:checked").forEach((cb) => {
        selectedTypes.push(cb.value);
      });
      const selectedActionRadio = $('input[name="out-of-pattern-action"]:checked');
      const action = selectedActionRadio ? selectedActionRadio.value : "resume";

      currentEditingFlow.outOfPatternConfig = {
        enabled: Boolean(toggleOutOfPattern?.checked),
        types: selectedTypes,
        message:
          outOfPatternMessage?.value?.trim() ||
          "Desculpe, nosso atendimento automático não aceita este tipo de arquivo ou mídia. Por favor, utilize as opções abaixo para prosseguirmos: 👇",
        action: action,
      };

      try {
        await api.saveFlow(currentEditingFlow);
        await customAlert("✅ Fluxo salvo com sucesso!");
        btnBackToFlowsList?.click();
      } catch (err) {
        await customAlert(`Erro ao salvar fluxo: ${err.message}`);
      }
    });
  }

  // 4.2 Eventos do Painel de Mensagens Fora do Padrão
  const toggleOutOfPattern = $("#toggle-out-of-pattern");
  const outOfPatternBody = $("#out-of-pattern-body");
  const outOfPatternPanel = $("#out-of-pattern-panel");
  const outOfPatternHeader = $("#out-of-pattern-header");

  if (toggleOutOfPattern) {
    toggleOutOfPattern.addEventListener("change", (e) => {
      const isEnabled = e.target.checked;
      if (outOfPatternBody) outOfPatternBody.style.display = isEnabled ? "flex" : "none";
      if (outOfPatternPanel) {
        if (isEnabled) outOfPatternPanel.classList.add("is-active");
        else outOfPatternPanel.classList.remove("is-active");
      }
    });
  }

  if (outOfPatternHeader) {
    outOfPatternHeader.addEventListener("click", (e) => {
      if (e.target.closest(".switch")) return;
      if (toggleOutOfPattern) {
        toggleOutOfPattern.checked = !toggleOutOfPattern.checked;
        toggleOutOfPattern.dispatchEvent(new Event("change"));
      }
    });
  }

  // 5. Toggle Geral do Bot
  if (toggleBotSwitch) {
    toggleBotSwitch.addEventListener("change", async () => {
      const enabled = toggleBotSwitch.checked;
      try {
        await api.toggleBot(enabled);
      } catch (err) {
        console.error("Erro ao alterar status do bot:", err);
      }
    });
  }

  return {
    loadFlowsList: () => loadFlowsList(api),
    openFlowBuilder,
    getCurrentEditingFlow,
    getActiveEditingStepId,
  };
}

// Compatibilidade para testes em ambiente Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    openFlowBuilder,
    initFlows,
  };
}
