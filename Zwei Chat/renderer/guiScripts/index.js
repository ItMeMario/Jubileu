// renderer/guiScripts/index.js

// renderer/guiScripts/index.js

const btnStart = document.getElementById("btn-start");
const btnStop = document.getElementById("btn-stop");
const btnClearLogs = document.getElementById("btn-clear-logs");
const statusText = document.getElementById("status-text");
const qrImg = document.getElementById("qr-img");
const qrPlaceholder = document.getElementById("qr-placeholder");
const qrLoading = document.getElementById("qr-loading");
const terminalLogs = document.getElementById("terminal-logs");

// Novos seletores para instâncias
const btnAddInstance = document.getElementById("btn-add-instance");
const instancesList = document.getElementById("instances-list");

// Estado em memória
let instances = [];
let selectedInstanceId = null;
const instanceStatuses = {}; // instanceId => { status: "not_initialized" | "connecting" | "ready" | "error", label: string, qrImage: string, loadingPercent: number, loadingMessage: string }

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

// Atualiza a UI com base no status da instância selecionada
function refreshSelectedInstanceUI() {
  if (!selectedInstanceId) {
    btnStart.disabled = true;
    btnStop.disabled = true;
    qrLoading.classList.remove("active");
    qrImg.style.display = "none";
    qrPlaceholder.style.display = "flex";
    qrPlaceholder.innerHTML = `
      <div class="qr-placeholder-icon">📱</div>
      <p>Crie ou selecione uma instância de WhatsApp na barra lateral.</p>
    `;
    statusText.innerHTML = `<span id="status-dot" class="status-indicator not_initialized"></span> Sem Instância`;
    return;
  }

  const status = instanceStatuses[selectedInstanceId] || { status: "not_initialized", label: "Desconectado" };
  
  // Atualiza botões de controle
  if (status.status === "ready") {
    btnStart.disabled = true;
    btnStop.disabled = false;
  } else if (status.status === "connecting") {
    btnStart.disabled = true;
    btnStop.disabled = false; // permite parar/cancelar a conexão
  } else {
    btnStart.disabled = false;
    btnStop.disabled = true;
  }

  // Atualiza QR Code ou Tela de Carregamento
  if (status.status === "connecting") {
    if (status.loadingPercent !== undefined) {
      qrLoading.classList.add("active");
      qrLoading.querySelector("p").textContent = `${status.loadingMessage || "Carregando WhatsApp Web..."} (${status.loadingPercent}%)`;
      qrPlaceholder.style.display = "none";
      qrImg.style.display = "none";
    } else if (status.qrImage) {
      qrLoading.classList.remove("active");
      qrPlaceholder.style.display = "none";
      qrImg.src = status.qrImage;
      qrImg.style.display = "block";
    } else {
      qrLoading.classList.add("active");
      qrLoading.querySelector("p").textContent = status.label || "Inicializando...";
      qrPlaceholder.style.display = "none";
      qrImg.style.display = "none";
    }
  } else if (status.status === "ready") {
    qrLoading.classList.remove("active");
    qrPlaceholder.style.display = "none";
    qrImg.style.display = "none";
  } else {
    qrLoading.classList.remove("active");
    qrImg.style.display = "none";
    qrPlaceholder.style.display = "flex";
    qrPlaceholder.innerHTML = `
      <div class="qr-placeholder-icon">📱</div>
      <p>Clique em <strong>Iniciar</strong> para gerar o QR Code de conexão.</p>
    `;
  }

  // Atualiza texto e bolinha de status
  let dotClass = status.status;
  let label = status.label || "Desconectado";
  if (status.status === "not_initialized") {
    dotClass = "not_initialized";
    label = "Desconectado";
  }
  statusText.innerHTML = `<span id="status-dot" class="status-indicator ${dotClass}"></span> ${label}`;
}

// Renderiza a lista de instâncias na sidebar
function renderInstances() {
  instancesList.innerHTML = "";

  if (instances.length === 0) {
    instancesList.innerHTML = `<div class="instances-placeholder">Nenhuma instância cadastrada</div>`;
    selectedInstanceId = null;
    refreshSelectedInstanceUI();
    return;
  }

  instances.forEach((inst) => {
    const status = instanceStatuses[inst.id] || { status: "not_initialized" };
    let dotClass = status.status;
    if (status.status === "not_initialized") dotClass = "not_initialized";

    const item = document.createElement("div");
    item.className = `instance-item ${inst.id === selectedInstanceId ? "active" : ""}`;
    item.innerHTML = `
      <div class="instance-item-info">
        <span class="status-indicator ${dotClass}" style="width: 8px; height: 8px; flex-shrink:0;"></span>
        <span class="instance-item-name" title="${escapeHTML(inst.name)}">${escapeHTML(inst.name)}</span>
      </div>
      <div class="instance-item-actions">
        <button class="instance-action-btn rename" title="Renomear">✏️</button>
        <button class="instance-action-btn delete" title="Remover">🗑️</button>
      </div>
    `;

    // Selecionar instância ao clicar
    item.addEventListener("click", (e) => {
      if (e.target.closest(".instance-action-btn")) return;
      selectedInstanceId = inst.id;
      renderInstances();
      refreshSelectedInstanceUI();
    });

    // Ação de renomear
    item.querySelector(".rename").addEventListener("click", async (e) => {
      e.stopPropagation();
      const newName = await window.customPrompt("Renomear Instância", "Digite o novo nome para a instância:", inst.name);
      if (newName !== null && newName.trim() && newName.trim() !== inst.name) {
        try {
          await window.electronAPI.renameInstance(inst.id, newName.trim());
          inst.name = newName.trim();
          renderInstances();
        } catch (err) {
          alert("Erro ao renomear: " + err.message);
        }
      }
    });

    // Ação de deletar
    item.querySelector(".delete").addEventListener("click", async (e) => {
      e.stopPropagation();
      const confirmed = await window.customConfirm(
        `Tem certeza de que deseja remover a instância "${inst.name}"?\nTodos os dados da sessão serão excluídos de forma permanente.`,
        "Remover Instância",
        "Remover",
        "Cancelar",
        "btn-danger"
      );
      if (confirmed) {
        try {
          item.style.opacity = "0.5";
          item.style.pointerEvents = "none";
          
          await window.electronAPI.deleteInstance(inst.id);
          delete instanceStatuses[inst.id];
          
          instances = instances.filter((i) => i.id !== inst.id);
          
          if (selectedInstanceId === inst.id) {
            selectedInstanceId = instances.length > 0 ? instances[0].id : null;
          }
          
          renderInstances();
          refreshSelectedInstanceUI();
        } catch (err) {
          alert("Erro ao remover instância: " + err.message);
          renderInstances();
        }
      }
    });

    instancesList.appendChild(item);
  });
}

// Inicia o bot para a instância selecionada
btnStart.addEventListener("click", async () => {
  if (!selectedInstanceId) return;

  btnStart.disabled = true;
  instanceStatuses[selectedInstanceId] = {
    status: "connecting",
    label: "Inicializando...",
  };
  refreshSelectedInstanceUI();
  renderInstances();
  
  addLog("info", "Iniciando processo do WhatsApp para a instância atual...");
  
  try {
    const res = await window.electronAPI.startWhatsApp(selectedInstanceId);
    if (res && !res.success) {
      addLog("error", `Falha ao iniciar: ${res.message}`);
      instanceStatuses[selectedInstanceId] = {
        status: "not_initialized",
        label: "Desconectado",
      };
      refreshSelectedInstanceUI();
      renderInstances();
    }
  } catch (err) {
    addLog("error", `Erro IPC: ${err.message}`);
    instanceStatuses[selectedInstanceId] = {
      status: "not_initialized",
      label: "Desconectado",
    };
    refreshSelectedInstanceUI();
    renderInstances();
  }
});

// Para o bot para a instância selecionada
btnStop.addEventListener("click", async () => {
  if (!selectedInstanceId) return;

  btnStop.disabled = true;
  addLog("info", "Parando conexão do WhatsApp para a instância atual...");
  
  try {
    await window.electronAPI.stopWhatsApp(selectedInstanceId);
    addLog("info", "WhatsApp parado com sucesso.");
  } catch (err) {
    addLog("error", `Erro ao parar: ${err.message}`);
  }
  
  instanceStatuses[selectedInstanceId] = {
    status: "not_initialized",
    label: "Desconectado",
  };
  refreshSelectedInstanceUI();
  renderInstances();
});

// Clique no botão de adicionar nova instância
btnAddInstance.addEventListener("click", async () => {
  // Se exceder 5 instâncias, exibe o pop-up de aviso sobre instabilidade
  if (instances.length >= 5) {
    const proceed = await window.customConfirm(
      "Atenção: Executar 6 ou mais instâncias de WhatsApp simultaneamente pode causar instabilidade de sistema e alto uso de CPU/RAM, dependendo das especificações do computador.\n\nDeseja continuar mesmo assim?",
      "Alerta de Instabilidade",
      "Continuar",
      "Cancelar",
      "btn-primary"
    );
    if (!proceed) {
      return; // Cancela
    }
  }

  const name = await window.customPrompt("Nova Instância", "Digite um nome para a nova instância do WhatsApp (ex: Suporte, Vendas):");
  if (name === null) return; // Cancelou
  
  const finalName = name.trim() || `WhatsApp ${instances.length + 1}`;
  
  try {
    const newInst = await window.electronAPI.createInstance(finalName);
    instances.push(newInst);
    instanceStatuses[newInst.id] = { status: "not_initialized", label: "Desconectado" };
    selectedInstanceId = newInst.id;
    
    renderInstances();
    refreshSelectedInstanceUI();
  } catch (err) {
    alert("Erro ao criar nova instância: " + err.message);
  }
});

// Limpa logs do terminal
btnClearLogs.addEventListener("click", () => {
  terminalLogs.innerHTML = "";
  addLog("info", "Console de logs limpo.");
});

// Configura eventos vindos do Processo Principal
window.electronAPI.onQRGenerated((data) => {
  const { instanceId, qrImage } = data;
  if (!instanceStatuses[instanceId]) {
    instanceStatuses[instanceId] = {};
  }
  instanceStatuses[instanceId].status = "connecting";
  instanceStatuses[instanceId].label = "Aguardando QR Code";
  instanceStatuses[instanceId].qrImage = qrImage;
  instanceStatuses[instanceId].loadingPercent = undefined;

  if (instanceId === selectedInstanceId) {
    refreshSelectedInstanceUI();
  }
  renderInstances();
});

window.electronAPI.onWhatsAppLoading((data) => {
  const { instanceId, percent, message } = data;
  if (!instanceStatuses[instanceId]) {
    instanceStatuses[instanceId] = {};
  }
  instanceStatuses[instanceId].status = "connecting";
  instanceStatuses[instanceId].label = `Carregando (${percent}%)`;
  instanceStatuses[instanceId].loadingPercent = percent;
  instanceStatuses[instanceId].loadingMessage = message;
  instanceStatuses[instanceId].qrImage = null;

  if (instanceId === selectedInstanceId) {
    refreshSelectedInstanceUI();
  }
  renderInstances();
});

window.electronAPI.onWhatsAppAuthenticated((data) => {
  const { instanceId } = data;
  if (!instanceStatuses[instanceId]) {
    instanceStatuses[instanceId] = {};
  }
  instanceStatuses[instanceId].status = "connecting";
  instanceStatuses[instanceId].label = "Autenticado";
  instanceStatuses[instanceId].loadingPercent = undefined;
  instanceStatuses[instanceId].qrImage = null;

  if (instanceId === selectedInstanceId) {
    refreshSelectedInstanceUI();
  }
  renderInstances();
});

window.electronAPI.onWhatsAppReady((data) => {
  const { instanceId } = data;
  if (!instanceStatuses[instanceId]) {
    instanceStatuses[instanceId] = {};
  }
  instanceStatuses[instanceId].status = "ready";
  instanceStatuses[instanceId].label = "Conectado";
  instanceStatuses[instanceId].loadingPercent = undefined;
  instanceStatuses[instanceId].qrImage = null;

  if (instanceId === selectedInstanceId) {
    refreshSelectedInstanceUI();
  }
  renderInstances();
});

window.electronAPI.onWhatsAppDisconnected((data) => {
  const { instanceId, reason } = data;
  if (!instanceStatuses[instanceId]) {
    instanceStatuses[instanceId] = {};
  }
  instanceStatuses[instanceId].status = "not_initialized";
  instanceStatuses[instanceId].label = "Desconectado";
  instanceStatuses[instanceId].loadingPercent = undefined;
  instanceStatuses[instanceId].qrImage = null;

  if (instanceId === selectedInstanceId) {
    refreshSelectedInstanceUI();
  }
  renderInstances();
});

window.electronAPI.onError((data) => {
  const { instanceId, message } = data;
  addLog("error", `Erro no sistema [Instância: ${instanceId}]: ${message}`);
});

window.electronAPI.onConsoleMessage((data) => {
  let level = data.level;
  if (data.message.includes("✅")) level = "success";
  if (data.message.includes("❌")) level = "error";
  if (data.message.includes("⚠️") || data.message.includes("⏳")) level = "warn";
  addLog(level, data.message, data.timestamp);
});

// Inicialização de instâncias ao carregar a página
async function initializeInstances() {
  try {
    instances = await window.electronAPI.getInstances();
    
    // Consulta status de cada uma em paralelo
    const statusPromises = instances.map(async (inst) => {
      try {
        const statusRes = await window.electronAPI.getWhatsAppStatus(inst.id);
        instanceStatuses[inst.id] = {
          status: statusRes.status,
          label: statusRes.status === "ready" ? "Conectado" : (statusRes.status === "connecting" ? "Conectando..." : "Desconectado")
        };
      } catch (e) {
        instanceStatuses[inst.id] = { status: "not_initialized", label: "Desconectado" };
      }
    });
    
    await Promise.all(statusPromises);

    if (instances.length > 0) {
      selectedInstanceId = instances[0].id;
    }
    
    renderInstances();
    refreshSelectedInstanceUI();
  } catch (err) {
    console.error("Erro ao obter lista de instâncias inicial:", err);
  }
}

initializeInstances();

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

