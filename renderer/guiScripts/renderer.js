// Elementos do DOM
const btnStart = document.getElementById("btn-start");
const btnStop = document.getElementById("btn-stop");
const btnConfig = document.getElementById("btn-config");
const statusDiv = document.getElementById("status");
const qrContainer = document.getElementById("qr-container");
const qrImage = document.getElementById("qr-image");

// Estado da aplicação
let isWhatsAppRunning = false;

// Função para mostrar status
function showStatus(message, type = "info") {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.classList.remove("hidden");
}

// Função para esconder status
function hideStatus() {
  statusDiv.classList.add("hidden");
}

// Função para mostrar loading no botão
function showButtonLoading(button, text = "") {
  const btnText = button.querySelector(".btn-text") || button;
  btnText.innerHTML = `<span class="loading"></span>${text}`;
  button.disabled = true;
}

// Função para esconder loading no botão
function hideButtonLoading(button, text) {
  const btnText = button.querySelector(".btn-text") || button;
  btnText.textContent = text;
  button.disabled = false;
}

// Função para atualizar estado dos botões
function updateButtonsState(running) {
  isWhatsAppRunning = running;
  btnStart.disabled = running;
  btnStop.disabled = !running;

  if (!running) {
    hideButtonLoading(btnStart, "Iniciar WhatsApp");
  }
}

// Event listeners dos botões
btnStart.addEventListener("click", async () => {
  try {
    showButtonLoading(btnStart, "Iniciando...");
    showStatus("Inicializando WhatsApp...", "info");
    qrContainer.classList.add("hidden");

    const result = await window.electronAPI.startWhatsApp();

    if (result.success) {
      showStatus("Aguardando QR Code...", "info");
      updateButtonsState(true);
    } else {
      showStatus(`Erro: ${result.message}`, "error");
      hideButtonLoading(btnStart, "Iniciar WhatsApp");
    }
  } catch (error) {
    console.error("Erro ao iniciar WhatsApp:", error);
    showStatus("Erro ao iniciar WhatsApp", "error");
    hideButtonLoading(btnStart, "Iniciar WhatsApp");
  }
});

btnStop.addEventListener("click", async () => {
  try {
    showButtonLoading(btnStop, "Parando...");
    showStatus("Desconectando WhatsApp...", "info");

    const result = await window.electronAPI.stopWhatsApp();

    if (result.success) {
      showStatus(result.message, "success");
      updateButtonsState(false);
      qrContainer.classList.add("hidden");
    } else {
      showStatus(`Erro: ${result.message}`, "error");
    }

    hideButtonLoading(btnStop, "Parar WhatsApp");
  } catch (error) {
    console.error("Erro ao parar WhatsApp:", error);
    showStatus("Erro ao parar WhatsApp", "error");
    hideButtonLoading(btnStop, "Parar WhatsApp");
  }
});

btnConfig.addEventListener("click", async () => {
  try {
    showButtonLoading(btnConfig, "Abrindo...");

    const result = await window.electronAPI.openConfig();
    showStatus(result.message, result.success ? "success" : "error");

    hideButtonLoading(btnConfig, "Configurações");
  } catch (error) {
    console.error("Erro ao abrir configurações:", error);
    showStatus("Erro ao abrir configurações", "error");
    hideButtonLoading(btnConfig, "Configurações");
  }
});

// Event listeners para eventos do WhatsApp
window.electronAPI.onQRGenerated((data) => {
  console.log("QR Code recebido");
  qrImage.src = data.qrImage;
  qrContainer.classList.remove("hidden");
  showStatus("QR Code gerado! Escaneie com seu WhatsApp", "info");
});

window.electronAPI.onWhatsAppReady((message) => {
  console.log("WhatsApp conectado:", message);
  showStatus(message, "success");
  qrContainer.classList.add("hidden");
  updateButtonsState(true);
});

window.electronAPI.onWhatsAppAuthenticated((message) => {
  console.log("WhatsApp autenticado:", message);
  showStatus(message, "success");
});

window.electronAPI.onWhatsAppDisconnected((message) => {
  console.log("WhatsApp desconectado:", message);
  showStatus(message, "error");
  updateButtonsState(false);
  qrContainer.classList.add("hidden");
});

window.electronAPI.onError((message) => {
  console.error("Erro do WhatsApp:", message);
  showStatus(message, "error");
  updateButtonsState(false);
  qrContainer.classList.add("hidden");
});

// Cleanup ao fechar a janela
window.addEventListener("beforeunload", () => {
  window.electronAPI.removeAllListeners();
});
