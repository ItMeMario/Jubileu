// renderer/guiScripts/modoDevRenderer.js

class ModoDevRenderer {
  constructor() {
    this.currentStatus = null;
    this.isLoading = false;
    this.availableLocales = null;
    this.currentLocale = null;
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
    // ❌ REMOVIDO: const toggleGroupBtn = document.getElementById("btn-toggle-group-mode");

    // Scout configuration
    const scoutForm = document.getElementById("scout-form");

    // ========== NOVO: Locale configuration ==========
    const localeForm = document.getElementById("locale-form");
    const localeSelect = document.getElementById("locale-select");

    if (toggleDevBtn) {
      toggleDevBtn.addEventListener("click", () => this.handleToggleDevMode());
    }

    if (toggleDebugBtn) {
      toggleDebugBtn.addEventListener("click", () =>
        this.handleToggleDebugMode()
      );
    }

    // ❌ REMOVIDO: Event listener do toggleGroupBtn

    if (scoutForm) {
      scoutForm.addEventListener("submit", (e) =>
        this.handleScoutFormSubmit(e)
      );
    }

    // ========== NOVO: Event listeners para locale ==========
    if (localeForm) {
      localeForm.addEventListener("submit", (e) =>
        this.handleLocaleFormSubmit(e)
      );
    }

    if (localeSelect) {
      localeSelect.addEventListener("change", () =>
        this.handleLocaleSelectChange()
      );
    }
  }

  async loadInitialData() {
    try {
      this.showLoading(true);
      await Promise.all([
        this.loadCurrentStatus(),
        this.loadScoutConfig(),
        this.loadLocaleData(),
      ]);
    } catch (error) {
      console.error("Erro ao carregar dados iniciais:", error);
      this.showError("Erro ao carregar configurações do modo dev");
    } finally {
      this.showLoading(false);
    }
  }

  async loadCurrentStatus() {
    try {
      if (!window.modoDevAPI) {
        throw new Error("modoDevAPI não está disponível");
      }

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

  // ========== CORRIGIDO: Métodos para locale ==========
  async loadLocaleData() {
    try {
      // Carregar locale atual e locales disponíveis em paralelo
      const [currentResult, availableResult] = await Promise.all([
        window.modoDevAPI.getCurrentLocale(),
        window.modoDevAPI.getAvailableLocales(),
      ]);

      if (currentResult.success) {
        this.currentLocale = currentResult.data;
      }

      if (availableResult.success) {
        this.availableLocales = availableResult.data;
        this.updateLocaleSelectOptions();
      }

      this.updateLocaleDisplay();
    } catch (error) {
      console.error("Erro ao carregar dados de locale:", error);
      this.showError("Erro ao carregar configurações de idioma");
    }
  }

  updateLocaleSelectOptions() {
    const localeSelect = document.getElementById("locale-select");
    if (!localeSelect || !this.availableLocales) return;

    // Limpar opções existentes
    localeSelect.innerHTML = '<option value="">Selecione um idioma...</option>';

    // Adicionar opções disponíveis
    this.availableLocales.forEach((locale, index) => {
      const option = document.createElement("option");
      option.value = (index + 1).toString();
      option.textContent = `${locale.name} (${locale.code})`;

      if (this.currentLocale && locale.code === this.currentLocale) {
        option.selected = true;
      }

      localeSelect.appendChild(option);
    });
  }

  updateLocaleDisplay() {
    const currentLocaleInfo = document.getElementById("current-locale-info");
    if (currentLocaleInfo) {
      if (this.currentLocale) {
        let displayName = this.currentLocale;

        if (this.availableLocales) {
          const localeObj = this.availableLocales.find(
            (locale) => locale.code === this.currentLocale
          );
          if (localeObj) {
            displayName = `${localeObj.name} (${localeObj.code})`;
          }
        }

        currentLocaleInfo.textContent = `Idioma atual: ${displayName}`;
      } else {
        currentLocaleInfo.textContent = "Idioma atual: Não carregado";
      }
    }
  }

  async handleLocaleFormSubmit(event) {
    event.preventDefault();

    if (this.isLoading) return;

    const localeSelect = document.getElementById("locale-select");
    if (!localeSelect) return;

    const selectedIndex = localeSelect.value;
    if (!selectedIndex) {
      this.showError("Por favor, selecione um idioma");
      return;
    }

    try {
      this.isLoading = true;
      this.showLoading(true, "Alterando idioma...");

      const result = await window.modoDevAPI.setLocale(selectedIndex);

      if (result.success) {
        this.showSuccess(`Idioma alterado para ${result.locale.name}`);
        await this.loadLocaleData();
      } else {
        this.showError(result.error || "Erro ao alterar idioma");
      }
    } catch (error) {
      console.error("Erro ao alterar locale:", error);
      this.showError("Erro interno ao alterar idioma");
    } finally {
      this.isLoading = false;
      this.showLoading(false);
    }
  }

  handleLocaleSelectChange() {
    // Opcional: Mostrar preview do idioma selecionado
    const localeSelect = document.getElementById("locale-select");
    const selectedIndex = parseInt(localeSelect.value) - 1;

    if (
      this.availableLocales &&
      selectedIndex >= 0 &&
      selectedIndex < this.availableLocales.length
    ) {
      const selectedLocale = this.availableLocales[selectedIndex];
      console.log("Idioma selecionado:", selectedLocale);
    }
  }

  // ❌ REMOVIDO: método loadGroupModeOnly()

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

    // ❌ REMOVIDO: Atualização do groupMode
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

  // ❌ REMOVIDO: método handleToggleGroupMode()

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

  // ========== CORRIGIDO: Métodos públicos para debug de locale ==========
  getCurrentLocale() {
    return this.currentLocale;
  }

  getAvailableLocales() {
    return this.availableLocales;
  }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener("DOMContentLoaded", () => {
  window.modoDevRenderer = new ModoDevRenderer();
});

// Disponibilizar globalmente para debug
window.ModoDevRenderer = ModoDevRenderer;
