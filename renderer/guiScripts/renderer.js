// Elementos do DOM
const btnStart = document.getElementById("btn-start");
const btnStop = document.getElementById("btn-stop");
const btnConfig = document.getElementById("btn-config");
const btnDrone = document.getElementById("btn-drone");
const statusDiv = document.getElementById("status");
const qrContainer = document.getElementById("qr-container");
const qrImage = document.getElementById("qr-image");

// Estado da aplicação
let isWhatsAppRunning = false;

// 🆕 CONFIGURAÇÃO DO CONSOLE REDIRECT - ADICIONE NO INÍCIO
if (window.electronAPI && window.electronAPI.onConsoleMessage) {
  window.electronAPI.onConsoleMessage((data) => {
    const { level, message, timestamp } = data;

    // Aplica cores diferentes baseado no nível
    const styles = {
      log: "color: #2196F3; background: #E3F2FD; padding: 2px 6px; border-radius: 3px;",
      error:
        "color: #F44336; background: #FFEBEE; padding: 2px 6px; border-radius: 3px;",
      warn: "color: #FF9800; background: #FFF3E0; padding: 2px 6px; border-radius: 3px;",
      info: "color: #4CAF50; background: #E8F5E8; padding: 2px 6px; border-radius: 3px;",
    };

    // Exibe o log nas DevTools com formatação bonita
    console.log(
      `%c[MAIN-${level.toUpperCase()}]%c ${message}`,
      styles[level] || styles.log,
      "color: inherit; background: inherit;"
    );
  });

  console.log(
    "🔧 Console redirect ativado - logs do processo principal aparecerão aqui!"
  );
}

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

  if (running) {
    // WhatsApp conectado - bloqueia botão iniciar, habilita parar
    hideButtonLoading(btnStart, "✅ Conectado");
    btnStart.disabled = true;
    btnStop.disabled = false;
  } else {
    // WhatsApp desconectado - reseta para estado inicial
    hideButtonLoading(btnStart, "Iniciar WhatsApp");
    btnStart.disabled = false;
    btnStop.disabled = true;
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
      // Mantém o botão desabilitado até a conexão completa
      btnStop.disabled = false;
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

// 🆕 EVENT LISTENER DO BOTÃO DRONE
btnDrone.addEventListener("click", async () => {
  try {
    showButtonLoading(btnDrone, "Abrindo...");

    const result = await window.electronAPI.openDrone();
    showStatus(result.message, result.success ? "success" : "error");

    hideButtonLoading(btnDrone, "🚁 Drone");
  } catch (error) {
    console.error("Erro ao abrir Drone:", error);
    showStatus("Erro ao abrir Drone", "error");
    hideButtonLoading(btnDrone, "🚁 Drone");
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
  updateButtonsState(true); // Agora remove o loading corretamente!
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

console.log("🔧 Testando console redirect...");

// Testa se a função existe
if (window.electronAPI && window.electronAPI.onConsoleMessage) {
  console.log("✅ onConsoleMessage está disponível");
} else {
  console.log("❌ onConsoleMessage NÃO está disponível");
}
