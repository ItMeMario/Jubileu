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
const btnClearAllInstances = document.getElementById("btn-clear-all-instances");
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

// Clique no botão de limpar todas as instâncias
btnClearAllInstances.addEventListener("click", async () => {
  if (instances.length === 0) {
    alert("Não há instâncias para limpar.");
    return;
  }

  const confirmed = await window.customConfirm(
    "Tem certeza de que deseja remover TODAS as instâncias do Zwei Chat?\nEsta ação é irreversível e excluirá permanentemente todos os dados de sessão de todas as instâncias.",
    "Limpar Todas as Instâncias",
    "Remover Todas",
    "Cancelar",
    "btn-danger"
  );

  if (confirmed) {
    btnClearAllInstances.disabled = true;
    btnAddInstance.disabled = true;
    
    try {
      addLog("info", "Iniciando remoção de todas as instâncias...");
      
      // Armazena cópia local para evitar mutação do array durante iteração se houver falhas
      const listToRemove = [...instances];
      for (const inst of listToRemove) {
        try {
          addLog("info", `Removendo instância "${inst.name}"...`);
          await window.electronAPI.deleteInstance(inst.id);
          delete instanceStatuses[inst.id];
          instances = instances.filter((i) => i.id !== inst.id);
        } catch (err) {
          console.error(`Erro ao remover instância ${inst.id}:`, err);
          addLog("error", `Falha ao remover "${inst.name}": ${err.message}`);
        }
      }
      
      if (instances.length === 0) {
        selectedInstanceId = null;
        addLog("success", "Todas as instâncias foram removidas.");
      } else {
        selectedInstanceId = instances[0].id;
        addLog("warn", "Algumas instâncias não puderam ser removidas.");
      }
      
      renderInstances();
      refreshSelectedInstanceUI();
    } catch (err) {
      alert("Erro ao limpar instâncias: " + err.message);
    } finally {
      btnClearAllInstances.disabled = false;
      btnAddInstance.disabled = false;
    }
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

const tabBtnDeejay = document.getElementById("tab-btn-deejay");
const tabContentDeejay = document.getElementById("tab-content-deejay");

let flowsHtmlLoaded = false;
let deejayHtmlLoaded = false;

// Alternar Abas
tabBtnLogs.addEventListener("click", () => {
  tabBtnLogs.classList.add("active");
  tabBtnFlows.classList.remove("active");
  tabBtnDeejay.classList.remove("active");
  
  tabContentLogs.classList.add("active");
  tabContentFlows.classList.remove("active");
  tabContentDeejay.classList.remove("active");
  
  logsControls.classList.add("active");
  flowsControls.classList.remove("active");
});

tabBtnFlows.addEventListener("click", async () => {
  tabBtnFlows.classList.add("active");
  tabBtnLogs.classList.remove("active");
  tabBtnDeejay.classList.remove("active");
  
  tabContentFlows.classList.add("active");
  tabContentLogs.classList.remove("active");
  tabContentDeejay.classList.remove("active");
  
  flowsControls.classList.add("active");
  logsControls.classList.remove("active");
  
  try {
    if (!flowsHtmlLoaded) {
      // Carrega o layout de flows.html dinamicamente
      const response = await fetch("flows.html");
      const htmlText = await response.text();
      tabContentFlows.innerHTML = htmlText;
      flowsHtmlLoaded = true;
    }
    
    // Inicializa a lógica do Editor de Fluxos exposta por flows.js
    if (typeof window.initFlows === "function") {
      await window.initFlows();
    } else {
      console.error("window.initFlows não encontrada. O script flows.js foi carregado?");
    }
  } catch (err) {
    console.error("Erro ao carregar aba Editor de Fluxos dinamicamente:", err);
    tabContentFlows.innerHTML = `<div class="dj-placeholder" style="color:var(--error);">❌ Erro ao carregar aba Editor de Fluxos: ${err.message}</div>`;
  }
});

tabBtnDeejay.addEventListener("click", async () => {
  tabBtnDeejay.classList.add("active");
  tabBtnLogs.classList.remove("active");
  tabBtnFlows.classList.remove("active");
  
  tabContentDeejay.classList.add("active");
  tabContentLogs.classList.remove("active");
  tabContentFlows.classList.remove("active");
  
  flowsControls.classList.remove("active");
  logsControls.classList.remove("active");
  
  try {
    if (!deejayHtmlLoaded) {
      // Carrega o layout de deejay.html dinamicamente
      const response = await fetch("deejay.html");
      const htmlText = await response.text();
      tabContentDeejay.innerHTML = htmlText;
      deejayHtmlLoaded = true;
    }
    
    // Inicializa a lógica do Dee Jay exposta por deejay.js
    if (typeof window.initDeeJay === "function") {
      await window.initDeeJay();
    } else {
      console.error("window.initDeeJay não encontrada. O script deejay.js foi carregado?");
    }
  } catch (err) {
    console.error("Erro ao carregar aba Dee Jay dinamicamente:", err);
    tabContentDeejay.innerHTML = `<div class="dj-placeholder" style="color:var(--error);">❌ Erro ao carregar aba Dee Jay: ${err.message}</div>`;
  }
});

// Escapa strings contra injeção de HTML na renderização
function escapeHTML(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

