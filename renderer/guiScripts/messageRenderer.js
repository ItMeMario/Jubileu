// renderer/guiScripts/messageRenderer.js
class MessagesManager {
  constructor() {
    this.currentMessage = null;
    this.messages = [];
    this.messageTypes = [];
    this.locales = [];
    this.currentCompletenessMode = "all"; // 'all' ou 'specific'

    this.initializeElements();
    this.setupEventListeners();
    this.loadInitialData();
  }

  initializeElements() {
    this.messagesList = document.getElementById("messages-list");
    this.messageLocaleSelect = document.getElementById("message-locale");
    this.messageTypeSelect = document.getElementById("message-type");
    this.messageContentTextarea = document.getElementById("message-content");
    this.btnSaveMessage = document.getElementById("btn-save-message");
    this.btnClearForm = document.getElementById("btn-clear-form");
    this.btnDeleteMessage = document.getElementById("btn-delete-message");
    this.btnCheckCompleteness = document.getElementById(
      "btn-check-completeness"
    );
    this.statusDiv = document.getElementById("status");

    // Elementos da nova interface de completude
    this.btnModeAll = document.getElementById("btn-mode-all");
    this.btnModeSpecific = document.getElementById("btn-mode-specific");
    this.specificLocaleSection = document.getElementById(
      "specific-locale-section"
    );
    this.completenessLocaleSelect = document.getElementById(
      "completeness-locale"
    );
    this.completenessResults = document.getElementById("completeness-results");
    this.completenessContent = document.getElementById("completeness-content");
    this.currentModeIndicator = document.getElementById(
      "current-mode-indicator"
    );
    this.btnText = document.getElementById("btn-text");
    this.resultsModeInfo = document.getElementById("results-mode-info");
  }

  setupEventListeners() {
    // Listeners originais
    this.btnSaveMessage.addEventListener("click", () => this.saveMessage());
    this.btnClearForm.addEventListener("click", () => this.clearForm());
    this.btnDeleteMessage.addEventListener("click", () => this.deleteMessage());

    // Novos listeners para verificação de completude
    if (this.btnModeAll) {
      this.btnModeAll.addEventListener("click", () =>
        this.setCompletenessMode("all")
      );
    }

    if (this.btnModeSpecific) {
      this.btnModeSpecific.addEventListener("click", () =>
        this.setCompletenessMode("specific")
      );
    }

    if (this.btnCheckCompleteness) {
      this.btnCheckCompleteness.addEventListener("click", () =>
        this.checkCompleteness()
      );
    }

    if (this.completenessLocaleSelect) {
      this.completenessLocaleSelect.addEventListener("change", () =>
        this.updateCompletenessButtonText()
      );
    }
  }

  async loadInitialData() {
    try {
      await this.loadAvailableOptions();
      await this.loadMessages();
      this.populateCompletenessLocaleSelect();
    } catch (error) {
      this.showStatus("Erro ao carregar dados iniciais", "error");
      console.error("Error loading initial data:", error);
    }
  }

  async loadAvailableOptions() {
    try {
      // Carrega tipos de mensagem e locales separadamente para maior flexibilidade
      const [typesResult, localesResult] = await Promise.all([
        window.messageAPI.getMessageTypes(),
        window.messageAPI.getMessageLocales(),
      ]);

      if (typesResult.success && localesResult.success) {
        this.messageTypes = typesResult.data || [];
        this.locales = localesResult.data || [];
        this.populateSelect(this.messageTypeSelect, this.messageTypes);
        this.populateSelect(this.messageLocaleSelect, this.locales);
      } else {
        // Fallback para o método antigo se os novos não existirem ainda
        const result = await window.messageAPI.getAvailableOptions();
        if (result.success) {
          this.messageTypes = result.data.messageTypes || [];
          this.locales = result.data.locales || [];
          this.populateSelect(this.messageTypeSelect, this.messageTypes);
          this.populateSelect(this.messageLocaleSelect, this.locales);
        } else {
          throw new Error(result.error || "Erro ao carregar opções");
        }
      }
    } catch (error) {
      console.error("Error loading available options:", error);
      this.showStatus("Erro ao carregar tipos de mensagem e locales", "error");
    }
  }

  populateSelect(selectElement, options) {
    selectElement.innerHTML = '<option value="">Selecione uma opção</option>';
    options.forEach((option) => {
      const optionElement = document.createElement("option");
      // Suporta tanto strings simples quanto objetos {id, name}
      if (typeof option === "object") {
        optionElement.value = option.id || option.value || option;
        optionElement.textContent = option.name || option.label || option;
      } else {
        optionElement.value = option;
        optionElement.textContent = option;
      }
      selectElement.appendChild(optionElement);
    });
  }

  populateCompletenessLocaleSelect() {
    if (!this.completenessLocaleSelect || !this.locales) return;

    this.completenessLocaleSelect.innerHTML =
      '<option value="">Selecione um locale...</option>';
    this.locales.forEach((locale) => {
      const option = document.createElement("option");
      option.value = locale;
      option.textContent = locale;
      this.completenessLocaleSelect.appendChild(option);
    });
  }

  setCompletenessMode(mode) {
    this.currentCompletenessMode = mode;

    // Atualiza botões de modo
    if (this.btnModeAll && this.btnModeSpecific) {
      this.btnModeAll.classList.remove("active");
      this.btnModeSpecific.classList.remove("active");

      if (mode === "all") {
        this.btnModeAll.classList.add("active");
      } else {
        this.btnModeSpecific.classList.add("active");
      }
    }

    // Mostra/esconde seção de locale específico
    if (this.specificLocaleSection) {
      if (mode === "specific") {
        this.specificLocaleSection.style.display = "block";
      } else {
        this.specificLocaleSection.style.display = "none";
      }
    }

    this.updateModeIndicator();
    this.updateCompletenessButtonText();
  }

  updateModeIndicator() {
    if (!this.currentModeIndicator) return;

    const badge = this.currentModeIndicator.querySelector(".mode-badge");
    if (badge) {
      badge.classList.remove("active", "specific");

      if (this.currentCompletenessMode === "all") {
        badge.classList.add("active");
        badge.innerHTML = "🌐 Modo: Todos os Locales";
      } else {
        badge.classList.add("specific");
        badge.innerHTML = "🎯 Modo: Locale Específico";
      }
    }
  }

  updateCompletenessButtonText() {
    if (!this.btnCheckCompleteness || !this.btnText) return;

    if (this.currentCompletenessMode === "all") {
      this.btnText.textContent = "Verificar Todos os Locales";
      this.btnCheckCompleteness.disabled = false;
    } else {
      const selectedLocale = this.completenessLocaleSelect?.value;
      if (selectedLocale) {
        this.btnText.textContent = `Verificar ${selectedLocale}`;
        this.btnCheckCompleteness.disabled = false;
      } else {
        this.btnText.textContent = "Selecione um Locale";
        this.btnCheckCompleteness.disabled = true;
      }
    }
  }

  async checkCompleteness() {
    if (
      !this.btnCheckCompleteness ||
      !this.completenessResults ||
      !this.completenessContent
    )
      return;

    try {
      // Estado de loading
      this.btnCheckCompleteness.disabled = true;
      this.btnCheckCompleteness.innerHTML =
        '<div class="loading"></div> Verificando...';

      // Determina qual locale verificar
      let specificLocale = null;
      if (this.currentCompletenessMode === "specific") {
        specificLocale = this.completenessLocaleSelect?.value;
        if (!specificLocale) {
          throw new Error("Selecione um locale para verificação específica");
        }
      }

      // Chama o backend
      const result = await window.messageAPI.checkMessageCompleteness(
        specificLocale
      );

      if (result.success) {
        // Atualiza info do modo
        if (this.resultsModeInfo) {
          if (specificLocale) {
            this.resultsModeInfo.textContent = `Verificação específica: ${specificLocale}`;
          } else {
            this.resultsModeInfo.textContent =
              "Verificação completa de todos os locales";
          }
        }

        // Renderiza os resultados
        this.renderCompletenessResults(result.data, specificLocale);

        // Mostra a área de resultados
        this.completenessResults.style.display = "block";
        this.completenessResults.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      } else {
        throw new Error(result.error || "Erro desconhecido");
      }
    } catch (error) {
      console.error("Erro ao verificar completude:", error);

      if (this.completenessContent) {
        this.completenessContent.innerHTML = `
          <div class="completeness-summary error">
            <h4>❌ Erro na Verificação</h4>
            <p>${error.message}</p>
          </div>
        `;
        this.completenessResults.style.display = "block";
      }
    } finally {
      // Restaura o botão
      this.btnCheckCompleteness.disabled = false;
      this.updateCompletenessButtonText();
      const iconSpan = '<span class="icon">🔍</span>';
      const textSpan = `<span id="btn-text">${
        this.btnText?.textContent || "Verificar"
      }</span>`;
      this.btnCheckCompleteness.innerHTML = iconSpan + textSpan;
    }
  }

  renderCompletenessResults(data, specificLocale) {
    if (!this.completenessContent) return;

    let html = "";

    if (specificLocale) {
      // Renderizar resultado específico
      html = this.renderSpecificLocaleResult(data);
    } else {
      // Renderizar resultado completo
      html = this.renderCompleteResult(data);
    }

    this.completenessContent.innerHTML = html;
  }

  renderSpecificLocaleResult(data) {
    const { locale, stats, messageTypes } = data;
    const isComplete = stats.percentage === 100;

    return `
      <div class="completeness-summary ${isComplete ? "" : "incomplete"}">
        <h4>${isComplete ? "✅" : "⚠️"} Completude do Locale: ${locale}</h4>
        <p>${
          isComplete
            ? "Todas as mensagens estão configuradas!"
            : "Algumas mensagens ainda precisam ser configuradas."
        }</p>

        <div class="summary-stats">
          <div class="stat-item">
            <span class="stat-number">${stats.existing}</span>
            <span class="stat-label">Configuradas</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">${stats.total}</span>
            <span class="stat-label">Total Necessárias</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">${stats.percentage.toFixed(1)}%</span>
            <span class="stat-label">Completude</span>
          </div>
        </div>

        ${
          stats.missing.length > 0
            ? `
          <div class="missing-messages">
            <h5>❌ Tipos de Mensagem Faltantes (${stats.missing.length}):</h5>
            ${stats.missing
              .map(
                (type) => `
              <div class="missing-item">
                <strong>${type}</strong>
              </div>
            `
              )
              .join("")}
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  renderCompleteResult(data) {
    const { summary, byLocale, missing } = data;
    const isComplete = summary.completionPercentage === 100;

    let html = `
      <div class="completeness-summary ${isComplete ? "" : "incomplete"}">
        <h4>${isComplete ? "🎉" : "📊"} Resumo Geral</h4>
        <p>${
          isComplete
            ? "Todas as mensagens estão configuradas para todos os locales!"
            : "Algumas mensagens ainda precisam ser configuradas."
        }</p>

        <div class="summary-stats">
          <div class="stat-item">
            <span class="stat-number">${summary.totalLocales}</span>
            <span class="stat-label">Locales</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">${summary.totalMessageTypes}</span>
            <span class="stat-label">Tipos de Mensagem</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">${summary.totalExistingMessages}</span>
            <span class="stat-label">Configuradas</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">${summary.completionPercentage.toFixed(
              1
            )}%</span>
            <span class="stat-label">Completude Geral</span>
          </div>
        </div>
      </div>
    `;

    // Adiciona detalhes por locale
    Object.entries(byLocale).forEach(([locale, stats]) => {
      const localeComplete = stats.percentage === 100;
      html += `
        <div class="locale-section">
          <div class="locale-header">
            ${localeComplete ? "✅" : "⚠️"} ${locale}
            <span class="status-badge ${
              localeComplete ? "complete" : "incomplete"
            }">
              ${stats.percentage.toFixed(1)}%
            </span>
          </div>
          <div class="locale-content">
            <p><strong>Progresso:</strong> ${stats.existing}/${
        stats.total
      } mensagens</p>
            ${
              stats.missing.length > 0
                ? `
              <p><strong>Faltando:</strong> ${stats.missing.join(", ")}</p>
            `
                : "<p><strong>Status:</strong> Completo! ✅</p>"
            }
          </div>
        </div>
      `;
    });

    return html;
  }

  async loadMessages() {
    try {
      this.showLoading(this.messagesList);
      const result = await window.messageAPI.getMessages();

      if (result.success) {
        this.messages = result.data || [];
        this.renderMessages();
      } else {
        throw new Error(result.error || "Erro ao carregar mensagens");
      }
    } catch (error) {
      console.error("Error loading messages:", error);
      this.showStatus("Erro ao carregar mensagens", "error");
      this.messagesList.innerHTML =
        '<div class="empty-state">Erro ao carregar mensagens</div>';
    }
  }

  renderMessages() {
    if (!this.messages || this.messages.length === 0) {
      this.messagesList.innerHTML =
        '<div class="empty-state">Nenhuma mensagem encontrada</div>';
      return;
    }

    this.messagesList.innerHTML = this.messages
      .map(
        (message) => `
            <div class="message-item" data-id="${message.id}">
                <div class="message-header">
                    <div class="message-meta">#${message.id} • ${
          message.locale
        } • ${message.message_type}</div>
                </div>
                <div class="message-content">${this.truncateText(
                  message.message_content,
                  100
                )}</div>
            </div>
        `
      )
      .join("");

    this.messagesList.querySelectorAll(".message-item").forEach((item) => {
      item.addEventListener("click", () => {
        const messageId = parseInt(item.dataset.id);
        this.selectMessage(messageId);
      });
    });
  }

  selectMessage(messageId) {
    this.messagesList.querySelectorAll(".message-item").forEach((item) => {
      item.classList.remove("selected");
    });
    this.messagesList
      .querySelector(`[data-id="${messageId}"]`)
      .classList.add("selected");

    const message = this.messages.find((m) => m.id === messageId);
    if (message) {
      this.currentMessage = message;
      this.loadMessageToForm(message);
      this.btnDeleteMessage.style.display = "inline-block";
      this.btnSaveMessage.textContent = "Atualizar Mensagem";
    }
  }

  loadMessageToForm(message) {
    this.messageLocaleSelect.value = message.locale;
    this.messageTypeSelect.value = message.message_type;
    this.messageContentTextarea.value = message.message_content;
  }

  clearForm() {
    this.currentMessage = null;
    this.messageLocaleSelect.value = "";
    this.messageTypeSelect.value = "";
    this.messageContentTextarea.value = "";
    this.btnDeleteMessage.style.display = "none";
    this.btnSaveMessage.textContent = "Salvar Mensagem";

    this.messagesList.querySelectorAll(".message-item").forEach((item) => {
      item.classList.remove("selected");
    });
  }

  async saveMessage() {
    const messageData = {
      locale: this.messageLocaleSelect.value,
      message_type: this.messageTypeSelect.value,
      message_content: this.messageContentTextarea.value.trim(),
    };

    if (
      !messageData.locale ||
      !messageData.message_type ||
      !messageData.message_content
    ) {
      this.showStatus("Todos os campos são obrigatórios", "error");
      return;
    }

    try {
      this.showButtonLoading(this.btnSaveMessage);

      let result;
      if (this.currentMessage) {
        result = await window.messageAPI.updateMessage(
          this.currentMessage.id,
          messageData
        );
      } else {
        result = await window.messageAPI.addMessage(messageData);
      }

      if (result.success) {
        this.showStatus(result.message, "success");
        await this.loadMessages();
        this.clearForm();
      } else {
        this.showStatus(result.error || "Erro ao salvar mensagem", "error");
      }
    } catch (error) {
      console.error("Error saving message:", error);
      this.showStatus("Erro ao salvar mensagem", "error");
    } finally {
      this.hideButtonLoading(this.btnSaveMessage);
    }
  }

  async deleteMessage() {
    if (!this.currentMessage) return;

    if (
      !confirm(
        `Tem certeza que deseja excluir a mensagem #${this.currentMessage.id}?`
      )
    ) {
      return;
    }

    try {
      this.showButtonLoading(this.btnDeleteMessage);
      const result = await window.messageAPI.deleteMessage(
        this.currentMessage.id
      );

      if (result.success) {
        this.showStatus(result.message, "success");
        await this.loadMessages();
        this.clearForm();
      } else {
        this.showStatus(result.error || "Erro ao excluir mensagem", "error");
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      this.showStatus("Erro ao excluir mensagem", "error");
    } finally {
      this.hideButtonLoading(this.btnDeleteMessage);
    }
  }

  // Métodos antigos do modal mantidos para compatibilidade
  async showCompletenessDialog() {
    const modal = this.createCompletenessModal();
    document.body.appendChild(modal);

    // Event listeners do modal
    const btnAllLocales = modal.querySelector("#btn-check-all-locales");
    const btnSpecificLocale = modal.querySelector("#btn-check-specific-locale");
    const btnCloseModal = modal.querySelector("#btn-close-modal");

    btnAllLocales.addEventListener("click", () => this.checkAllLocales(modal));
    btnSpecificLocale.addEventListener("click", () =>
      this.checkSpecificLocale(modal)
    );
    btnCloseModal.addEventListener("click", () => this.closeModal(modal));

    // Fechar modal ao clicar fora
    modal.addEventListener("click", (e) => {
      if (e.target === modal) this.closeModal(modal);
    });
  }

  createCompletenessModal() {
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-content">
        <h3>Verificar Completude das Mensagens</h3>
        <p>Escolha como deseja verificar a completude:</p>
        
        <div class="modal-buttons">
          <button id="btn-check-all-locales" class="btn btn-primary">
            Todos os Locales
          </button>
          <button id="btn-check-specific-locale" class="btn btn-secondary">
            Locale Específico
          </button>
        </div>
        
        <div id="locale-selector" class="locale-selector hidden">
          <label for="modal-locale-select">Escolha o locale:</label>
          <select id="modal-locale-select">
            ${this.locales
              .map((locale) => `<option value="${locale}">${locale}</option>`)
              .join("")}
          </select>
          <button id="btn-check-selected-locale" class="btn btn-primary">
            Verificar
          </button>
        </div>
        
        <div id="completeness-results" class="completeness-results hidden"></div>
        
        <button id="btn-close-modal" class="btn btn-close">Fechar</button>
      </div>
    `;
    return modal;
  }

  async checkAllLocales(modal) {
    const resultsDiv = modal.querySelector("#completeness-results");
    resultsDiv.innerHTML = '<div class="loading">Carregando...</div>';
    resultsDiv.classList.remove("hidden");

    try {
      const result = await window.messageAPI.checkMessageCompleteness();

      if (result.success) {
        this.renderAllLocalesResults(resultsDiv, result.data);
      } else {
        resultsDiv.innerHTML = `<div class="error">Erro: ${result.error}</div>`;
      }
    } catch (error) {
      console.error("Error checking completeness:", error);
      resultsDiv.innerHTML = `<div class="error">Erro ao verificar completude</div>`;
    }
  }

  async checkSpecificLocale(modal) {
    const localeSelector = modal.querySelector("#locale-selector");
    localeSelector.classList.remove("hidden");

    const btnCheckSelected = modal.querySelector("#btn-check-selected-locale");
    btnCheckSelected.addEventListener("click", async () => {
      const selectedLocale = modal.querySelector("#modal-locale-select").value;
      const resultsDiv = modal.querySelector("#completeness-results");

      resultsDiv.innerHTML = '<div class="loading">Carregando...</div>';
      resultsDiv.classList.remove("hidden");

      try {
        const result = await window.messageAPI.checkMessageCompleteness(
          selectedLocale
        );

        if (result.success) {
          this.renderSpecificLocaleResults(
            resultsDiv,
            result.data,
            selectedLocale
          );
        } else {
          resultsDiv.innerHTML = `<div class="error">Erro: ${result.error}</div>`;
        }
      } catch (error) {
        console.error("Error checking specific locale:", error);
        resultsDiv.innerHTML = `<div class="error">Erro ao verificar completude</div>`;
      }
    });
  }

  renderAllLocalesResults(container, data) {
    const { summary, byLocale, missing } = data;

    container.innerHTML = `
      <div class="completeness-summary">
        <h4>Resumo Geral</h4>
        <div class="summary-stats">
          <div class="stat">
            <span class="stat-label">Completude Geral:</span>
            <span class="stat-value">${summary.completionPercentage.toFixed(
              1
            )}%</span>
          </div>
          <div class="stat">
            <span class="stat-label">Mensagens:</span>
            <span class="stat-value">${summary.totalExistingMessages}/${
      summary.totalExpectedMessages
    }</span>
          </div>
        </div>
      </div>
      
      <div class="locales-breakdown">
        <h4>Por Locale</h4>
        ${Object.entries(byLocale)
          .map(
            ([locale, stats]) => `
          <div class="locale-item ${
            stats.percentage === 100 ? "complete" : "incomplete"
          }">
            <div class="locale-header">
              <span class="locale-name">${locale}</span>
              <span class="locale-percentage">${stats.percentage.toFixed(
                1
              )}%</span>
            </div>
            ${
              stats.missing.length > 0
                ? `
              <div class="missing-types">
                Faltando: ${stats.missing.join(", ")}
              </div>
            `
                : '<div class="complete-badge">✓ Completo</div>'
            }
          </div>
        `
          )
          .join("")}
      </div>
      
      ${
        missing.length > 0
          ? `
        <div class="missing-messages">
          <h4>Mensagens Faltantes (${missing.length})</h4>
          <div class="missing-list">
            ${missing
              .map(
                (item) => `
              <div class="missing-item">${item.locale} → ${item.messageType}</div>
            `
              )
              .join("")}
          </div>
        </div>
      `
          : '<div class="all-complete">🎉 Todas as mensagens estão completas!</div>'
      }
    `;
  }

  renderSpecificLocaleResults(container, data, locale) {
    const { stats } = data;

    container.innerHTML = `
      <div class="specific-locale-results">
        <h4>Completude do Locale: ${locale}</h4>
        
        <div class="locale-stats">
          <div class="stat">
            <span class="stat-label">Completude:</span>
            <span class="stat-value">${stats.percentage.toFixed(1)}%</span>
          </div>
          <div class="stat">
            <span class="stat-label">Cadastradas:</span>
            <span class="stat-value">${stats.existing}/${stats.total}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Faltantes:</span>
            <span class="stat-value">${stats.missing.length}</span>
          </div>
        </div>
        
        ${
          stats.missing.length > 0
            ? `
          <div class="missing-types-detail">
            <h5>Tipos de Mensagem Faltantes:</h5>
            <div class="missing-types-list">
              ${stats.missing
                .map(
                  (type) => `
                <div class="missing-type-item">⚠ ${type}</div>
              `
                )
                .join("")}
            </div>
          </div>
        `
            : '<div class="complete-badge">🎉 Todas as mensagens estão cadastradas para este locale!</div>'
        }
      </div>
    `;
  }

  closeModal(modal) {
    document.body.removeChild(modal);
  }

  showLoading(element) {
    element.innerHTML =
      '<div class="empty-state"><div class="loading"></div>Carregando...</div>';
  }

  showButtonLoading(button) {
    const originalText = button.textContent;
    button.innerHTML = '<div class="loading"></div>' + originalText;
    button.disabled = true;
    button.dataset.originalText = originalText;
  }

  hideButtonLoading(button) {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }

  showStatus(message, type) {
    this.statusDiv.textContent = message;
    this.statusDiv.className = `status-message ${type} show`;

    setTimeout(() => {
      this.statusDiv.classList.remove("show");
    }, 3000);
  }

  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }
}

// Inicializa quando o DOM estiver pronto
document.addEventListener("DOMContentLoaded", () => {
  window.messagesManager = new MessagesManager();
});
