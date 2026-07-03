// renderer/guiScripts/flowsModules/flowsActions.js

export default class FlowsActions {
  constructor(manager) {
    this.manager = manager;
  }

  /**
   * Adiciona um novo passo de ação no final do fluxo
   */
  addStep(type) {
    const steps = this.manager.currentFlow.definition.steps || [];
    
    if (type === "send_message") {
      steps.push({
        id: "step_" + Date.now(),
        type: "send_message",
        text: "",
        delay: 0
      });
    } else if (type === "options_menu") {
      steps.push({
        id: "step_" + Date.now(),
        type: "options_menu",
        text: "",
        delay: 0,
        options: [],
        fallback: "Opção inválida. Digite uma das opções do menu."
      });
    }
    
    this.manager.builder.renderSteps();
    
    // Scroll automático
    setTimeout(() => {
      const workspace = document.querySelector(".builder-workspace");
      if (workspace) workspace.scrollTop = workspace.scrollHeight;
    }, 100);
  }

  /**
   * Reordena passos do fluxo
   */
  moveStep(index, direction) {
    const steps = this.manager.currentFlow.definition.steps || [];
    const targetIndex = index + direction;
    
    if (targetIndex >= 0 && targetIndex < steps.length) {
      const temp = steps[index];
      steps[index] = steps[targetIndex];
      steps[targetIndex] = temp;
      this.manager.builder.renderSteps();
    }
  }

  /**
   * Remove um passo do fluxo
   */
  removeStep(index) {
    this.manager.currentFlow.definition.steps.splice(index, 1);
    this.manager.builder.renderSteps();
  }

  /**
   * Valida dados e salva no banco via IPC
   */
  async saveCurrentFlow() {
    const name = this.manager.flowNameInput.value.trim();
    if (!name) {
      alert("Por favor, digite um nome para o fluxo.");
      this.manager.flowNameInput.focus();
      return;
    }
    
    this.manager.currentFlow.name = name;
    
    const trigger = this.manager.currentFlow.definition.trigger || {};
    if (trigger.type !== "all" && (!trigger.keywords || trigger.keywords.length === 0)) {
      alert("Por favor, digite pelo menos uma palavra-chave para o gatilho, ou defina como 'Qualquer mensagem'.");
      return;
    }
    
    try {
      this.manager.btnSaveFlow.disabled = true;
      this.manager.btnSaveFlow.textContent = "Salvando...";
      
      await window.electronAPI.saveFlow(this.manager.currentFlow);
      
      // Volta para a lista de fluxos
      this.manager.flowListView.classList.add("active");
      this.manager.flowBuilderView.classList.remove("active");
      this.manager.currentFlow = null;
      await this.manager.list.loadFlowsList();
    } catch (err) {
      alert("Erro ao salvar fluxo no banco de dados: " + err.message);
    } finally {
      this.manager.btnSaveFlow.disabled = false;
      this.manager.btnSaveFlow.innerHTML = `<span>💾</span> Salvar Fluxo`;
    }
  }
}
