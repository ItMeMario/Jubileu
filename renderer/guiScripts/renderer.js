// ========================================
// Renderer Principal - WhatsApp Bot
// ========================================

// Elementos do DOM
const btnConfig = document.getElementById("btn-config");
const btnDrone = document.getElementById("btn-drone");
const btnClearCache = document.getElementById("btn-clear-cache");
const btnDeeJay = document.getElementById("btn-dee-jay"); // Adicionado: Botão Dee Jay
const btnCRM = document.getElementById("btn-crm"); // Adicionado: Botão CRM
const btnGoat = document.getElementById("btn-goat"); // Adicionado: Botão Goat
const statusDiv = document.getElementById("status");

// ========================================
// Configuração do Console Redirect
// ========================================
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

// ========================================
// Funções de Status
// ========================================

function showStatus(message, type = "info") {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.classList.remove("hidden");

  // Auto-esconde após 5 segundos para mensagens de sucesso
  if (type === "success") {
    setTimeout(() => {
      hideStatus();
    }, 5000);
  }
}

function hideStatus() {
  statusDiv.classList.add("hidden");
}

// ========================================
// Funções de Loading para Botões
// ========================================

function showButtonLoading(button, text = "") {
  const originalText = button.textContent;
  button.dataset.originalText = originalText;
  button.innerHTML = `<span class="loading"></span>${text}`;
  button.disabled = true;
}

function hideButtonLoading(button, text = null) {
  const originalText = text || button.dataset.originalText || "Botão";
  button.textContent = originalText;
  button.disabled = false;
}

// ========================================
// Event Listeners dos Botões Globais
// ========================================

// Botão Configurações
btnConfig.addEventListener("click", async () => {
  try {
    showButtonLoading(btnConfig, "Abrindo...");

    const result = await window.electronAPI.openConfig();

    if (result.success) {
      showStatus(result.message, "success");
    } else {
      showStatus(result.message, "error");
    }

    hideButtonLoading(btnConfig, "⚙️ Configurações");
  } catch (error) {
    console.error("Erro ao abrir configurações:", error);
    showStatus("Erro ao abrir configurações", "error");
    hideButtonLoading(btnConfig, "⚙️ Configurações");
  }
});

// Botão Drone
btnDrone.addEventListener("click", async () => {
  try {
    showButtonLoading(btnDrone, "Abrindo...");

    const result = await window.electronAPI.openDrone();

    if (result.success) {
      showStatus(result.message, "success");
    } else {
      showStatus(result.message, "error");
    }

    hideButtonLoading(btnDrone, "🚁 Drone");
  } catch (error) {
    console.error("Erro ao abrir Drone:", error);
    showStatus("Erro ao abrir Drone", "error");
    hideButtonLoading(btnDrone, "🚁 Drone");
  }
});

// Botão Dee Jay
if (btnDeeJay) {
    btnDeeJay.addEventListener("click", async () => {
      try {
        showButtonLoading(btnDeeJay, "Abrindo...");
    
        const result = await window.electronAPI.openDeeJayWindow();
    
        if (result.success) {
          showStatus(result.message, "success");
        } else {
          showStatus(result.message, "error");
        }
    
        hideButtonLoading(btnDeeJay, "🎧 Dee Jay");
      } catch (error) {
        console.error("Erro ao abrir Dee Jay:", error);
        showStatus("Erro ao abrir Dee Jay", "error");
        hideButtonLoading(btnDeeJay, "🎧 Dee Jay");
      }
    });
}

// Botão CRM
if (typeof btnCRM !== 'undefined' && btnCRM) {
    btnCRM.addEventListener("click", async () => {
        try {
            showButtonLoading(btnCRM, "Abrindo...");
            const result = await window.electronAPI.openCRM();
            if (result.success) {
                showStatus(result.message, "success");
            } else {
                showStatus(result.message, "error");
            }
            hideButtonLoading(btnCRM, "👥 CRM");
        } catch (error) {
            console.error("Erro ao abrir CRM:", error);
            showStatus("Erro ao abrir CRM", "error");
            hideButtonLoading(btnCRM, "👥 CRM");
        }
    });
}

// Botão Goat
if (btnGoat) {
    btnGoat.addEventListener("click", async () => {
        try {
            showButtonLoading(btnGoat, "Abrindo...");
            const result = await window.electronAPI.openGoat();
            if (result.success) {
                showStatus(result.message, "success");
            } else {
                showStatus(result.message, "error");
            }
            hideButtonLoading(btnGoat, "🐐 Goat");
        } catch (error) {
            console.error("Erro ao abrir Goat:", error);
            showStatus("Erro ao abrir Goat", "error");
            hideButtonLoading(btnGoat, "🐐 Goat");
        }
    });
}

// Botão Update
const btnUpdate = document.getElementById("btn-update");
if (btnUpdate) {
  btnUpdate.addEventListener("click", async () => {
    try {
      showButtonLoading(btnUpdate, "Verificando...");
      
      const result = await window.electronAPI.checkUpdate();
      
      if (result.success) {
        if (result.hasUpdate) {
            const confirmUpdate = confirm(`Nova versão encontrada: ${result.remoteVersion} (Atual: ${result.localVersion})\n\nDeseja atualizar agora?`);
            if (confirmUpdate) {
                showButtonLoading(btnUpdate, "Atualizando...");
                const updateResult = await window.electronAPI.triggerUpdate();
                
                if (updateResult.success) {
                   if (updateResult.action === "open_url") {
                       // Se for para abrir URL (ambiente de produção sem auto-update)
                       alert(updateResult.message);
                       // Aqui poderíamos abrir a URL se tivéssemos a API de shell exposta, 
                       // mas como não tenho certeza, deixo o alert.
                       // Se "window.open" funcionar no renderer (depende da config de segurança/sandbox), ótimo.
                   } else {
                       alert(updateResult.message);
                   }
                } else {
                   showStatus(updateResult.message, "error");
                   alert(updateResult.message);
                }
            }
        } else {
            showStatus(result.message, "success");
            alert(result.message);
        }
      } else {
        showStatus(result.message, "error");
      }
      
      hideButtonLoading(btnUpdate, "🔄 Update");
    } catch (error) {
       console.error("Erro no update:", error);
       showStatus("Erro ao verificar update", "error");
       hideButtonLoading(btnUpdate, "🔄 Update");
    }
  });
}

// Botão Limpar Cache
if (btnClearCache) {
  btnClearCache.addEventListener("click", async () => {
    // Confirmação antes de prosseguir
    if (!confirm("Tem certeza que deseja limpar o cache?\n\nIsso irá desconectar o WhatsApp e será necessário escanear o QR Code novamente.\n\nO aplicativo será reiniciado.")) {
      return;
    }

    try {
      showButtonLoading(btnClearCache, "Limpando...");

      const result = await window.electronAPI.clearCache();

      if (result.success) {
        showStatus(result.message, "success");
        alert(result.message);
        // Opcional: Recarregar a página ou reiniciar o app se a lógica de limpar sessão for crítica
        // window.location.reload(); 
      } else {
        showStatus(result.message, "error");
        alert(result.message);
      }

      hideButtonLoading(btnClearCache, "🗑️ Limpar Cache");
    } catch (error) {
      console.error("Erro ao limpar cache:", error);
      showStatus("Erro ao limpar cache", "error");
      hideButtonLoading(btnClearCache, "🗑️ Limpar Cache");
    }
  });
}

// ========================================
// Inicialização
// ========================================

async function initializeApp() {
  console.log("🚀 Inicializando aplicação...");

  try {
    // Inicializa o gerenciador de instâncias
    if (window.instancesManager) {
      await window.instancesManager.init();
      console.log("✅ Gerenciador de instâncias inicializado");
    } else {
      console.error("❌ instancesManager não encontrado");
    }

    console.log("✅ Aplicação inicializada com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao inicializar aplicação:", error);
    showStatus("Erro ao inicializar aplicação", "error");
  }
}

// ========================================
// Cleanup
// ========================================

window.addEventListener("beforeunload", () => {
  // Remove listeners legados
  window.electronAPI.removeAllListeners();

  // Cleanup do gerenciador de instâncias
  if (window.instancesManager) {
    window.instancesManager.destroy();
  }

  console.log("🧹 Cleanup realizado");
});

// ========================================
// Inicia a aplicação quando o DOM estiver pronto
// ========================================

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}

// ========================================
// Debug
// ========================================

console.log("🔧 Renderer.js carregado");

// Testa se as APIs estão disponíveis
if (window.electronAPI) {
  console.log("✅ electronAPI disponível");

  if (window.electronAPI.instances) {
    console.log("✅ API de instâncias disponível");
  } else {
    console.warn("⚠️ API de instâncias NÃO disponível");
  }
} else {
  console.error("❌ electronAPI NÃO disponível");
}
