// renderer/guiScripts/modoDevRenderer.js

class ModoDevRenderer {
  constructor() {
    this.currentStatus = null;
    this.isLoading = false;
    this.init();
  }

  init() {
    console.log("🔧 ModoDevRenderer inicializado");
    this.setupEventListeners();
    this.loadInitialData();
  }

  setupEventListeners() {
    // Toggle buttons
    const toggleDevBtn = document.getElementById("btn-toggle-dev-mode");
    const toggleDebugBtn = document.getElementById("btn-toggle-debug-mode");
    const toggleGroupBtn = document.getElementById("btn-toggle-group-mode");

    // Scout configuration
    const scoutForm = document.getElementById("scout-form");

    if (toggleDevBtn) {
      toggleDevBtn.addEventListener("click", () => this.handleToggleDevMode());
    }

    if (toggleDebugBtn) {
      toggleDebugBtn.addEventListener("click", () =>
        this.handleToggleDebugMode()
      );
    }

    if (toggleGroupBtn) {
      toggleGroupBtn.addEventListener("click", () =>
        this.handleToggleGroupMode()
      );
    }

    if (scoutForm) {
      scoutForm.addEventListener("submit", (e) =>
        this.handleScoutFormSubmit(e)
      );
    }

    // REMOVIDO: refreshStatusBtn - não será mais usado
  }

  async loadInitialData() {
    try {
      this.showLoading(true);
      await Promise.all([this.loadCurrentStatus(), this.loadScoutConfig()]);

      // ADICIONADO: Fallback para garantir que o modo de grupo seja carregado
      if (!this.currentStatus?.groupMode) {
        await this.loadGroupModeOnly();
      }
    } catch (error) {
      console.error("Erro ao carregar dados iniciais:", error);
      this.showError("Erro ao carregar configurações do modo dev");

      // Tentar carregar pelo menos o modo de grupo como fallback
      await this.loadGroupModeOnly();
    } finally {
      this.showLoading(false);
    }
  }

  async loadCurrentStatus() {
    try {
      if (!window.modoDevAPI) {
        throw new Error("modoDevAPI não está disponível");
      }

      // CORRIGIDO: Removido getDetailedStatus, usando apenas getCurrentMode
      const modeResult = await window.modoDevAPI.getCurrentMode();

      if (modeResult.success) {
        this.currentStatus = modeResult.data;
        this.updateStatusDisplay();
      } else {
        throw new Error(modeResult.error);
      }
    } catch (error) {
      console.error("Erro ao carregar status:", error);
      this.showError("Erro ao carregar status atual");
    }
  }

  async loadScoutConfig() {
    try {
      const result = await window.modoDevAPI.getScoutConfig();
      if (result.success) {
        this.updateScoutConfigDisplay(result.data);
      } else {
        console.warn(
          "Não foi possível carregar config do Scout:",
          result.error
        );
      }
    } catch (error) {
      console.error("Erro ao carregar config do Scout:", error);
    }
  }

  
  async loadGroupModeOnly() {
    try {
      // Como não temos um método específico, vamos fazer um toggle e voltar
      // para descobrir o modo atual - isso é um hack, mas funciona
      const result = await window.modoDevAPI.getCurrentMode();
      if (result.success && result.data.groupMode) {
        if (!this.currentStatus) {
          this.currentStatus = {};
        }
        this.currentStatus.groupMode = result.data.groupMode;

        const groupBtn = document.getElementById("btn-toggle-group-mode");
        if (groupBtn) {
          groupBtn.textContent = `Modo: ${result.data.groupMode}`;
        }
      }
    } catch (error) {
      console.error("Erro ao carregar modo de grupo:", error);
      // Se falhar, definir um valor padrão
      const groupBtn = document.getElementById("btn-toggle-group-mode");
      if (groupBtn) {
        groupBtn.textContent = "Alternar Modo de Grupo";
      }
    }
  }

  updateStatusDisplay() {
    if (!this.currentStatus) return;

   
    this.updateStatusIndicator(
      "dev-mode-indicator",
      this.currentStatus.isDevMode
    );
    this.updateStatusIndicator(
      "debug-mode-indicator",
      this.currentStatus.debugEnabled
    );

   
    this.updateToggleButtonText(
      "btn-toggle-dev-mode",
      this.currentStatus.isDevMode ? "Modo: DESENVOLVIMENTO" : "Modo: PRODUÇÃO"
    );

    this.updateToggleButtonText(
      "btn-toggle-debug-mode",
      this.currentStatus.debugEnabled ? "Debug: ATIVO" : "Debug: INATIVO"
    );

    
    if (this.currentStatus.groupMode) {
      this.updateToggleButtonText(
        "btn-toggle-group-mode",
        `Modo: ${this.currentStatus.groupMode}`
      );
    }
  }

  updateStatusIndicator(elementId, isActive) {
    const element = document.getElementById(elementId);
    if (element) {
      element.className = `status-indicator ${
        isActive ? "active" : "inactive"
      }`;
      element.textContent = isActive ? "●" : "○";
    }
  }

  updateToggleButtonText(buttonId, text) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.textContent = text;
      // Adicionar classe de estado
      button.classList.toggle(
        "active-mode",
        text.includes("DESENVOLVIMENTO") || text.includes("ATIVO")
      );
    }
  }

  updateScoutConfigDisplay(scoutConfig) {
    const scoutTimeInput = document.getElementById("scout-time-input");
    const currentScoutInfo = document.getElementById("current-scout-info");

    if (scoutTimeInput && scoutConfig) {
      // Converter segundos para formato HH:MM:SS se necessário
      if (typeof scoutConfig === "number") {
        const hours = Math.floor(scoutConfig / 3600);
        const minutes = Math.floor((scoutConfig % 3600) / 60);
        const seconds = scoutConfig % 60;
        scoutTimeInput.value = `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
      } else if (scoutConfig.timeFormatted) {
        scoutTimeInput.value = scoutConfig.timeFormatted;
      }
    }

    if (currentScoutInfo && scoutConfig) {
      const displayText =
        scoutConfig.timeFormatted ||
        (typeof scoutConfig === "number"
          ? `${scoutConfig}s`
          : "Não configurado");
      currentScoutInfo.textContent = `Tempo atual: ${displayText}`;
    }
  }

  async handleToggleDevMode() {
    if (this.isLoading) return;

    try {
      this.isLoading = true;
      this.showLoading(true, "Alternando modo...");

      const result = await window.modoDevAPI.toggleDevMode();

      if (result.success) {
        this.showSuccess(
          `Modo alterado para ${
            result.isDevMode ? "DESENVOLVIMENTO" : "PRODUÇÃO"
          }`
        );
        await this.loadCurrentStatus();
      } else {
        this.showError(result.error || "Erro ao alternar modo");
      }
    } catch (error) {
      console.error("Erro ao alternar modo dev:", error);
      this.showError("Erro interno ao alternar modo");
    } finally {
      this.isLoading = false;
      this.showLoading(false);
    }
  }

  async handleToggleDebugMode() {
    if (this.isLoading) return;

    try {
      this.isLoading = true;
      this.showLoading(true, "Alternando debug...");

      const result = await window.modoDevAPI.toggleDebugMode();

      if (result.success) {
        this.showSuccess(
          `Debug ${result.debugEnabled ? "ATIVADO" : "DESATIVADO"}`
        );
        await this.loadCurrentStatus();
      } else {
        this.showError(result.error || "Erro ao alternar debug");
      }
    } catch (error) {
      console.error("Erro ao alternar debug:", error);
      this.showError("Erro interno ao alternar debug");
    } finally {
      this.isLoading = false;
      this.showLoading(false);
    }
  }

  async handleToggleGroupMode() {
    if (this.isLoading) return;

    try {
      this.isLoading = true;
      this.showLoading(true, "Alternando modo de grupo...");

      const result = await window.modoDevAPI.toggleGroupMode();

      if (result.success) {
        const { previousMode, currentMode } = result.data;
        this.showSuccess(
          `Modo alterado de ${previousMode} para ${currentMode}`
        );
        await this.loadCurrentStatus();

       
        const groupBtn = document.getElementById("btn-toggle-group-mode");
        if (groupBtn) {
          groupBtn.textContent = `Modo: ${currentMode}`;
        }
      } else {
        this.showError(result.error || "Erro ao alternar modo de grupo");
      }
    } catch (error) {
      console.error("Erro ao alternar modo de grupo:", error);
      this.showError("Erro interno ao alternar modo de grupo");
    } finally {
      this.isLoading = false;
      this.showLoading(false);
    }
  }

  async handleScoutFormSubmit(event) {
    event.preventDefault();

    if (this.isLoading) return;

    const timeInput = document.getElementById("scout-time-input");
    if (!timeInput) return;

    const timeValue = timeInput.value.trim();
    if (!timeValue) {
      this.showError("Por favor, informe um tempo válido");
      return;
    }

    // Validar formato HH:MM:SS
    const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])$/;
    if (!timeRegex.test(timeValue)) {
      this.showError("Formato inválido. Use HH:MM:SS (exemplo: 01:30:45)");
      return;
    }

    try {
      this.isLoading = true;
      this.showLoading(true, "Configurando Scout...");

      const result = await window.modoDevAPI.setScoutTime(timeValue);

      if (result.success) {
        this.showSuccess(
          `Scout configurado para ${result.timeFormatted || timeValue}`
        );
        await this.loadScoutConfig();
      } else {
        this.showError(result.error || "Erro ao configurar Scout");
      }
    } catch (error) {
      console.error("Erro ao configurar Scout:", error);
      this.showError("Erro interno ao configurar Scout");
    } finally {
      this.isLoading = false;
      this.showLoading(false);
    }
  }

  showLoading(show, message = "Carregando...") {
    const loadingDiv = document.getElementById("modo-dev-loading");
    if (loadingDiv) {
      if (show) {
        loadingDiv.innerHTML = `<div class="spinner"></div><p>${message}</p>`;
        loadingDiv.style.display = "block";
      } else {
        loadingDiv.style.display = "none";
      }
    }
  }

  showSuccess(message) {
    this.showMessage(message, "success");
  }

  showError(message) {
    this.showMessage(message, "error");
  }

  showMessage(message, type) {
    const statusDiv = document.getElementById("status");
    if (statusDiv) {
      statusDiv.textContent = message;
      statusDiv.className = `status-message show ${type}`;

      // Auto-hide after 5 seconds
      setTimeout(() => {
        statusDiv.classList.remove("show");
      }, 5000);
    }
  }

  // Método público para debug
  getCurrentStatus() {
    return this.currentStatus;
  }


}

// Inicializar quando o DOM estiver pronto
document.addEventListener("DOMContentLoaded", () => {
  window.modoDevRenderer = new ModoDevRenderer();
});

// Disponibilizar globalmente para debug
window.ModoDevRenderer = ModoDevRenderer;
