// renderer/guiScripts/flows.js
import FlowsList from "./flowsModules/flowsList.js";
import FlowsBuilder from "./flowsModules/flowsBuilder.js";
import FlowsActions from "./flowsModules/flowsActions.js";

class FlowsManager {
  constructor() {
    this.currentFlow = null;
    this.flowsInitialized = false;

    // Cache dos elementos do DOM
    this.flowListView = null;
    this.flowBuilderView = null;
    this.btnCreateFlow = null;
    this.btnBackToList = null;
    this.btnSaveFlow = null;
    this.flowsList = null;
    this.flowNameInput = null;
    this.flowStepsContainer = null;
    this.btnAddStepTrigger = null;
    this.addStepDropdown = null;

    // Instancia submódulos
    this.list = new FlowsList(this);
    this.builder = new FlowsBuilder(this);
    this.actions = new FlowsActions(this);
  }

  /**
   * Função para escapar strings contra injeção de HTML
   */
  escapeHTML(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Inicializa o gerenciador e mapeia elementos
   */
  async init() {
    if (this.flowsInitialized) {
      await this.list.loadFlowsList();
      return;
    }

    console.log("FlowsManager: Inicializando elementos de interface e ouvintes...");

    // Mapeamento DOM
    this.flowListView = document.getElementById("flow-list-view");
    this.flowBuilderView = document.getElementById("flow-builder-view");
    this.btnCreateFlow = document.getElementById("btn-create-flow");
    this.btnBackToList = document.getElementById("btn-back-to-list");
    this.btnSaveFlow = document.getElementById("btn-save-flow");
    this.flowsList = document.getElementById("flows-list");
    this.flowNameInput = document.getElementById("flow-name-input");
    this.flowStepsContainer = document.getElementById("flow-steps-container");
    this.btnAddStepTrigger = document.getElementById("btn-add-step-trigger");
    this.addStepDropdown = document.getElementById("add-step-dropdown");

    // Listeners
    this.setupUIEventListeners();

    // Carrega do banco
    await this.list.loadFlowsList();

    this.flowsInitialized = true;
    console.log("FlowsManager: Inicializado com sucesso!");
  }

  /**
   * Event listeners gerais da aba
   */
  setupUIEventListeners() {
    // Voltar para a Lista de Fluxos
    this.btnBackToList.addEventListener("click", () => {
      this.flowListView.classList.add("active");
      this.flowBuilderView.classList.remove("active");
      this.currentFlow = null;
      this.list.loadFlowsList();
    });

    // Criar Novo Fluxo
    this.btnCreateFlow.addEventListener("click", () => {
      this.builder.openFlowBuilder(null);
    });

    // Salvar Fluxo
    this.btnSaveFlow.addEventListener("click", () => this.actions.saveCurrentFlow());

    // Adicionar Ação (Dropdown)
    this.btnAddStepTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      this.addStepDropdown.classList.toggle("hidden");
    });

    // Esconde o dropdown quando clica fora
    document.addEventListener("click", () => {
      this.addStepDropdown.classList.add("hidden");
    });

    // Clique nos itens do dropdown
    this.addStepDropdown.querySelectorAll(".dropdown-item").forEach((item) => {
      item.addEventListener("click", () => {
        const type = item.getAttribute("data-type");
        this.actions.addStep(type);
      });
    });
  }
}

// Instanciação e exposição global
const flowsManager = new FlowsManager();

window.initFlows = async function() {
  await flowsManager.init();
};
