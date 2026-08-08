// renderer/guiScripts/drone.js
console.log("drone.js loaded");

// Estado em memória do Drone
let droneInstances = [];
let droneMessages = [];
let droneClients = [];
let droneDispatchActive = false;
const droneInstanceStatuses = {}; // instanceId => { status, qrCode }
let droneInitialized = false;

// DOM Elements
let droneBtnTabInstances, droneBtnTabMessages, droneBtnTabNumbers, droneBtnTabDispatch;
let droneSecInstances, droneSecMessages, droneSecNumbers, droneSecDispatch;
let droneGlobalIndicator, droneGlobalStatusText;

// Elementos - Instâncias
let droneBtnClearInstances, droneBtnAddInstance, droneInstancesGrid;

// Elementos - Mensagens
let droneMsgInput, droneBtnAddMsg, droneMessagesList;

// Elementos - Contatos
let droneNumName, droneNumTel, droneBtnAddNum;
let droneCsvDropzone, droneCsvFile;
let droneOpt9Digit, droneOptDDD, droneOptDDDVal, droneOptPrefix, droneOptPrefixVal, droneBtnSaveFormat;
let droneBtnClearFailed, droneBtnClearSent, droneBtnClearAllNums, droneNumbersList;

// Elementos - Disparo
let droneStatTotal, droneStatPending, droneStatSent, droneStatFailed;
let droneIntervalSelector;
let droneBtnStartDispatch, droneBtnStopDispatch;
let droneLogsContainer, droneBtnClearLogs;

// Helper para escapar strings contra injeção de HTML
function escapeHTML(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Inicializa a aba Drone
window.initDrone = async function() {
  if (droneInitialized) {
    await loadDroneData();
    return;
  }

  console.log("Drone: Inicializando elementos de interface...");

  // Elementos do Layout/Navegação
  droneBtnTabInstances = document.getElementById("drone-tab-instances");
  droneBtnTabMessages = document.getElementById("drone-tab-messages");
  droneBtnTabNumbers = document.getElementById("drone-tab-numbers");
  droneBtnTabDispatch = document.getElementById("drone-tab-dispatch");

  droneSecInstances = document.getElementById("drone-sec-instances");
  droneSecMessages = document.getElementById("drone-sec-messages");
  droneSecNumbers = document.getElementById("drone-sec-numbers");
  droneSecDispatch = document.getElementById("drone-sec-dispatch");

  droneGlobalIndicator = document.getElementById("drone-global-indicator");
  droneGlobalStatusText = document.getElementById("drone-global-status-text");

  // Instâncias
  droneBtnClearInstances = document.getElementById("drone-btn-clear-instances");
  droneBtnAddInstance = document.getElementById("drone-btn-add-instance");
  droneInstancesGrid = document.getElementById("drone-instances-grid");

  // Mensagens
  droneMsgInput = document.getElementById("drone-msg-input");
  droneBtnAddMsg = document.getElementById("drone-btn-add-msg");
  droneMessagesList = document.getElementById("drone-messages-list");

  // Contatos
  droneNumName = document.getElementById("drone-num-name");
  droneNumTel = document.getElementById("drone-num-tel");
  droneBtnAddNum = document.getElementById("drone-btn-add-num");
  droneCsvDropzone = document.getElementById("drone-csv-dropzone");
  droneCsvFile = document.getElementById("drone-csv-file");
  droneOpt9Digit = document.getElementById("drone-opt-9digit");
  droneOptDDD = document.getElementById("drone-opt-ddd");
  droneOptDDDVal = document.getElementById("drone-opt-ddd-val");
  droneOptPrefix = document.getElementById("drone-opt-prefix");
  droneOptPrefixVal = document.getElementById("drone-opt-prefix-val");
  droneBtnSaveFormat = document.getElementById("drone-btn-save-format");
  droneBtnClearFailed = document.getElementById("drone-btn-clear-failed");
  droneBtnClearSent = document.getElementById("drone-btn-clear-sent");
  droneBtnClearAllNums = document.getElementById("drone-btn-clear-all-nums");
  droneNumbersList = document.getElementById("drone-numbers-list");

  droneStatTotal = document.getElementById("drone-stat-total");
  droneStatPending = document.getElementById("drone-stat-pending");
  droneStatSent = document.getElementById("drone-stat-sent");
  droneStatFailed = document.getElementById("drone-stat-failed");
  droneIntervalSelector = window.IntervalSelector.init("drone-interval-container", { defaultUnit: "seconds", showSeconds: true });
  droneBtnStartDispatch = document.getElementById("drone-btn-start-dispatch");
  droneBtnStopDispatch = document.getElementById("drone-btn-stop-dispatch");
  droneLogsContainer = document.getElementById("drone-logs-container");
  droneBtnClearLogs = document.getElementById("drone-btn-clear-logs");

  // Setup de Listeners
  setupDroneUIEventListeners();
  setupDroneIPCListeners();

  // Carga inicial
  await loadDroneData();

  droneInitialized = true;
  console.log("Drone: Inicializado com sucesso!");
};

async function loadDroneData() {
  await loadDroneConfig();
  await loadDroneInstances();
  await loadDroneMessages();
  await loadDroneClients();
}

async function loadDroneConfig() {
  try {
    const config = await window.droneAPI.getConfig();
    if (config) {
      droneOpt9Digit.checked = !!config.add9thDigit;
      droneOptDDD.checked = !!config.addDDD;
      droneOptDDDVal.value = config.defaultDDD || "";
      droneOptPrefix.checked = !!config.addCountryPrefix;
      droneOptPrefixVal.value = config.defaultCountryPrefix || "55";
      if (droneIntervalSelector) {
        droneIntervalSelector.setValue(config.dispatchInterval || {
          type: "range",
          unit: "seconds",
          min: config.minIntervalSeconds || 5,
          max: config.maxIntervalSeconds || 15
        });
      }
    }
  } catch (err) {
    console.error("Erro ao carregar configurações do Drone:", err);
  }
}

async function loadDroneInstances() {
  try {
    droneInstances = await window.droneAPI.getInstances();
    droneInstances.forEach(inst => {
      droneInstanceStatuses[inst.instanceId] = {
        status: inst.status,
        qrCode: inst.qrCode
      };
    });
    renderDroneInstances();
    updateDroneDispatchUI();
  } catch (err) {
    console.error("Erro ao carregar instâncias do Drone:", err);
  }
}

async function loadDroneMessages() {
  try {
    droneMessages = await window.droneAPI.getMessages();
    renderDroneMessages();
  } catch (err) {
    console.error("Erro ao carregar mensagens do Drone:", err);
  }
}

async function loadDroneClients() {
  try {
    droneClients = await window.droneAPI.getClients();
    renderDroneClients();
    await updateDroneStats();
  } catch (err) {
    console.error("Erro ao carregar lista de destinatários do Drone:", err);
  }
}

async function updateDroneStats() {
  try {
    const stats = await window.droneAPI.getStats();
    droneStatTotal.textContent = stats.total || 0;
    droneStatPending.textContent = stats.pending || 0;
    droneStatSent.textContent = stats.sent || 0;
    droneStatFailed.textContent = stats.failed || 0;
  } catch (e) {
    console.error("Erro ao atualizar estatísticas do Drone:", e);
  }
}

// Renderizações de Front-end

function renderDroneInstances() {
  if (!droneInstancesGrid) return;
  droneInstancesGrid.innerHTML = "";

  if (droneInstances.length === 0) {
    droneInstancesGrid.innerHTML = `<div class="dj-placeholder" style="grid-column: 1/-1;">Nenhuma conta Drone cadastrada. Adicione uma no botão acima!</div>`;
    return;
  }

  droneInstances.forEach(inst => {
    const statusData = droneInstanceStatuses[inst.instanceId] || { status: "disconnected" };
    const card = document.createElement("div");
    card.className = "dj-card";
    card.id = `drone-card-${inst.instanceId}`;
    
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

    const isConnectingOrQr = (statusData.status === "qr_pending" || statusData.status === "connecting" || statusData.status === "authenticated") && statusData.status !== "connected";
    const qrSrc = statusData.qrCode 
      ? (statusData.qrCode.startsWith("data:") ? statusData.qrCode : `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(statusData.qrCode)}`)
      : "";

    card.innerHTML = `
      <div class="dj-card-header">
        <span class="dj-card-name" title="${escapeHTML(inst.name)}">${escapeHTML(inst.name)}</span>
        <span class="dj-card-badge ${badgeClass}">${badgeLabel}</span>
      </div>
      <div class="dj-card-body">
        <div class="dj-card-qr-container" style="display: ${isConnectingOrQr ? "flex" : "none"}">
          ${statusData.qrCode ? `
            <img class="dj-card-qr-img" src="${qrSrc}" alt="QR Code WhatsApp">
            <span class="dj-card-info">📱 Escaneie o QR Code no seu WhatsApp</span>
          ` : `
            <div class="spinner" style="width: 28px; height: 28px; border-width: 3px;"></div>
            <span class="dj-card-info" style="margin-top: 6px;">Gerando QR Code... Aguarde</span>
          `}
        </div>
        <div class="dj-card-status-info" style="display: ${statusData.status === "connected" ? "block" : "none"}; text-align: center; padding: 12px 0; color: var(--success); font-size: 13px; font-weight: 500;">
          🟢 Instância Conectada e Pronta
        </div>
      </div>
      <div class="dj-card-actions">
        <button class="dj-btn-delete-card" title="Excluir Drone">🗑️</button>
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
          await window.droneAPI.startInstance(inst.instanceId);
        } else {
          btn.textContent = "Desconectar...";
          await window.droneAPI.stopInstance(inst.instanceId);
        }
      } catch (err) {
        alert("Erro ao conectar Drone: " + err.message);
      } finally {
        btn.disabled = false;
      }
    });

    card.querySelector(".dj-btn-delete-card").addEventListener("click", async () => {
      const confirmed = await window.customConfirm(
        `Tem certeza de que deseja excluir a conta de Drone "${inst.name}"?`,
        "Excluir Drone"
      );
      if (confirmed) {
        try {
          await window.droneAPI.removeInstance(inst.instanceId);
          droneInstances = droneInstances.filter(i => i.instanceId !== inst.instanceId);
          delete droneInstanceStatuses[inst.instanceId];
          renderDroneInstances();
          updateDroneDispatchUI();
        } catch (err) {
          alert("Erro ao remover Drone: " + err.message);
        }
      }
    });

    droneInstancesGrid.appendChild(card);
  });
}

function renderDroneMessages() {
  if (!droneMessagesList) return;
  droneMessagesList.innerHTML = "";

  if (droneMessages.length === 0) {
    droneMessagesList.innerHTML = `<li style="text-align: center; color: var(--text-dark); padding: 12px; font-size: 13px;">Nenhuma mensagem de disparo cadastrada. Cadastre pelo menos uma.</li>`;
    return;
  }

  droneMessages.forEach(msg => {
    const li = document.createElement("li");
    li.className = "dj-message-item";
    li.innerHTML = `
      <span class="dj-message-text" title="${escapeHTML(msg.message_content)}">${escapeHTML(msg.message_content)}</span>
      <button class="dj-btn-delete-msg" title="Excluir">🗑️</button>
    `;

    li.querySelector(".dj-btn-delete-msg").addEventListener("click", async () => {
      try {
        await window.droneAPI.deleteMessage(msg.id);
        droneMessages = droneMessages.filter(m => m.id !== msg.id);
        renderDroneMessages();
      } catch (err) {
        alert("Erro ao excluir mensagem: " + err.message);
      }
    });

    droneMessagesList.appendChild(li);
  });
}

function renderDroneClients() {
  if (!droneNumbersList) return;
  droneNumbersList.innerHTML = "";

  if (droneClients.length === 0) {
    droneNumbersList.innerHTML = `<li style="text-align: center; color: var(--text-dark); padding: 12px; font-size: 13px;">Nenhum destinatário importado.</li>`;
    return;
  }

  droneClients.forEach(c => {
    const li = document.createElement("li");
    li.className = "dj-message-item";
    
    let statusLabel = "Pendente";
    let statusClass = "pending";
    if (c.status === "sent") {
      statusLabel = "Enviado";
      statusClass = "sent";
    } else if (c.status === "failed") {
      statusLabel = "Falha";
      statusClass = "failed";
    }

    li.innerHTML = `
      <span class="dj-message-text"><strong>${escapeHTML(c.name || "Sem Nome")}</strong> - ${escapeHTML(c.tel)}</span>
      <div style="display: flex; align-items: center; gap: 10px;">
        <span class="client-item-status ${statusClass}">${statusLabel}</span>
        <button class="dj-btn-delete-msg" title="Remover">✕</button>
      </div>
    `;

    li.querySelector(".dj-btn-delete-msg").addEventListener("click", async () => {
      try {
        await window.droneAPI.removeClient(c.id);
        droneClients = droneClients.filter(client => client.id !== c.id);
        renderDroneClients();
        await updateDroneStats();
      } catch (err) {
        alert("Erro ao excluir número: " + err.message);
      }
    });

    droneNumbersList.appendChild(li);
  });
}

function updateDroneDispatchUI() {
  const connectedCount = droneInstances.filter(i => {
    const status = droneInstanceStatuses[i.instanceId]?.status;
    return status === "connected";
  }).length;

  if (droneDispatchActive) {
    droneGlobalIndicator.className = "status-indicator connected";
    droneGlobalStatusText.textContent = `Disparando (Drones Ativos: ${connectedCount})`;
    droneBtnStartDispatch.classList.add("hidden");
    droneBtnStopDispatch.classList.remove("hidden");
  } else {
    droneGlobalIndicator.className = "status-indicator disconnected";
    droneGlobalStatusText.textContent = `Disparo Inativo (Drones Ativos: ${connectedCount})`;
    droneBtnStartDispatch.classList.remove("hidden");
    droneBtnStopDispatch.classList.add("hidden");
  }
}

// Configurações de Eventos

function setupDroneUIEventListeners() {
  // Navegação entre sub-abas do Drone
  const subtabs = [
    { btn: droneBtnTabInstances, sec: droneSecInstances },
    { btn: droneBtnTabMessages, sec: droneSecMessages },
    { btn: droneBtnTabNumbers, sec: droneSecNumbers },
    { btn: droneBtnTabDispatch, sec: droneSecDispatch }
  ];

  subtabs.forEach(tab => {
    tab.btn.addEventListener("click", () => {
      subtabs.forEach(t => {
        t.btn.classList.remove("btn-primary");
        t.btn.classList.add("btn-secondary");
        t.btn.classList.remove("active");
        t.sec.classList.remove("active-section");
      });
      tab.btn.classList.add("btn-primary");
      tab.btn.classList.remove("btn-secondary");
      tab.btn.classList.add("active");
      tab.sec.classList.add("active-section");
    });
  });

  // Criar instância de Drone
  droneBtnAddInstance.addEventListener("click", async () => {
    const name = await window.customPrompt("Nova Instância Drone", "Insira o nome para a nova conta Drone:");
    if (name && name.trim()) {
      try {
        const inst = await window.droneAPI.createInstance(name.trim());
        droneInstances.push(inst);
        droneInstanceStatuses[inst.instanceId] = { status: inst.status, qrCode: null };
        renderDroneInstances();
        updateDroneDispatchUI();
      } catch (err) {
        alert("Erro ao criar conta Drone: " + err.message);
      }
    }
  });

  // Excluir todas as instâncias de Drone
  droneBtnClearInstances.addEventListener("click", async () => {
    const confirmed = await window.customConfirm(
      "Deseja remover TODAS as contas de Drone do sistema?\nIsso desconectará todos os robôs ativos.",
      "Remover todos os Drones"
    );
    if (confirmed) {
      for (const inst of droneInstances) {
        try {
          await window.droneAPI.removeInstance(inst.instanceId);
        } catch (e) {
          console.error("Erro ao remover drone individual:", e);
        }
      }
      droneInstances = [];
      renderDroneInstances();
      updateDroneDispatchUI();
    }
  });

  // Adicionar mensagem
  droneBtnAddMsg.addEventListener("click", async () => {
    const text = droneMsgInput.value.trim();
    if (!text) return;
    try {
      const msg = await window.droneAPI.addMessage(text);
      droneMessages.unshift(msg);
      renderDroneMessages();
      droneMsgInput.value = "";
    } catch (e) {
      alert("Erro ao adicionar mensagem: " + e.message);
    }
  });

  droneMsgInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      droneBtnAddMsg.click();
    }
  });

  // Salvar configurações de formatação do Drone
  droneBtnSaveFormat.addEventListener("click", async () => {
    const selectorVal = droneIntervalSelector ? droneIntervalSelector.getValue() : { type: "range", unit: "seconds", min: 5, max: 15 };
    if (selectorVal.type === "range" && selectorVal.min > selectorVal.max) {
      alert("Intervalo mínimo de disparo não pode ser maior que o máximo!");
      return;
    }
    const config = {
      add9thDigit: droneOpt9Digit.checked,
      addDDD: droneOptDDD.checked,
      defaultDDD: droneOptDDDVal.value.trim(),
      addCountryPrefix: droneOptPrefix.checked,
      defaultCountryPrefix: droneOptPrefixVal.value.trim(),
      minIntervalSeconds: selectorVal.min || 0,
      maxIntervalSeconds: selectorVal.max || 0,
      dispatchInterval: selectorVal
    };
    try {
      await window.droneAPI.setConfig(config);
      alert("Configurações do Drone salvas com sucesso!");
    } catch (e) {
      alert("Erro ao salvar configurações: " + e.message);
    }
  });

  // Adicionar número manual
  droneBtnAddNum.addEventListener("click", async () => {
    const name = droneNumName.value.trim();
    const tel = droneNumTel.value.trim();
    if (!tel) {
      alert("Insira pelo menos o telefone!");
      return;
    }
    try {
      const client = await window.droneAPI.addClient({ name, tel });
      droneClients.unshift(client);
      renderDroneClients();
      await updateDroneStats();
      droneNumName.value = "";
      droneNumTel.value = "";
    } catch (e) {
      alert("Erro ao adicionar contato: " + e.message);
    }
  });

  // Limpezas de contatos
  droneBtnClearFailed.addEventListener("click", async () => {
    try {
      await window.droneAPI.clearClients("failed");
      await loadDroneClients();
    } catch (e) {
      alert("Erro ao limpar contatos com falha: " + e.message);
    }
  });

  droneBtnClearSent.addEventListener("click", async () => {
    try {
      await window.droneAPI.clearClients("sent");
      await loadDroneClients();
    } catch (e) {
      alert("Erro ao limpar contatos enviados: " + e.message);
    }
  });

  droneBtnClearAllNums.addEventListener("click", async () => {
    const confirmed = await window.customConfirm(
      "Deseja esvaziar completamente a lista de destinatários?",
      "Limpar Lista Completa"
    );
    if (confirmed) {
      try {
        await window.droneAPI.clearClients("all");
        await loadDroneClients();
      } catch (e) {
        alert("Erro ao limpar todos os contatos: " + e.message);
      }
    }
  });

  // Importação por Dropzone / Seleção de CSV
  droneCsvDropzone.addEventListener("click", () => droneCsvFile.click());
  
  droneCsvDropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    droneCsvDropzone.classList.add("dragover");
  });
  
  droneCsvDropzone.addEventListener("dragleave", () => {
    droneCsvDropzone.classList.remove("dragover");
  });

  droneCsvDropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    droneCsvDropzone.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) {
      processCsvFile(e.dataTransfer.files[0]);
    }
  });

  droneCsvFile.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      processCsvFile(e.target.files[0]);
    }
  });

  // Ações de Disparo
  droneBtnStartDispatch.addEventListener("click", async () => {
    const connectedCount = droneInstances.filter(i => {
      return droneInstanceStatuses[i.instanceId]?.status === "connected";
    }).length;

    if (connectedCount === 0) {
      alert("Não há instâncias do Drone conectadas! Por favor, conecte pelo menos uma conta Drone antes de disparar.");
      return;
    }

    if (droneClients.length === 0) {
      alert("A lista de contatos está vazia! Importe números para disparo primeiro.");
      return;
    }

    if (droneMessages.length === 0) {
      alert("Não há mensagens de disparo cadastradas! Crie modelos de mensagens primeiro.");
      return;
    }

    try {
      droneBtnStartDispatch.disabled = true;
      
      // Salva configurações antes de iniciar para garantir dados mais recentes de delay
      const selectorVal = droneIntervalSelector ? droneIntervalSelector.getValue() : { type: "range", unit: "seconds", min: 5, max: 15 };
      if (selectorVal.type === "range" && selectorVal.min > selectorVal.max) {
        alert("Intervalo mínimo de disparo não pode ser maior que o máximo!");
        return;
      }
      const config = {
        add9thDigit: droneOpt9Digit.checked,
        addDDD: droneOptDDD.checked,
        defaultDDD: droneOptDDDVal.value.trim(),
        addCountryPrefix: droneOptPrefix.checked,
        defaultCountryPrefix: droneOptPrefixVal.value.trim(),
        minIntervalSeconds: selectorVal.min || 0,
        maxIntervalSeconds: selectorVal.max || 0,
        dispatchInterval: selectorVal
      };
      await window.droneAPI.setConfig(config);

      const res = await window.droneAPI.startDispatch();
      if (!res.success) {
        alert("Erro ao iniciar disparo: " + res.message);
      }
    } catch (e) {
      alert("Erro ao iniciar disparo: " + e.message);
    } finally {
      droneBtnStartDispatch.disabled = false;
    }
  });

  droneBtnStopDispatch.addEventListener("click", async () => {
    try {
      await window.droneAPI.stopDispatch();
    } catch (e) {
      alert("Erro ao parar disparo: " + e.message);
    }
  });

  // Limpar logs
  droneBtnClearLogs.addEventListener("click", () => {
    droneLogsContainer.innerHTML = `<div class="dj-log-placeholder">Console de logs limpo.</div>`;
  });
}

function processCsvFile(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const content = e.target.result;
      const lines = content.split(/\r?\n/);
      const contacts = [];
      
      lines.forEach((line, index) => {
        if (!line.trim()) return;
        // Ignora cabeçalho se houver padrões conhecidos
        if (index === 0 && (line.toLowerCase().includes("name") || line.toLowerCase().includes("tel") || line.toLowerCase().includes("nome") || line.toLowerCase().includes("fone"))) {
          return;
        }

        const parts = line.split(/[;,]/);
        if (parts.length >= 2) {
          const name = parts[0].trim().replace(/^["']|["']$/g, '');
          const tel = parts[1].trim().replace(/^["']|["']$/g, '');
          if (tel) {
            contacts.push({ name, tel });
          }
        } else if (parts.length === 1 && parts[0].trim()) {
          const tel = parts[0].trim().replace(/^["']|["']$/g, '');
          contacts.push({ name: "", tel });
        }
      });

      if (contacts.length === 0) {
        alert("Nenhum contato detectado no arquivo CSV!");
        return;
      }

      const added = await window.droneAPI.addClientsBatch(contacts);
      alert(`Importação concluída: ${added} contatos importados com sucesso!`);
      await loadDroneClients();
    } catch (err) {
      alert("Erro ao processar arquivo CSV: " + err.message);
    }
  };
  reader.readAsText(file, "UTF-8");
}

function setupDroneIPCListeners() {
  // Limpa eventuais ouvintes antigos do preload
  if (typeof window.droneAPI.removeListeners === "function") {
    window.droneAPI.removeListeners();
  }

  // Mudança de status das conexões Drone
  window.droneAPI.onInstanceUpdate((data) => {
    const { instanceId, status, qr, error } = data;
    console.log(`Drone IPC Update: ${instanceId} status=${status}`);

    if (droneInstanceStatuses[instanceId]) {
      droneInstanceStatuses[instanceId].status = status;
      if (qr) droneInstanceStatuses[instanceId].qrCode = qr;
    }

    renderDroneInstances();
    updateDroneDispatchUI();
  });

  // Logs do processo de disparo
  window.droneAPI.onLog((data) => {
    const { timestamp, droneName, clientName, message, status } = data;
    const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();

    // Remove placeholder inicial se presente
    const placeholder = droneLogsContainer.querySelector(".dj-log-placeholder");
    if (placeholder) {
      droneLogsContainer.innerHTML = "";
    }

    const logEntry = document.createElement("div");
    logEntry.className = `dj-log-entry ${status || ""}`;
    logEntry.innerHTML = `
      <div class="dj-log-meta">
        <span class="dj-log-time">[${timeStr}]</span>
        <span class="dj-log-sender">${escapeHTML(droneName)}</span>
      </div>
      <div class="dj-log-text">${escapeHTML(message)}</div>
    `;

    droneLogsContainer.appendChild(logEntry);
    droneLogsContainer.scrollTop = droneLogsContainer.scrollHeight;
  });

  // Status/Modo do disparo (Ativo ou Inativo)
  window.droneAPI.onDispatchStatus((data) => {
    droneDispatchActive = !!data.active;
    updateDroneDispatchUI();
  });

  // Progresso do disparo em lote
  window.droneAPI.onDispatchProgress(async (data) => {
    const { progress } = data;
    if (progress) {
      droneStatTotal.textContent = progress.total || 0;
      droneStatPending.textContent = (progress.total - progress.current) || 0;
      droneStatSent.textContent = progress.sent || 0;
      droneStatFailed.textContent = progress.failed || 0;
    }
  });

  window.droneAPI.onDispatchComplete(async (progress) => {
    alert(`Disparo Concluído!\nTotal: ${progress.total}\nEnviados: ${progress.sent}\nFalhas: ${progress.failed}`);
    await loadDroneClients();
  });
}
