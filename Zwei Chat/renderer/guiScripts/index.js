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
