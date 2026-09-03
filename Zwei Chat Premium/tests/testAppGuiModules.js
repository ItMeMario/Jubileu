// tests/testAppGuiModules.js
// Testes unitários para validação dos módulos do appGui (Etapas 1, 2, 3 e 4)

const { formatDate, getStatusBadgeClass, escapeHtml } = require("../renderer/guiScripts/appGuiModules/domUtils.js");
const { interpolateVariables, renderWhatsAppBubble } = require("../renderer/guiScripts/appGuiModules/whatsAppPreviewHelper.js");
const { navigateToTab, initNavigation } = require("../renderer/guiScripts/appGuiModules/navigationModule.js");
const { refreshAccountHealth, initDashboard } = require("../renderer/guiScripts/appGuiModules/dashboardModule.js");
const { loadConfigForm, initSettings } = require("../renderer/guiScripts/appGuiModules/settingsModule.js");
const {
  extractTemplateVariables,
  generateVariableInputs,
  loadTemplatesList,
  initTemplates,
  getLoadedTemplates,
} = require("../renderer/guiScripts/appGuiModules/templatesModule.js");
const {
  parseRecipientsInput,
  loadBroadcastHistory,
  initBroadcast,
} = require("../renderer/guiScripts/appGuiModules/broadcastModule.js");
const {
  loadFlowsList,
  openFlowBuilder,
  renderBuilderSteps,
  updateBuilderSimulator,
  initFlows,
  getCurrentEditingFlow,
  getActiveEditingStepId,
} = require("../renderer/guiScripts/appGuiModules/flowsModule.js");
const {
  customConfirm,
  customAlert,
  customPrompt,
} = require("../renderer/guiScripts/utils/confirmModal.js");

console.log("==================================================");
console.log("🧪 TESTES UNITÁRIOS DOS MÓDULOS DE INTERFACE (ETAPAS 1, 2, 3 E 4)");
console.log("==================================================\n");

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
  }
}

// Mock DOM Global para testes em ambiente Node.js
class MockElement {
  constructor(tag = "div", id = "", className = "") {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this.className = className;
    this.classList = {
      classes: new Set(className ? className.split(" ") : []),
      add: (c) => this.classList.classes.add(c),
      remove: (c) => this.classList.classes.delete(c),
      contains: (c) => this.classList.classes.has(c),
    };
    this.style = {};
    this.attributes = {};
    this.children = [];
    this.listeners = {};
    this.textContent = "";
    this.innerHTML = "";
    this.value = "";
    this.checked = false;
    this.disabled = false;
  }

  setAttribute(name, val) { this.attributes[name] = String(val); }
  getAttribute(name) { return this.attributes[name] || null; }
  addEventListener(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }
  async dispatchEvent(event, data = {}) {
    if (this.listeners[event]) {
      for (const fn of this.listeners[event]) {
        await fn({ ...data, currentTarget: this, target: this, preventDefault: () => {} });
      }
    }
  }
  appendChild(child) { this.children.push(child); }
  removeChild(child) { this.children = this.children.filter((c) => c !== child); }
  querySelector(sel) { return mockQuerySelector(sel, this); }
  querySelectorAll(sel) { return mockQuerySelectorAll(sel, this); }
  closest(sel) {
    if (sel === ".step-item-row" && this.classList.contains("step-item-row")) return this;
    if (this.parent) return this.parent.closest(sel);
    return this;
  }
  click() { return this.dispatchEvent("click"); }
}

const domRegistry = {};

function registerMockEl(id, el) {
  domRegistry[id] = el;
}

function mockQuerySelector(selector, context = global.document) {
  if (selector.startsWith("#")) {
    const id = selector.slice(1);
    return domRegistry[id] || null;
  }
  if (selector.startsWith(".")) {
    const cls = selector.slice(1);
    for (const id in domRegistry) {
      if (domRegistry[id].classList.contains(cls)) return domRegistry[id];
    }
  }
  if (selector.includes("[data-tab=")) {
    const match = selector.match(/data-tab="([^"]+)"/);
    if (match) {
      for (const id in domRegistry) {
        if (domRegistry[id].getAttribute("data-tab") === match[1]) return domRegistry[id];
      }
    }
  }
  if (context && context.children) {
    for (const child of context.children) {
      if (selector.startsWith(".") && child.classList.contains(selector.slice(1))) return child;
      const res = mockQuerySelector(selector, child);
      if (res) return res;
    }
  }
  return null;
}

function mockQuerySelectorAll(selector, context = global.document) {
  const list = [];
  if (context === global.document) {
    if (selector.startsWith(".")) {
      const cls = selector.slice(1);
      for (const id in domRegistry) {
        if (domRegistry[id].classList.contains(cls)) list.push(domRegistry[id]);
      }
    }
    if (selector === "[data-action]") {
      for (const id in domRegistry) {
        if (domRegistry[id].getAttribute("data-action")) list.push(domRegistry[id]);
      }
    }
  }
  if (context && context.children) {
    function traverse(node) {
      for (const child of node.children || []) {
        if (selector.startsWith(".") && child.classList.contains(selector.slice(1))) {
          list.push(child);
        }
        traverse(child);
      }
    }
    traverse(context);
  }
  return list;
}

global.document = {
  createElement: (tag) => new MockElement(tag),
  getElementById: (id) => domRegistry[id] || null,
  querySelector: (sel) => mockQuerySelector(sel),
  querySelectorAll: (sel) => mockQuerySelectorAll(sel),
  body: new MockElement("body"),
  addEventListener: () => {},
  removeEventListener: () => {},
};
global.alert = () => {};
global.confirm = () => true;
global.prompt = () => "test_var";

// ---------------------------------------------------------
// TESTE 1: domUtils
// ---------------------------------------------------------
console.log("--- 1. Testando domUtils ---");

assert(formatDate(null) === "-", "formatDate com null retorna '-'");
assert(typeof formatDate(Date.now()) === "string" && formatDate(Date.now()).length > 5, "formatDate formata timestamp corretamente");

assert(getStatusBadgeClass("APPROVED") === "status-pill status-green", "APPROVED retorna status-green");
assert(getStatusBadgeClass("GREEN") === "status-pill status-green", "GREEN retorna status-green");
assert(getStatusBadgeClass("PENDING") === "status-pill status-yellow", "PENDING retorna status-yellow");
assert(getStatusBadgeClass("FAILED") === "status-pill status-red", "FAILED retorna status-red");

assert(escapeHtml("<script>alert('xss')</script>") === "&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;", "escapeHtml protege caracteres perigosos");

// ---------------------------------------------------------
// TESTE 2: whatsAppPreviewHelper
// ---------------------------------------------------------
console.log("\n--- 2. Testando whatsAppPreviewHelper ---");

const templateText = "Olá {{1}}, sua fatura no valor de {{2}} vence em {{3}}.";
const interpolatedObj = interpolateVariables(templateText, { "1": "Carlos", "2": "R$ 150,00", "3": "10/10" });
assert(interpolatedObj === "Olá Carlos, sua fatura no valor de R$ 150,00 vence em 10/10.", "Interpolação de variáveis com Objeto");

const interpolatedArr = interpolateVariables(templateText, ["Maria", "R$ 290,00", "15/10"]);
assert(interpolatedArr === "Olá Maria, sua fatura no valor de R$ 290,00 vence em 15/10.", "Interpolação de variáveis com Array");

const mockElements = {
  headerEl: new MockElement("div", "headerEl"),
  bodyEl: new MockElement("div", "bodyEl"),
  footerEl: new MockElement("div", "footerEl"),
  buttonsEl: new MockElement("div", "buttonsEl"),
};

const mockStep = {
  header: "Atendimento",
  body: "Escolha uma opção abaixo:",
  footer: "Equipe Zwei",
  type: "interactive_buttons",
  buttons: [{ title: "Comprar" }, { title: "Suporte" }],
};

renderWhatsAppBubble({
  elements: mockElements,
  data: mockStep,
});

assert(mockElements.headerEl.style.display === "block", "Header exibido no balão");
assert(mockElements.headerEl.textContent === "Atendimento", "Conteúdo do Header correto");
assert(mockElements.bodyEl.textContent === "Escolha uma opção abaixo:", "Corpo da mensagem correto");
assert(mockElements.footerEl.style.display === "block", "Footer exibido no balão");
assert(mockElements.buttonsEl.children.length === 2, "2 botões renderizados no balão");

// ---------------------------------------------------------
// TESTE 3: navigationModule
// ---------------------------------------------------------
console.log("\n--- 3. Testando navigationModule ---");

const navDashboard = new MockElement("div", "nav-dashboard", "nav-item active");
navDashboard.setAttribute("data-tab", "tab-dashboard");
const navTemplates = new MockElement("div", "nav-templates", "nav-item");
navTemplates.setAttribute("data-tab", "tab-templates");

const paneDashboard = new MockElement("section", "tab-dashboard", "tab-pane active");
const paneTemplates = new MockElement("section", "tab-templates", "tab-pane");

const btnQuickSync = new MockElement("button", "btn-quick-sync-templates");
const btnQuickBroadcast = new MockElement("button", "btn-quick-new-broadcast");
const btnQuickConfig = new MockElement("button", "btn-quick-config");

registerMockEl("nav-dashboard", navDashboard);
registerMockEl("nav-templates", navTemplates);
registerMockEl("tab-dashboard", paneDashboard);
registerMockEl("tab-templates", paneTemplates);
registerMockEl("btn-quick-sync-templates", btnQuickSync);
registerMockEl("btn-quick-new-broadcast", btnQuickBroadcast);
registerMockEl("btn-quick-config", btnQuickConfig);

initNavigation();

// Teste de troca de aba
navigateToTab("tab-templates");
assert(navTemplates.classList.contains("active"), "Aba Templates ativada");
assert(!navDashboard.classList.contains("active"), "Aba Dashboard desativada");
assert(paneTemplates.classList.contains("active"), "Painel Templates visível");
assert(!paneDashboard.classList.contains("active"), "Painel Dashboard oculto");

// ---------------------------------------------------------
// TESTE 4: dashboardModule
// ---------------------------------------------------------
console.log("\n--- 4. Testando dashboardModule ---");

const dashConnStatus = new MockElement("div", "dash-conn-status");
const dashPhoneNumber = new MockElement("div", "dash-phone-number");
const dashQualityRating = new MockElement("div", "dash-quality-rating");
const dashLimitTier = new MockElement("div", "dash-limit-tier");
const dashVerifiedName = new MockElement("div", "dash-verified-name");
const btnRefreshHealth = new MockElement("button", "btn-refresh-health");

registerMockEl("dash-conn-status", dashConnStatus);
registerMockEl("dash-phone-number", dashPhoneNumber);
registerMockEl("dash-quality-rating", dashQualityRating);
registerMockEl("dash-limit-tier", dashLimitTier);
registerMockEl("dash-verified-name", dashVerifiedName);
registerMockEl("btn-refresh-health", btnRefreshHealth);

let savedFlowData = null;

const mockApi = {
  getAccountHealth: async () => ({
    success: true,
    data: {
      displayPhoneNumber: "+55 11 98888-7777",
      verifiedName: "Zwei Chat Oficial",
      qualityRating: "GREEN",
      messagingLimitTier: "TIER_10K",
    },
  }),
  getConfig: async () => ({
    phoneNumberId: "123456",
    wabaId: "654321",
    accessToken: "EAAG_TEST",
    appSecret: "secret_123",
    verifyToken: "token_123",
  }),
  saveConfig: async (cfg) => ({ success: true, config: cfg }),
  testConnection: async (cfg) => ({
    success: true,
    data: { verified_name: "Zwei Chat Oficial", quality_rating: "GREEN" },
  }),
  getApprovedTemplates: async () => [
    {
      name: "confirmacao_pedido",
      status: "APPROVED",
      language: "pt_BR",
      category: "UTILITY",
      components: {
        body: { text: "Olá {{1}}, seu pedido {{2}} no valor de {{3}} foi confirmado!" },
        buttons: [{ text: "Rastrear" }],
      },
    },
    {
      name: "lembrete_consulta",
      status: "APPROVED",
      language: "pt_BR",
      category: "UTILITY",
      components: {
        body: { text: "Olá {{1}}, confirmamos sua consulta em {{2}}." },
      },
    },
  ],
  syncTemplates: async () => ({
    success: true,
    count: 2,
    templates: [
      { name: "confirmacao_pedido", status: "APPROVED", language: "pt_BR" },
      { name: "lembrete_consulta", status: "APPROVED", language: "pt_BR" },
    ],
  }),
  getCampaignHistory: async () => [
    {
      campaignId: "camp_001",
      templateName: "confirmacao_pedido",
      total: 50,
      sent: 48,
      failed: 2,
      startedAt: Date.now() - 3600000,
    },
  ],
  startBroadcast: async (params) => ({ success: true, campaignId: "camp_002" }),
  pauseBroadcast: async () => true,
  resumeBroadcast: async () => true,
  stopBroadcast: async () => true,
  exportCampaignCsv: async (id) => ({ success: true, csv: "phone,status\n5511999991111,SENT" }),

  // Flow APIs
  getAllFlows: async () => [
    {
      id: "flow_01",
      name: "Atendimento Inicial",
      isActive: true,
      triggerKeywords: ["oi", "ola", "menu"],
      steps: {
        step_1: {
          id: "step_1",
          type: "interactive_buttons",
          header: "Bem-vindo",
          body: "Selecione uma opção:",
          buttons: [{ id: "b1", title: "Suporte", nextStepId: null }],
        },
      },
    },
  ],
  getFlowById: async (id) => ({
    id: "flow_01",
    name: "Atendimento Inicial",
    isActive: true,
    triggerKeywords: ["oi", "ola"],
    steps: {
      step_1: {
        id: "step_1",
        type: "interactive_buttons",
        header: "Bem-vindo",
        body: "Selecione uma opção:",
        buttons: [{ id: "b1", title: "Suporte", nextStepId: null }],
      },
    },
  }),
  createEmptyFlow: async (name) => ({
    id: "flow_new",
    name: name || "Novo Fluxo",
    isActive: false,
    triggerKeywords: ["inicio"],
    steps: {
      step_1: { id: "step_1", type: "text", body: "Olá!", nextStepId: null },
    },
  }),
  saveFlow: async (flow) => {
    savedFlowData = flow;
    return { success: true, flow };
  },
  duplicateFlow: async (id) => ({ success: true }),
  deleteFlow: async (id) => ({ success: true }),
  setActiveFlow: async (id) => ({ success: true }),
  toggleBot: async (enabled) => ({ success: true, enabled }),
};

const dashboardController = initDashboard(mockApi);
assert(typeof dashboardController.refreshAccountHealth === "function", "initDashboard retorna controller com refreshAccountHealth");

(async () => {
  await refreshAccountHealth(mockApi);

  assert(dashConnStatus.innerHTML.includes("Conectado"), "Status de conexão atualizado para Conectado");
  assert(dashPhoneNumber.textContent.includes("+55 11 98888-7777"), "Telefone atualizado no Dashboard");
  assert(dashVerifiedName.textContent === "Zwei Chat Oficial", "Nome verificado atualizado");
  assert(dashLimitTier.textContent === "TIER_10K", "Limite Tier atualizado");
  assert(dashQualityRating.innerHTML.includes("status-green"), "Quality Rating badge GREEN exibido");

  // ---------------------------------------------------------
  // TESTE 5: settingsModule
  // ---------------------------------------------------------
  console.log("\n--- 5. Testando settingsModule ---");

  const formMetaConfig = new MockElement("form", "form-meta-config");
  const cfgPhoneId = new MockElement("input", "cfg-phone-id");
  const cfgWabaId = new MockElement("input", "cfg-waba-id");
  const cfgAccessToken = new MockElement("input", "cfg-access-token");
  const cfgAppSecret = new MockElement("input", "cfg-app-secret");
  const cfgVerifyToken = new MockElement("input", "cfg-verify-token");
  const btnTestMetaConfig = new MockElement("button", "btn-test-meta-config");

  registerMockEl("form-meta-config", formMetaConfig);
  registerMockEl("cfg-phone-id", cfgPhoneId);
  registerMockEl("cfg-waba-id", cfgWabaId);
  registerMockEl("cfg-access-token", cfgAccessToken);
  registerMockEl("cfg-app-secret", cfgAppSecret);
  registerMockEl("cfg-verify-token", cfgVerifyToken);
  registerMockEl("btn-test-meta-config", btnTestMetaConfig);

  let onConfigSavedCalled = false;
  const settingsController = initSettings(mockApi, {
    onConfigSaved: () => { onConfigSavedCalled = true; },
  });

  assert(typeof settingsController.loadConfigForm === "function", "initSettings retorna controller com loadConfigForm");

  await loadConfigForm(mockApi);
  assert(cfgPhoneId.value === "123456", "Phone ID carregado no form de configurações");
  assert(cfgWabaId.value === "654321", "WABA ID carregado no form de configurações");
  assert(cfgAccessToken.value === "EAAG_TEST", "Access Token carregado no form de configurações");

  // Teste de submit do formulário
  cfgPhoneId.value = "999888";
  await formMetaConfig.dispatchEvent("submit");
  assert(onConfigSavedCalled === true, "Callback onConfigSaved chamado após salvar credenciais");

  // Teste do botão de teste de conexão
  await btnTestMetaConfig.dispatchEvent("click");
  assert(btnTestMetaConfig.disabled === false, "Botão de teste de conexão restaurado após conclusão");

  // ---------------------------------------------------------
  // TESTE 6: templatesModule
  // ---------------------------------------------------------
  console.log("\n--- 6. Testando templatesModule ---");

  const btnSyncTemplates = new MockElement("button", "btn-sync-templates-action");
  const templateSelect = new MockElement("select", "template-select");
  const broadcastTemplateSelect = new MockElement("select", "broadcast-template-select");
  const templateMetaInfo = new MockElement("div", "template-meta-info");
  const tmplBadgeStatus = new MockElement("span", "tmpl-badge-status");
  const tmplBadgeCat = new MockElement("span", "tmpl-badge-cat");
  const tmplBadgeLang = new MockElement("span", "tmpl-badge-lang");
  const templateVariablesInputs = new MockElement("div", "template-variables-inputs");
  const simBubbleHeader = new MockElement("div", "sim-bubble-header");
  const simBubbleBody = new MockElement("div", "sim-bubble-body");
  const simBubbleFooter = new MockElement("div", "sim-bubble-footer");
  const simBubbleButtons = new MockElement("div", "sim-bubble-buttons");

  registerMockEl("btn-sync-templates-action", btnSyncTemplates);
  registerMockEl("template-select", templateSelect);
  registerMockEl("broadcast-template-select", broadcastTemplateSelect);
  registerMockEl("template-meta-info", templateMetaInfo);
  registerMockEl("tmpl-badge-status", tmplBadgeStatus);
  registerMockEl("tmpl-badge-cat", tmplBadgeCat);
  registerMockEl("tmpl-badge-lang", tmplBadgeLang);
  registerMockEl("template-variables-inputs", templateVariablesInputs);
  registerMockEl("sim-bubble-header", simBubbleHeader);
  registerMockEl("sim-bubble-body", simBubbleBody);
  registerMockEl("sim-bubble-footer", simBubbleFooter);
  registerMockEl("sim-bubble-buttons", simBubbleButtons);

  initTemplates(mockApi);

  // Extração de variáveis
  const testTmpl = {
    name: "aviso_pagamento",
    components: { body: { text: "Prezado {{1}}, seu boleto de valor {{2}} vence no dia {{3}}. Obrigado {{1}}!" } },
  };
  const extracted = extractTemplateVariables(testTmpl);
  assert(extracted.length === 3 && extracted[0] === "1" && extracted[1] === "2" && extracted[2] === "3", "3 variáveis únicas extraídas do template na ordem correta");

  // Carregamento de lista
  await loadTemplatesList(mockApi);
  assert(templateSelect.children.length === 2, "2 templates populados no select de templates");
  assert(broadcastTemplateSelect.children.length === 2, "2 templates populados no select do broadcast");

  // Geração de inputs dinâmicos
  generateVariableInputs(testTmpl);
  assert(templateVariablesInputs.children.length === 4, "Título e 3 campos de variáveis gerados no DOM");

  // ---------------------------------------------------------
  // TESTE 7: broadcastModule
  // ---------------------------------------------------------
  console.log("\n--- 7. Testando broadcastModule ---");

  const broadcastRecipientsInput = new MockElement("textarea", "broadcast-recipients-input");
  const btnStartBroadcast = new MockElement("button", "btn-start-broadcast");
  const btnPauseBroadcast = new MockElement("button", "btn-pause-broadcast");
  const btnResumeBroadcast = new MockElement("button", "btn-resume-broadcast");
  const btnStopBroadcast = new MockElement("button", "btn-stop-broadcast");
  const broadcastProgressPanel = new MockElement("div", "broadcast-progress-panel");
  const broadcastProgressBar = new MockElement("div", "broadcast-progress-bar");
  const broadcastPercentLabel = new MockElement("span", "broadcast-percent-label");
  const broadcastStatusLabel = new MockElement("span", "broadcast-status-label");
  const bcTotal = new MockElement("span", "bc-total");
  const bcSent = new MockElement("span", "bc-sent");
  const bcFailed = new MockElement("span", "bc-failed");
  const broadcastHistoryTbody = new MockElement("tbody", "broadcast-history-tbody");

  registerMockEl("broadcast-recipients-input", broadcastRecipientsInput);
  registerMockEl("btn-start-broadcast", btnStartBroadcast);
  registerMockEl("btn-pause-broadcast", btnPauseBroadcast);
  registerMockEl("btn-resume-broadcast", btnResumeBroadcast);
  registerMockEl("btn-stop-broadcast", btnStopBroadcast);
  registerMockEl("broadcast-progress-panel", broadcastProgressPanel);
  registerMockEl("broadcast-progress-bar", broadcastProgressBar);
  registerMockEl("broadcast-percent-label", broadcastPercentLabel);
  registerMockEl("broadcast-status-label", broadcastStatusLabel);
  registerMockEl("bc-total", bcTotal);
  registerMockEl("bc-sent", bcSent);
  registerMockEl("bc-failed", bcFailed);
  registerMockEl("broadcast-history-tbody", broadcastHistoryTbody);

  initBroadcast(mockApi, { getLoadedTemplates });

  // Parser de destinatários
  const rawCsv = `
    5511999991111, Carlos Alberto, R$ 150, 10/10
    5511999992222, Mariana Souza, R$ 250, 15/10

    5511999993333, Roberto Dias, R$ 350, 20/10
  `;
  const parsedRecipients = parseRecipientsInput(rawCsv);
  assert(parsedRecipients.length === 3, "3 contatos válidos parseados ignorando linhas em branco");
  assert(parsedRecipients[0].phone === "5511999991111", "Telefone do contato 1 correto");
  assert(parsedRecipients[0].name === "Carlos Alberto", "Nome do contato 1 correto");
  assert(parsedRecipients[0].variables.length === 3, "3 variáveis extraídas para o contato 1");

  // Carregamento do histórico de campanhas
  await loadBroadcastHistory(mockApi);
  assert(broadcastHistoryTbody.children.length === 1, "1 linha de campanha renderizada na tabela de histórico");

  // ---------------------------------------------------------
  // TESTE 8: flowsModule
  // ---------------------------------------------------------
  console.log("\n--- 8. Testando flowsModule ---");

  const flowsGridContainer = new MockElement("div", "flows-grid-container");
  const flowListView = new MockElement("div", "flow-list-view");
  const flowBuilderView = new MockElement("div", "flow-builder-view");
  const btnCreateNewFlow = new MockElement("button", "btn-create-new-flow");
  const btnBackToFlowsList = new MockElement("button", "btn-back-to-flows-list");
  const builderFlowName = new MockElement("input", "builder-flow-name");
  const builderTriggerKeywords = new MockElement("input", "builder-trigger-keywords");
  const btnSaveCurrentFlow = new MockElement("button", "btn-save-current-flow");
  const builderStepsContainer = new MockElement("div", "builder-steps-container");
  const btnToggleAddStep = new MockElement("button", "btn-toggle-add-step");
  const addStepMenu = new MockElement("div", "add-step-menu");
  const toggleBotSwitch = new MockElement("input", "toggle-bot-switch");
  const builderSimHeader = new MockElement("div", "builder-sim-header");
  const builderSimBody = new MockElement("div", "builder-sim-body");
  const builderSimFooter = new MockElement("div", "builder-sim-footer");
  const builderSimButtons = new MockElement("div", "builder-sim-buttons");
  const simStepBadge = new MockElement("span", "sim-step-badge");

  registerMockEl("flows-grid-container", flowsGridContainer);
  registerMockEl("flow-list-view", flowListView);
  registerMockEl("flow-builder-view", flowBuilderView);
  registerMockEl("btn-create-new-flow", btnCreateNewFlow);
  registerMockEl("btn-back-to-flows-list", btnBackToFlowsList);
  registerMockEl("builder-flow-name", builderFlowName);
  registerMockEl("builder-trigger-keywords", builderTriggerKeywords);
  registerMockEl("btn-save-current-flow", btnSaveCurrentFlow);
  registerMockEl("builder-steps-container", builderStepsContainer);
  registerMockEl("btn-toggle-add-step", btnToggleAddStep);
  registerMockEl("add-step-menu", addStepMenu);
  registerMockEl("toggle-bot-switch", toggleBotSwitch);
  registerMockEl("builder-sim-header", builderSimHeader);
  registerMockEl("builder-sim-body", builderSimBody);
  registerMockEl("builder-sim-footer", builderSimFooter);
  registerMockEl("builder-sim-buttons", builderSimButtons);
  registerMockEl("sim-step-badge", simStepBadge);

  initFlows(mockApi);

  // Listagem de fluxos
  await loadFlowsList(mockApi);
  assert(flowsGridContainer.children.length === 1, "1 card de fluxo renderizado no grid");

  // Abertura do Flow Builder
  const sampleFlow = {
    id: "flow_test",
    name: "Fluxo de Vendas",
    isActive: true,
    triggerKeywords: ["vendas", "preco"],
    steps: {
      step_1: {
        id: "step_1",
        type: "interactive_buttons",
        header: "Vendas Zwei",
        body: "Qual produto deseja?",
        footer: "Selecione:",
        buttons: [{ id: "b1", title: "Plano Premium", nextStepId: null }],
      },
    },
  };

  openFlowBuilder(sampleFlow);
  assert(flowListView.style.display === "none", "Lista de fluxos ocultada ao abrir builder");
  assert(flowBuilderView.style.display === "block", "Builder exibido ao abrir builder");
  assert(builderFlowName.value === "Fluxo de Vendas", "Nome do fluxo carregado no input do builder");
  assert(builderTriggerKeywords.value === "vendas, preco", "Palavras de disparo carregadas no builder");
  assert(builderStepsContainer.children.length === 1, "1 card de passo renderizado no canvas do builder");
  assert(builderSimBody.textContent === "Qual produto deseja?", "Corpo do passo renderizado no simulador ao vivo");

  // Salvamento do Fluxo editado
  builderFlowName.value = "Fluxo de Vendas Atualizado";
  builderTriggerKeywords.value = "vendas, comprar, planos";
  await btnSaveCurrentFlow.dispatchEvent("click");

  assert(savedFlowData !== null, "api.saveFlow disparado com sucesso");
  assert(savedFlowData.name === "Fluxo de Vendas Atualizado", "Nome atualizado salvo no backend");
  assert(savedFlowData.triggerKeywords.includes("comprar"), "Palavras-chave atualizadas salvas");

  // ---------------------------------------------------------
  // TESTE 9: confirmModal (Modais customizados sem travamento do Electron)
  // ---------------------------------------------------------
  console.log("\n--- 9. Testando confirmModal (customConfirm, customAlert, customPrompt) ---");

  assert(typeof customConfirm === "function", "customConfirm é uma função");
  assert(typeof customAlert === "function", "customAlert é uma função");
  assert(typeof customPrompt === "function", "customPrompt é uma função");

  // Teste 9.1: customConfirm (Confirmação)
  const confirmPromise = customConfirm("Deseja prosseguir?", "Atenção", "Sim", "Não");
  const confirmOverlay = document.body.children[document.body.children.length - 1];
  assert(confirmOverlay.classList.contains("modal-overlay"), "Modal overlay criado no DOM");
  const btnConfirmModal = confirmOverlay.querySelector(".confirm-btn-confirm");
  btnConfirmModal.click();
  const confirmedResult = await confirmPromise;
  assert(confirmedResult === true, "customConfirm resolve true ao clicar em Confirmar");

  // Teste 9.2: customAlert com emoji de Warning (como no print do usuário)
  const alertPromise = customAlert("⚠️ Falha ao sincronizar: Token de Acesso da Meta expirou");
  const alertOverlay = document.body.children[document.body.children.length - 1];
  assert(alertOverlay.querySelector("h3").textContent.includes("Atenção"), "customAlert detecta emoji de Warning e formata o título");
  assert(alertOverlay.querySelector("p").textContent.includes("Token de Acesso da Meta expirou"), "customAlert exibe o corpo do aviso");
  const btnAlertOk = alertOverlay.querySelector(".alert-btn-ok");
  btnAlertOk.click();
  await alertPromise;
  assert(true, "customAlert finalizado e resolvido com sucesso");

  // Teste 9.3: customPrompt (Entrada de variável)
  const promptPromise = customPrompt("Nova Variável", "Digite o nome da variável:", "produto");
  const promptOverlay = document.body.children[document.body.children.length - 1];
  const promptInput = promptOverlay.querySelector(".prompt-input");
  assert(promptInput.value === "produto", "customPrompt inicializa com o placeholder/valor correto");
  promptInput.value = "cidade";
  const btnPromptConfirm = promptOverlay.querySelector(".prompt-btn-confirm");
  btnPromptConfirm.click();
  const promptResult = await promptPromise;
  assert(promptResult === "cidade", "customPrompt retorna o valor digitado pelo usuário");

  console.log("\n==================================================");
  console.log(`📊 RESULTADO DOS TESTES: ${passedTests}/${totalTests} testes passaram com sucesso!`);
  console.log("==================================================");

  if (passedTests === totalTests) {
    console.log("🎉 Validação dos módulos e confirmModal concluída com 100% de êxito!\n");
    process.exit(0);
  } else {
    process.exit(1);
  }
})();
