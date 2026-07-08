// renderer/guiScripts/deejay.js
console.log("deejay.js loaded");

// Estado em memória do Dee Jay
let djInstances = [];
let djMessages = [];
let djLoopActive = false;
const djInstanceStatuses = {}; // instanceId => { status, qrCode }
let djInitialized = false;

// DOM Elements
let djBtnStartLoop, djBtnStopLoop, djMinInterval, djMaxInterval, djChkLinkBot, djChkLinkDrone, djBtnSaveConfig;
let djBtnAddInstance, djInstancesList, djBtnClearAll;
let djMsgInput, djBtnAddMsg, djMessagesList;
let djLogsContainer, djBtnClearLogs;

// Função para escapar strings contra injeção de HTML
function escapeHTML(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Inicializa a aba Dee Jay
window.initDeeJay = async function() {
  if (djInitialized) {
    // Se já inicializou os listeners e elementos, apenas atualiza os dados do banco
    await loadDeeJayData();
    return;
  }

  console.log("Dee Jay: Inicializando elementos de interface e ouvintes...");

  // Mapeia os elementos do DOM
  djBtnStartLoop = document.getElementById("dj-btn-start-loop");
  djBtnStopLoop = document.getElementById("dj-btn-stop-loop");
  djMinInterval = document.getElementById("dj-min-interval");
  djMaxInterval = document.getElementById("dj-max-interval");
  djChkLinkBot = document.getElementById("dj-chk-link-bot");
  djChkLinkDrone = document.getElementById("dj-chk-link-drone");
  djBtnSaveConfig = document.getElementById("dj-btn-save-config");

  djBtnAddInstance = document.getElementById("dj-btn-add-instance");
  djBtnClearAll = document.getElementById("dj-btn-clear-all");
  djInstancesList = document.getElementById("dj-instances-list");

  djMsgInput = document.getElementById("dj-msg-input");
  djBtnAddMsg = document.getElementById("dj-btn-add-msg");
  djMessagesList = document.getElementById("dj-messages-list");

  djLogsContainer = document.getElementById("dj-logs-container");
  djBtnClearLogs = document.getElementById("dj-btn-clear-logs");

  // Configura Listeners de Interface
  setupUIEventListeners();

  // Configura Listeners IPC vindos do main
  setupIPCListeners();

  // Carrega os dados iniciais do banco
  await loadDeeJayData();

  djInitialized = true;
  console.log("Dee Jay: Inicializado com sucesso!");
};

async function loadDeeJayData() {
  await loadDeeJayConfig();
  await loadDeeJayInstances();
  await loadDeeJayMessages();
}

async function loadDeeJayConfig() {
  try {
    const config = await window.deeJayAPI.getConfig();
    if (config) {
      djMinInterval.value = config.minIntervalMinutes || 1;
      djMaxInterval.value = config.maxIntervalMinutes || 5;
      djChkLinkBot.checked = !!config.linkBotPrincipal;
      djChkLinkDrone.checked = !!config.linkDrone;
      djLoopActive = !!config.active;
      updateDjLoopButtons();
    }
  } catch (err) {
    console.error("Erro ao carregar configurações do Dee Jay:", err);
  }
}

async function loadDeeJayInstances() {
  try {
    djInstances = await window.deeJayAPI.getInstances();
    
    djInstances.forEach(inst => {
      djInstanceStatuses[inst.instanceId] = {
        status: inst.status,
        qrCode: inst.qrCode
      };
    });
    
    renderDeeJayInstances();
    updateDjLoopButtons();
  } catch (err) {
    console.error("Erro ao carregar instâncias do Dee Jay:", err);
  }
}

async function loadDeeJayMessages() {
  try {
    djMessages = await window.deeJayAPI.getMessages();
    renderDeeJayMessages();
  } catch (err) {
    console.error("Erro ao carregar mensagens do Dee Jay:", err);
  }
}

function renderDeeJayInstances() {
  if (!djInstancesList) return;
  djInstancesList.innerHTML = "";
  
  if (djInstances.length === 0) {
    djInstancesList.innerHTML = `<div class="dj-placeholder">Nenhuma instância cadastrada</div>`;
    return;
  }
  
  djInstances.forEach(inst => {
    const statusData = djInstanceStatuses[inst.instanceId] || { status: "disconnected" };
    const card = document.createElement("div");
    card.className = "dj-card";
    card.id = `dj-card-${inst.instanceId}`;
    
    let badgeLabel = "Desconectado";
    let badgeClass = "disconnected";
    if (statusData.status === "connected") {
      badgeLabel = "Conectado";
      badgeClass = "connected";
    } else if (statusData.status === "connecting" || statusData.status === "authenticated") {
      badgeLabel = "Conectando...";
      badgeClass = "connecting";
    } else if (statusData.status === "qr_pending") {
      badgeLabel = "Lendo QR";
      badgeClass = "qr_pending";
    }
    
    card.innerHTML = `
      <div class="dj-card-header">
        <span class="dj-card-name" title="${escapeHTML(inst.name)}">${escapeHTML(inst.name)}</span>
        <span class="dj-card-badge ${badgeClass}">${badgeLabel}</span>
      </div>
      <div class="dj-card-body">
        <div class="dj-card-qr-container" style="display: ${statusData.status === "qr_pending" && statusData.qrCode ? "flex" : "none"}">
          <img class="dj-card-qr-img" src="${statusData.qrCode ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(statusData.qrCode)}` : ''}" alt="QR Code">
          <span class="dj-card-info" style="margin-top: 4px; font-size: 10px;">Escaneie o QR Code</span>
        </div>
        <div class="dj-card-status-info" style="display: ${statusData.status === "connected" ? "block" : "none"}; text-align: center; padding: 10px 0; color: var(--text-muted); font-size: 13px;">
          🟢 Conectado e pronto
        </div>
      </div>
      <div class="dj-card-actions">
        <button class="dj-btn-delete-card" title="Excluir Instância">🗑️</button>
        <button class="btn ${statusData.status === "connected" ? "btn-danger" : "btn-primary"} dj-btn-connect-card">
          ${statusData.status === "connected" ? "Desconectar" : "Conectar"}
        </button>
      </div>
    `;
    
    card.querySelector(".dj-btn-connect-card").addEventListener("click", async () => {
      const btn = card.querySelector(".dj-btn-connect-card");
      btn.disabled = true;
      try {
        if (statusData.status === "disconnected" || statusData.status === "auth_failure") {
          btn.textContent = "Conectando...";
          await window.deeJayAPI.startInstance(inst.instanceId);
        } else {
          btn.textContent = "Desconectar...";
          await window.deeJayAPI.stopInstance(inst.instanceId);
        }
      } catch (err) {
        alert("Erro ao alterar estado de conexão: " + err.message);
      } finally {
        btn.disabled = false;
      }
    });
    
    card.querySelector(".dj-btn-delete-card").addEventListener("click", async () => {
      const confirmed = await window.customConfirm(
        `Deseja remover permanentemente a conexão "${inst.name}" do Dee Jay?`,
        "Remover Conexão Dee Jay"
      );
      if (confirmed) {
        try {
          await window.deeJayAPI.removeInstance(inst.instanceId);
          djInstances = djInstances.filter(i => i.instanceId !== inst.instanceId);
          delete djInstanceStatuses[inst.instanceId];
          renderDeeJayInstances();
          updateDjLoopButtons();
        } catch (err) {
          alert("Erro ao remover instância: " + err.message);
        }
      }
    });
    
    djInstancesList.appendChild(card);
  });
}

function renderDeeJayMessages() {
  if (!djMessagesList) return;
  djMessagesList.innerHTML = "";
  
  if (djMessages.length === 0) {
    djMessagesList.innerHTML = `<li style="text-align: center; color: var(--text-dark); padding: 12px; font-size: 13px;">Nenhuma mensagem cadastrada. Cadastre pelo menos uma mensagem de texto.</li>`;
    return;
  }
  
  djMessages.forEach(msg => {
    const li = document.createElement("li");
    li.className = "dj-message-item";
    li.innerHTML = `
      <span class="dj-message-text" title="${escapeHTML(msg.message_content)}">${escapeHTML(msg.message_content)}</span>
      <button class="dj-btn-delete-msg" title="Remover">🗑️</button>
    `;
    
    li.querySelector(".dj-btn-delete-msg").addEventListener("click", async () => {
      try {
        await window.deeJayAPI.deleteMessage(msg.id);
        djMessages = djMessages.filter(m => m.id !== msg.id);
        renderDeeJayMessages();
      } catch (err) {
        alert("Erro ao excluir mensagem: " + err.message);
      }
    });
    
    djMessagesList.appendChild(li);
  });
}

function updateDjLoopButtons() {
  if (!djBtnStartLoop || !djBtnStopLoop) return;

  const connectedCount = djInstances.filter(i => {
    const status = djInstanceStatuses[i.instanceId]?.status;
    return status === "connected";
  }).length;
  
  if (djLoopActive) {
    djBtnStartLoop.classList.add("hidden");
    djBtnStopLoop.classList.remove("hidden");
    
    // Desabilita os campos de configuração enquanto o loop estiver ativo
    djMinInterval.disabled = true;
    djMaxInterval.disabled = true;
    djChkLinkBot.disabled = true;
    djChkLinkDrone.disabled = true;
    djBtnSaveConfig.disabled = true;
  } else {
    djBtnStartLoop.classList.remove("hidden");
    djBtnStopLoop.classList.add("hidden");
    
    // Habilita os campos de configuração quando o loop estiver parado
    djMinInterval.disabled = false;
    djMaxInterval.disabled = false;
    djChkLinkBot.disabled = false;
    djChkLinkDrone.disabled = false;
    djBtnSaveConfig.disabled = false;
    
    const linkBot = djChkLinkBot.checked;
    const linkDrone = djChkLinkDrone.checked;
    const hasBinding = linkBot || linkDrone;
    djBtnStartLoop.disabled = (connectedCount < 2 && !hasBinding) || (connectedCount < 1 && hasBinding);
  }
}

function setupUIEventListeners() {
  djBtnClearAll.addEventListener("click", async () => {
    if (djInstances.length === 0) {
      alert("Não há conexões do Dee Jay para limpar.");
      return;
    }

    const confirmed = await window.customConfirm(
      "Tem certeza de que deseja remover TODAS as conexões do Dee Jay?\nEsta ação é irreversível e excluirá permanentemente todos os dados de sessão associados.",
      "Limpar Todas as Conexões Dee Jay",
      "Remover Todas",
      "Cancelar",
      "btn-danger"
    );

    if (confirmed) {
      djBtnClearAll.disabled = true;
      djBtnAddInstance.disabled = true;

      try {
        // Armazena cópia local para evitar mutação do array durante iteração se houver falhas
        const listToRemove = [...djInstances];
        for (const inst of listToRemove) {
          try {
            await window.deeJayAPI.removeInstance(inst.instanceId);
            djInstances = djInstances.filter(i => i.instanceId !== inst.instanceId);
            delete djInstanceStatuses[inst.instanceId];
          } catch (err) {
            console.error(`Erro ao remover conexão Dee Jay ${inst.instanceId}:`, err);
          }
        }
        
        renderDeeJayInstances();
        updateDjLoopButtons();
      } catch (err) {
        alert("Erro ao limpar conexões: " + err.message);
      } finally {
        djBtnClearAll.disabled = false;
        djBtnAddInstance.disabled = false;
      }
    }
  });

  djBtnAddInstance.addEventListener("click", async () => {
    const name = await window.customPrompt("Nova Conexão Dee Jay", "Digite um nome para identificar esta conexão de WhatsApp:");
    if (name === null) return;
    const finalName = name.trim() || `WhatsApp ${djInstances.length + 1}`;
    
    try {
      const newInst = await window.deeJayAPI.createInstance(finalName);
      djInstances.push(newInst);
      djInstanceStatuses[newInst.instanceId] = { status: "disconnected", qrCode: null };
      renderDeeJayInstances();
      
      await window.deeJayAPI.startInstance(newInst.instanceId);
    } catch (err) {
      alert("Erro ao criar conexão: " + err.message);
    }
  });

  djBtnAddMsg.addEventListener("click", async () => {
    const content = djMsgInput.value.trim();
    if (!content) return;
    
    try {
      const newMsg = await window.deeJayAPI.addMessage(content);
      djMessages.unshift(newMsg);
      djMsgInput.value = "";
      renderDeeJayMessages();
    } catch (err) {
      alert("Erro ao cadastrar mensagem: " + err.message);
    }
  });

  djMsgInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      djBtnAddMsg.click();
    }
  });

  djBtnSaveConfig.addEventListener("click", async () => {
    const min = parseInt(djMinInterval.value) || 1;
    const max = parseInt(djMaxInterval.value) || 5;
    
    if (min < 1 || max < min) {
      alert("Intervalos inválidos. O intervalo mínimo deve ser pelo menos 1, e o máximo deve ser maior ou igual ao mínimo.");
      return;
    }
    
    try {
      await window.deeJayAPI.setConfig({
        minIntervalMinutes: min,
        maxIntervalMinutes: max,
        linkBotPrincipal: djChkLinkBot.checked,
        linkDrone: djChkLinkDrone.checked
      });
      alert("Configurações salvas!");
      updateDjLoopButtons();
    } catch (err) {
      alert("Erro ao salvar configurações: " + err.message);
    }
  });

  djBtnStartLoop.addEventListener("click", async () => {
    const min = parseInt(djMinInterval.value) || 1;
    const max = parseInt(djMaxInterval.value) || 5;
    
    if (min < 1 || max < min) {
      alert("Intervalos inválidos. O intervalo mínimo deve ser pelo menos 1, e o máximo deve ser maior ou igual ao mínimo.");
      return;
    }

    try {
      // Auto-salva a configuração atual antes de iniciar o loop
      await window.deeJayAPI.setConfig({
        minIntervalMinutes: min,
        maxIntervalMinutes: max,
        linkBotPrincipal: djChkLinkBot.checked,
        linkDrone: djChkLinkDrone.checked
      });

      const res = await window.deeJayAPI.startLoop();
      if (res && !res.success) {
        alert("Falha ao iniciar loop: " + res.message);
      }
    } catch (err) {
      alert("Erro ao iniciar loop: " + err.message);
    }
  });

  djBtnStopLoop.addEventListener("click", async () => {
    try {
      await window.deeJayAPI.stopLoop();
    } catch (err) {
      alert("Erro ao parar loop: " + err.message);
    }
  });

  djChkLinkBot.addEventListener("change", () => {
    updateDjLoopButtons();
  });

  djChkLinkDrone.addEventListener("change", () => {
    updateDjLoopButtons();
  });

  djBtnClearLogs.addEventListener("click", () => {
    djLogsContainer.innerHTML = "";
    const placeholder = document.createElement("div");
    placeholder.className = "dj-log-placeholder";
    placeholder.textContent = "Nenhuma mensagem trocada ainda...";
    djLogsContainer.appendChild(placeholder);
  });
}

function setupIPCListeners() {
  window.deeJayAPI.onInstanceUpdate((data) => {
    const { instanceId, status, qr } = data;
    if (djInstanceStatuses[instanceId]) {
      djInstanceStatuses[instanceId].status = status;
      if (qr) djInstanceStatuses[instanceId].qrCode = qr;
      else if (status === "connected") djInstanceStatuses[instanceId].qrCode = null;
    }
    renderDeeJayInstances();
    updateDjLoopButtons();
  });

  window.deeJayAPI.onLog((log) => {
    if (!djLogsContainer) return;
    const placeholder = djLogsContainer.querySelector(".dj-log-placeholder");
    if (placeholder) placeholder.remove();
    
    const div = document.createElement("div");
    div.className = "dj-log-entry";
    
    const time = new Date(log.timestamp).toLocaleTimeString();
    div.innerHTML = `
      <div class="dj-log-meta">
        <span class="dj-log-time">[${time}]</span>
        <span class="dj-log-sender">${escapeHTML(log.sender)}</span>
        <span class="dj-log-arrow">➜</span>
        <span class="dj-log-receiver">${escapeHTML(log.receiver)}</span>
      </div>
      <div class="dj-log-text">${escapeHTML(log.message)}</div>
    `;
    
    djLogsContainer.appendChild(div);
    djLogsContainer.scrollTop = djLogsContainer.scrollHeight;
    
    if (djLogsContainer.children.length > 100) {
      djLogsContainer.removeChild(djLogsContainer.firstChild);
    }
  });

  window.deeJayAPI.onLoopStatus((data) => {
    djLoopActive = data.active;
    updateDjLoopButtons();
  });
}
