// renderer/guiScripts/index.js

const btnStart = document.getElementById("btn-start");
const btnStop = document.getElementById("btn-stop");
const btnClearLogs = document.getElementById("btn-clear-logs");
const statusText = document.getElementById("status-text");
const statusDot = document.getElementById("status-dot");
const qrImg = document.getElementById("qr-img");
const qrPlaceholder = document.getElementById("qr-placeholder");
const qrLoading = document.getElementById("qr-loading");
const terminalLogs = document.getElementById("terminal-logs");

// Adiciona um log no console visual
function addLog(level, message, timestamp = null) {
  const timeStr = timestamp 
    ? new Date(timestamp).toLocaleTimeString() 
    : new Date().toLocaleTimeString();
    
  const logEntry = document.createElement("div");
  logEntry.className = "log-entry";
  
  const spanTime = document.createElement("span");
  spanTime.className = "log-timestamp";
  spanTime.textContent = `[${timeStr}]`;
  
  const spanLevel = document.createElement("span");
  spanLevel.className = `log-level ${level}`;
  spanLevel.textContent = `[${level.toUpperCase()}]`;
  
  const spanText = document.createElement("span");
  spanText.className = `log-text ${level}`;
  spanText.textContent = message;
  
  logEntry.appendChild(spanTime);
  logEntry.appendChild(spanLevel);
  logEntry.appendChild(spanText);
  
  terminalLogs.appendChild(logEntry);
  
  // Limita a 200 logs
  if (terminalLogs.children.length > 200) {
    terminalLogs.removeChild(terminalLogs.firstChild);
  }
  
  // Rola para o final
  terminalLogs.scrollTop = terminalLogs.scrollHeight;
}

// Atualiza o estado visual da conexão
function updateStatus(state, message = "") {
  let label = "Desconectado";
  if (state === "ready") {
    label = "Conectado";
  } else if (state === "connecting") {
    label = message || "Conectando...";
  } else if (state === "error") {
    label = "Erro";
  }
  
  statusText.innerHTML = `<span id="status-dot" class="status-indicator ${state}"></span> ${label}`;
}

// Inicia o bot
btnStart.addEventListener("click", async () => {
  btnStart.disabled = true;
  qrLoading.classList.add("active");
  qrPlaceholder.style.display = "none";
  qrImg.style.display = "none";
  
  addLog("info", "Iniciando processo do WhatsApp...");
  updateStatus("connecting", "Inicializando...");
  
  try {
    const res = await window.electronAPI.startWhatsApp();
    if (res && !res.success) {
      addLog("error", `Falha: ${res.message}`);
      qrLoading.classList.remove("active");
      qrPlaceholder.style.display = "flex";
      btnStart.disabled = false;
      updateStatus("not_initialized");
    }
  } catch (err) {
    addLog("error", `Erro IPC: ${err.message}`);
    qrLoading.classList.remove("active");
    qrPlaceholder.style.display = "flex";
    btnStart.disabled = false;
    updateStatus("not_initialized");
  }
});

// Para o bot
btnStop.addEventListener("click", async () => {
  btnStop.disabled = true;
  addLog("info", "Parando conexão do WhatsApp...");
  
  try {
    await window.electronAPI.stopWhatsApp();
    addLog("info", "WhatsApp parado com sucesso.");
  } catch (err) {
    addLog("error", `Erro ao parar: ${err.message}`);
  }
  
  resetUI();
});

// Limpa logs
btnClearLogs.addEventListener("click", () => {
  terminalLogs.innerHTML = "";
  addLog("info", "Console de logs limpo.");
});

function resetUI() {
  btnStart.disabled = false;
  btnStop.disabled = true;
  qrLoading.classList.remove("active");
  qrImg.style.display = "none";
  qrPlaceholder.style.display = "flex";
  updateStatus("not_initialized");
}

// Configura eventos vindos do Processo Principal
window.electronAPI.onQRGenerated((data) => {
  qrLoading.classList.remove("active");
  qrPlaceholder.style.display = "none";
  qrImg.src = data.qrImage;
  qrImg.style.display = "block";
  addLog("info", "Novo QR Code gerado. Escaneie para conectar.");
  updateStatus("connecting", "Aguardando QR Code");
});

window.electronAPI.onWhatsAppLoading((data) => {
  qrLoading.classList.add("active");
  qrPlaceholder.style.display = "none";
  qrImg.style.display = "none";
  updateStatus("connecting", `Carregando (${data.percent}%)`);
  addLog("info", `Carregando: ${data.message} (${data.percent}%)`);
});

window.electronAPI.onWhatsAppAuthenticated(() => {
  addLog("success", "Autenticado com sucesso! Carregando dados...");
  updateStatus("connecting", "Autenticado");
});

window.electronAPI.onWhatsAppReady(() => {
  qrLoading.classList.remove("active");
  qrPlaceholder.style.display = "none";
  qrImg.style.display = "none";
  btnStart.disabled = true;
  btnStop.disabled = false;
  
  addLog("success", "WhatsApp está PRONTO e operacional!");
  updateStatus("ready");
});

window.electronAPI.onWhatsAppDisconnected((reason) => {
  addLog("warn", `Conexão fechada: ${reason}`);
  resetUI();
});

window.electronAPI.onError((msg) => {
  addLog("error", `Erro do sistema: ${msg}`);
});

window.electronAPI.onConsoleMessage((data) => {
  // Traduz os níveis de console tradicionais para o terminal de UI
  let level = data.level;
  if (data.message.includes("✅")) level = "success";
  if (data.message.includes("❌")) level = "error";
  if (data.message.includes("⚠️") || data.message.includes("⏳")) level = "warn";
  addLog(level, data.message, data.timestamp);
});

// Verifica status inicial ao carregar a página
async function checkInitialStatus() {
  try {
    const status = await window.electronAPI.getWhatsAppStatus();
    if (status && status.connected) {
      btnStart.disabled = true;
      btnStop.disabled = false;
      qrPlaceholder.style.display = "none";
      updateStatus(status.status);
      addLog("info", "Conectado ao processo do WhatsApp já em execução.");
    }
  } catch (err) {
    console.error("Erro ao obter status inicial:", err);
  }
}

checkInitialStatus();

// ==========================================================================
// CONTROLE DE ABAS E NAVEGAÇÃO DO FLUXO
// ==========================================================================
const tabBtnLogs = document.getElementById("tab-btn-logs");
const tabBtnFlows = document.getElementById("tab-btn-flows");
const tabContentLogs = document.getElementById("tab-content-logs");
const tabContentFlows = document.getElementById("tab-content-flows");
const logsControls = document.getElementById("logs-controls");
const flowsControls = document.getElementById("flows-controls");

const flowListView = document.getElementById("flow-list-view");
const flowBuilderView = document.getElementById("flow-builder-view");
const btnCreateFlow = document.getElementById("btn-create-flow");
const btnBackToList = document.getElementById("btn-back-to-list");
const btnSaveFlow = document.getElementById("btn-save-flow");
const flowsList = document.getElementById("flows-list");
const flowNameInput = document.getElementById("flow-name-input");
const flowStepsContainer = document.getElementById("flow-steps-container");
const btnAddStepTrigger = document.getElementById("btn-add-step-trigger");
const addStepDropdown = document.getElementById("add-step-dropdown");

// Estado em memória do fluxo atualmente editado
let currentFlow = null;

// Alternar Abas
tabBtnLogs.addEventListener("click", () => {
  tabBtnLogs.classList.add("active");
  tabBtnFlows.classList.remove("active");
  tabContentLogs.classList.add("active");
  tabContentFlows.classList.remove("active");
  logsControls.classList.add("active");
  flowsControls.classList.remove("active");
});

tabBtnFlows.addEventListener("click", () => {
  tabBtnFlows.classList.add("active");
  tabBtnLogs.classList.remove("active");
  tabContentFlows.classList.add("active");
  tabContentLogs.classList.remove("active");
  flowsControls.classList.add("active");
  logsControls.classList.remove("active");
  
  // Ao alternar para aba de fluxos, carrega a lista
  loadFlowsList();
});

// Voltar para a Lista de Fluxos
btnBackToList.addEventListener("click", () => {
  flowListView.classList.add("active");
  flowBuilderView.classList.remove("active");
  currentFlow = null;
  loadFlowsList();
});

// Criar Novo Fluxo
btnCreateFlow.addEventListener("click", () => {
  openFlowBuilder(null);
});

// Salvar Fluxo
btnSaveFlow.addEventListener("click", saveCurrentFlow);

// Adicionar Ação (Dropdown)
btnAddStepTrigger.addEventListener("click", (e) => {
  e.stopPropagation();
  addStepDropdown.classList.toggle("hidden");
});

// Esconde o dropdown quando clica fora
document.addEventListener("click", () => {
  addStepDropdown.classList.add("hidden");
});

// Clique nos itens do dropdown
addStepDropdown.querySelectorAll(".dropdown-item").forEach((item) => {
  item.addEventListener("click", () => {
    const type = item.getAttribute("data-type");
    addStep(type);
  });
});

// ==========================================================================
// FUNÇÕES DE OPERAÇÃO DO FLUXO (FRONTEND)
// ==========================================================================

/**
 * Carrega a lista de fluxos do banco e renderiza na tela
 */
async function loadFlowsList() {
  flowsList.innerHTML = `<div class="qr-loading active" style="position:static; background:transparent;"><div class="spinner"></div><p>Carregando fluxos...</p></div>`;
  
  try {
    const flows = await window.electronAPI.getFlows();
    flowsList.innerHTML = "";
    
    if (!flows || flows.length === 0) {
      flowsList.innerHTML = `
        <div class="flow-placeholder-card">
          <div class="placeholder-icon">🤖</div>
          <p>Nenhum fluxo criado. Clique em "Novo Fluxo" para começar!</p>
        </div>
      `;
      return;
    }
    
    flows.forEach((flow) => {
      const card = document.createElement("div");
      card.className = "flow-card";
      
      const trigger = flow.definition.trigger || {};
      const typeLabel = {
        exact: "Mensagem é igual a",
        contains: "Mensagem contém",
        starts_with: "Mensagem começa com",
        all: "Qualquer mensagem"
      }[trigger.type || "exact"] || "Gatilho";
      
      const keywordsText = trigger.type === "all" ? "" : `: "${trigger.keywords.join(", ")}"`;
      
      card.innerHTML = `
        <div class="flow-card-info">
          <span class="flow-card-name">${escapeHTML(flow.name)}</span>
          <span class="flow-card-trigger">⚡ ${typeLabel}${escapeHTML(keywordsText)}</span>
        </div>
        <div class="flow-card-actions">
          <label class="switch">
            <input type="checkbox" class="toggle-status-btn" ${flow.active ? "checked" : ""}>
            <span class="slider round"></span>
          </label>
          <button class="icon-btn edit-btn" title="Editar Fluxo">✏️</button>
          <button class="icon-btn delete delete-btn" title="Excluir Fluxo">🗑️</button>
        </div>
      `;
      
      // Toggle de Ativo/Inativo
      card.querySelector(".toggle-status-btn").addEventListener("change", async (e) => {
        const active = e.target.checked;
        try {
          await window.electronAPI.toggleFlow(flow.id, active);
        } catch (err) {
          alert("Erro ao alternar status do fluxo: " + err.message);
          e.target.checked = !active;
        }
      });
      
      // Editar
      card.querySelector(".edit-btn").addEventListener("click", () => {
        openFlowBuilder(flow);
      });
      
      // Deletar
      card.querySelector(".delete-btn").addEventListener("click", async () => {
        const confirmed = await window.customConfirm(`Tem certeza de que deseja deletar o fluxo "${flow.name}"?`);
        if (confirmed) {
          try {
            await window.electronAPI.deleteFlow(flow.id);
            loadFlowsList();
          } catch (err) {
            alert("Erro ao deletar fluxo: " + err.message);
          }
        }
      });
      
      flowsList.appendChild(card);
    });
  } catch (error) {
    flowsList.innerHTML = `<p style="color:var(--error); text-align:center; padding:20px;">Erro ao carregar fluxos: ${error.message}</p>`;
  }
}

/**
 * Abre o formulário do construtor de blocos
 */
function openFlowBuilder(flow) {
  if (flow) {
    currentFlow = JSON.parse(JSON.stringify(flow)); // Clona objeto
  } else {
    currentFlow = {
      name: "",
      definition: {
        trigger: {
          type: "exact",
          keywords: []
        },
        steps: []
      }
    };
  }
  
  flowNameInput.value = currentFlow.name;
  flowListView.classList.remove("active");
  flowBuilderView.classList.add("active");
  
  renderSteps();
}

/**
 * Desenha os blocos sequencialmente na tela
 */
function renderSteps() {
  flowStepsContainer.innerHTML = "";
  
  // 1. Renderiza o Bloco de Gatilho (Fixo no topo)
  const trigger = currentFlow.definition.trigger || { type: "exact", keywords: [] };
  const triggerCard = document.createElement("div");
  triggerCard.className = "step-card trigger-block";
  triggerCard.innerHTML = `
    <div class="step-card-header">
      <span class="step-card-title">🔑 GATILHO (Disparador do Fluxo)</span>
    </div>
    <div class="step-card-body">
      <label class="step-label">
        Quando receber uma mensagem onde:
        <select class="step-input trigger-type-select">
          <option value="exact" ${trigger.type === "exact" ? "selected" : ""}>O texto é EXATAMENTE igual a...</option>
          <option value="contains" ${trigger.type === "contains" ? "selected" : ""}>O texto CONTÉM a palavra...</option>
          <option value="starts_with" ${trigger.type === "starts_with" ? "selected" : ""}>O texto COMEÇA com...</option>
          <option value="all" ${trigger.type === "all" ? "selected" : ""}>Qualquer mensagem (Mensagem de Entrada / Fallback)</option>
        </select>
        <p class="step-desc">Selecione como a mensagem recebida deve ser comparada com as palavras-chave.</p>
      </label>
      
      <div class="trigger-keywords-wrapper" style="${trigger.type === "all" ? "display:none;" : ""}">
        <label class="step-label">
          Palavras-chave (separe por vírgula):
          <textarea class="step-input trigger-keywords-input" placeholder="Ex: oi, ola, suporte, ajuda">${trigger.keywords ? trigger.keywords.join(", ") : ""}</textarea>
          <p class="step-help-text">Dica: Escreva as palavras de ativação separadas por vírgula (ex: oi, ola, suporte).</p>
        </label>
      </div>
    </div>
  `;
  
  // Event Listeners do Gatilho
  const typeSelect = triggerCard.querySelector(".trigger-type-select");
  const keywordsWrapper = triggerCard.querySelector(".trigger-keywords-wrapper");
  const keywordsInput = triggerCard.querySelector(".trigger-keywords-input");
  
  typeSelect.addEventListener("change", (e) => {
    currentFlow.definition.trigger.type = e.target.value;
    if (e.target.value === "all") {
      keywordsWrapper.style.display = "none";
    } else {
      keywordsWrapper.style.display = "block";
    }
  });
  
  keywordsInput.addEventListener("input", (e) => {
    const list = e.target.value.split(",").map((k) => k.trim()).filter((k) => k.length > 0);
    currentFlow.definition.trigger.keywords = list;
  });
  
  flowStepsContainer.appendChild(triggerCard);
  
  // 2. Renderiza os passos (Ações) subsequentes
  const steps = currentFlow.definition.steps || [];
  steps.forEach((step, index) => {
    const card = document.createElement("div");
    card.className = `step-card ${step.type}-block`;
    
    let bodyHTML = "";
    
    if (step.type === "send_message") {
      bodyHTML = `
        <div class="step-card-header">
          <span class="step-card-title">💬 ENVIAR MENSAGEM (Passo ${index + 1})</span>
          <div class="step-card-actions">
            <button class="control-btn move-up-btn" title="Subir Ação" ${index === 0 ? "disabled" : ""}>⬆️</button>
            <button class="control-btn move-down-btn" title="Descer Ação" ${index === steps.length - 1 ? "disabled" : ""}>⬇️</button>
            <button class="control-btn delete-step-btn" title="Remover Ação">🗑️</button>
          </div>
        </div>
        <div class="step-card-body">
          <label class="step-label">
            Texto da Mensagem:
            <textarea class="step-input message-text-input" placeholder="Digite o conteúdo da mensagem...">${escapeHTML(step.text || "")}</textarea>
            <p class="step-help-text">Dica: Emojis, quebras de linha e textos longos são suportados.</p>
          </label>
          <div class="step-label">
            Simular atraso de digitação antes de enviar:
            <div class="delay-control">
              <input type="range" class="delay-slider message-delay-slider" min="0" max="10" step="1" value="${step.delay || 0}">
              <span class="delay-value message-delay-value">${step.delay || 0}s</span>
            </div>
            <p class="step-help-text">Tempo estimado de simulação antes de disparar a resposta.</p>
          </div>
        </div>
      `;
    } else if (step.type === "options_menu") {
      bodyHTML = `
        <div class="step-card-header">
          <span class="step-card-title">📋 MENU DE OPÇÕES (Passo ${index + 1})</span>
          <div class="step-card-actions">
            <button class="control-btn move-up-btn" title="Subir Ação" ${index === 0 ? "disabled" : ""}>⬆️</button>
            <button class="control-btn move-down-btn" title="Descer Ação" ${index === steps.length - 1 ? "disabled" : ""}>⬇️</button>
            <button class="control-btn delete-step-btn" title="Remover Ação">🗑️</button>
          </div>
        </div>
        <div class="step-card-body">
          <label class="step-label">
            Mensagem de Pergunta / Menu:
            <textarea class="step-input menu-text-input" placeholder="Ex: Escolha uma opção:\n1️⃣ Suporte\n2️⃣ Vendas">${escapeHTML(step.text || "")}</textarea>
            <p class="step-help-text">Escreva a mensagem com a pergunta e as opções listadas (ex: 1. Suporte \\n 2. Vendas).</p>
          </label>
          
          <div class="step-label">
            Simular Atraso:
            <div class="delay-control">
              <input type="range" class="delay-slider menu-delay-slider" min="0" max="10" step="1" value="${step.delay || 0}">
              <span class="delay-value menu-delay-value">${step.delay || 0}s</span>
            </div>
          </div>
          
          <div class="options-builder-container">
            <span class="step-label" style="margin-bottom:4px;">Opções de Resposta:</span>
            <p class="step-help-text" style="margin-bottom:12px;">Cadastre as opções que o cliente poderá digitar (ex: Keyword: 1, Resposta: Mensagem enviada). Separe com vírgula para cadastrar sinônimos (ex: 1, suporte, ajuda).</p>
            <div class="options-builder-list">
              <!-- Renderização das opções do menu -->
            </div>
            <button class="btn-add-option">+ Adicionar Opção</button>
          </div>
          
          <label class="step-label">
            Mensagem de Resposta Inválida (Fallback):
            <textarea class="step-input menu-fallback-input" placeholder="Mensagem enviada caso o contato digite algo fora do menu...">${escapeHTML(step.fallback || "")}</textarea>
            <p class="step-help-text">Esta mensagem será enviada se o contato responder com algo diferente das keywords cadastradas acima. A sessão permanecerá ativa aguardando uma opção correta.</p>
          </label>
        </div>
      `;
    }
    
    card.innerHTML = bodyHTML;
    
    // Configura botões de controle de reordenamento / exclusão de passos
    card.querySelector(".delete-step-btn").addEventListener("click", async () => {
      const confirmed = await window.customConfirm("Tem certeza de que deseja remover esta ação do fluxo?");
      if (confirmed) {
        removeStep(index);
      }
    });
    
    const moveUp = card.querySelector(".move-up-btn");
    const moveDown = card.querySelector(".move-down-btn");
    
    if (moveUp) moveUp.addEventListener("click", () => moveStep(index, -1));
    if (moveDown) moveDown.addEventListener("click", () => moveStep(index, 1));
    
    // Sincroniza inputs em tempo real com o estado local
    if (step.type === "send_message") {
      const textInput = card.querySelector(".message-text-input");
      const delaySlider = card.querySelector(".message-delay-slider");
      const delayVal = card.querySelector(".message-delay-value");
      
      textInput.addEventListener("input", (e) => {
        currentFlow.definition.steps[index].text = e.target.value;
      });
      
      delaySlider.addEventListener("input", (e) => {
        const val = parseInt(e.target.value, 10);
        currentFlow.definition.steps[index].delay = val;
        delayVal.textContent = val + "s";
      });
    } else if (step.type === "options_menu") {
      const textInput = card.querySelector(".menu-text-input");
      const delaySlider = card.querySelector(".menu-delay-slider");
      const delayVal = card.querySelector(".menu-delay-value");
      const fallbackInput = card.querySelector(".menu-fallback-input");
      const optionsListContainer = card.querySelector(".options-builder-list");
      const btnAddOption = card.querySelector(".btn-add-option");
      
      textInput.addEventListener("input", (e) => {
        currentFlow.definition.steps[index].text = e.target.value;
      });
      
      fallbackInput.addEventListener("input", (e) => {
        currentFlow.definition.steps[index].fallback = e.target.value;
      });
      
      delaySlider.addEventListener("input", (e) => {
        const val = parseInt(e.target.value, 10);
        currentFlow.definition.steps[index].delay = val;
        delayVal.textContent = val + "s";
      });
      
      // Renderiza as opções daquele menu interativo
      const renderMenuOptions = () => {
        optionsListContainer.innerHTML = "";
        const menuOpts = currentFlow.definition.steps[index].options || [];
        
        menuOpts.forEach((opt, optIndex) => {
          const optRow = document.createElement("div");
          optRow.className = "option-builder-row";
          optRow.innerHTML = `
            <input type="text" class="step-input opt-keyword" placeholder="Ex: 1" value="${escapeHTML(opt.keyword || "")}">
            <textarea class="step-input opt-reply" placeholder="Texto enviado ao escolher..." rows="1">${escapeHTML(opt.reply || "")}</textarea>
            <button class="btn-remove-option" title="Remover Opção">❌</button>
          `;
          
          // Sincroniza campos de opção
          optRow.querySelector(".opt-keyword").addEventListener("input", (e) => {
            currentFlow.definition.steps[index].options[optIndex].keyword = e.target.value;
          });
          
          optRow.querySelector(".opt-reply").addEventListener("input", (e) => {
            currentFlow.definition.steps[index].options[optIndex].reply = e.target.value;
          });
          
          optRow.querySelector(".btn-remove-option").addEventListener("click", () => {
            currentFlow.definition.steps[index].options.splice(optIndex, 1);
            renderMenuOptions();
          });
          
          optionsListContainer.appendChild(optRow);
        });
      };
      
      // Clique em Adicionar Opção
      btnAddOption.addEventListener("click", () => {
        if (!currentFlow.definition.steps[index].options) {
          currentFlow.definition.steps[index].options = [];
        }
        currentFlow.definition.steps[index].options.push({ keyword: "", reply: "" });
        renderMenuOptions();
      });
      
      renderMenuOptions();
    }
    
    flowStepsContainer.appendChild(card);
  });

  // Se não houver ações/passos adicionados além do Gatilho, renderiza um placeholder intuitivo
  if (steps.length === 0) {
    const emptyPlaceholder = document.createElement("div");
    emptyPlaceholder.className = "empty-steps-placeholder";
    emptyPlaceholder.innerHTML = `
      <span class="placeholder-emoji">👇</span>
      <p>Nenhuma ação adicionada ainda. Clique no botão de adicionar abaixo para criar respostas simples ou menus de opções para este fluxo!</p>
    `;
    flowStepsContainer.appendChild(emptyPlaceholder);
  }
}

/**
 * Adiciona um novo passo de ação no final do fluxo
 */
function addStep(type) {
  const steps = currentFlow.definition.steps || [];
  
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
  
  renderSteps();
  
  // Faz scroll automático até o novo bloco adicionado
  setTimeout(() => {
    const workspace = document.querySelector(".builder-workspace");
    workspace.scrollTop = workspace.scrollHeight;
  }, 100);
}

/**
 * Reordena passos do fluxo
 */
function moveStep(index, direction) {
  const steps = currentFlow.definition.steps || [];
  const targetIndex = index + direction;
  
  if (targetIndex >= 0 && targetIndex < steps.length) {
    const temp = steps[index];
    steps[index] = steps[targetIndex];
    steps[targetIndex] = temp;
    renderSteps();
  }
}

/**
 * Remove um passo do fluxo
 */
function removeStep(index) {
  currentFlow.definition.steps.splice(index, 1);
  renderSteps();
}

/**
 * Valida dados e salva no banco via IPC
 */
async function saveCurrentFlow() {
  const name = flowNameInput.value.trim();
  if (!name) {
    alert("Por favor, digite um nome para o fluxo.");
    flowNameInput.focus();
    return;
  }
  
  currentFlow.name = name;
  
  const trigger = currentFlow.definition.trigger || {};
  if (trigger.type !== "all" && (!trigger.keywords || trigger.keywords.length === 0)) {
    alert("Por favor, digite pelo menos uma palavra-chave para o gatilho, ou defina como 'Qualquer mensagem'.");
    return;
  }
  
  try {
    btnSaveFlow.disabled = true;
    btnSaveFlow.textContent = "Salvando...";
    
    await window.electronAPI.saveFlow(currentFlow);
    
    // Volta para a lista de fluxos
    flowListView.classList.add("active");
    flowBuilderView.classList.remove("active");
    currentFlow = null;
    loadFlowsList();
  } catch (err) {
    alert("Erro ao salvar fluxo no banco de dados: " + err.message);
  } finally {
    btnSaveFlow.disabled = false;
    btnSaveFlow.innerHTML = `<span>💾</span> Salvar Fluxo`;
  }
}

/**
 * Escapa strings contra injeção de HTML na renderização
 */
function escapeHTML(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

