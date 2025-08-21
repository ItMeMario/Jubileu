// renderer/configRenderer.js
class ConfigManager {
  constructor() {
    this.currentMessage = null;
    this.messages = [];
    this.messageTypes = [];
    this.locales = [];

    this.initializeElements();
    this.setupEventListeners();
    this.loadInitialData();
  }

  initializeElements() {
    // Menu elements
    this.menuItems = document.querySelectorAll(".menu-item");
    this.sections = document.querySelectorAll(".section");

    // Messages elements
    this.messagesList = document.getElementById("messages-list");
    this.messageLocaleSelect = document.getElementById("message-locale");
    this.messageTypeSelect = document.getElementById("message-type");
    this.messageContentTextarea = document.getElementById("message-content");
    this.btnSaveMessage = document.getElementById("btn-save-message");
    this.btnClearForm = document.getElementById("btn-clear-form");
    this.btnDeleteMessage = document.getElementById("btn-delete-message");
    this.statusDiv = document.getElementById("status");
  }

  setupEventListeners() {
    // Menu navigation
    this.menuItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        const section = e.target.dataset.section;
        this.switchSection(section);
      });
    });

    // Message form
    this.btnSaveMessage.addEventListener("click", () => this.saveMessage());
    this.btnClearForm.addEventListener("click", () => this.clearForm());
    this.btnDeleteMessage.addEventListener("click", () => this.deleteMessage());
  }

  switchSection(sectionName) {
    // Update menu
    this.menuItems.forEach((item) => item.classList.remove("active"));
    document
      .querySelector(`[data-section="${sectionName}"]`)
      .classList.add("active");

    // Update sections
    this.sections.forEach((section) => section.classList.remove("active"));
    document.getElementById(`${sectionName}-section`).classList.add("active");

    // Load section data if needed
    if (sectionName === "messages") {
      this.loadMessages();
    }
  }

  async loadInitialData() {
    try {
      await this.loadMessageTypes();
      await this.loadLocales();
      await this.loadMessages();
    } catch (error) {
      this.showStatus("Erro ao carregar dados iniciais", "error");
      console.error("Error loading initial data:", error);
    }
  }

  async loadMessageTypes() {
    try {
      this.messageTypes = await window.configAPI.getMessageTypes();
      this.populateSelect(this.messageTypeSelect, this.messageTypes);
    } catch (error) {
      console.error("Error loading message types:", error);
      this.showStatus("Erro ao carregar tipos de mensagem", "error");
    }
  }

  async loadLocales() {
    try {
      this.locales = await window.configAPI.getLocales();
      this.populateSelect(this.messageLocaleSelect, this.locales);
    } catch (error) {
      console.error("Error loading locales:", error);
      this.showStatus("Erro ao carregar locales", "error");
    }
  }

  populateSelect(selectElement, options) {
    selectElement.innerHTML = '<option value="">Selecione uma opção</option>';
    options.forEach((option) => {
      const optionElement = document.createElement("option");
      optionElement.value = option;
      optionElement.textContent = option;
      selectElement.appendChild(optionElement);
    });
  }

  async loadMessages() {
    try {
      this.showLoading(this.messagesList);
      this.messages = await window.configAPI.getMessages();
      this.renderMessages();
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

    // Add click listeners
    this.messagesList.querySelectorAll(".message-item").forEach((item) => {
      item.addEventListener("click", () => {
        const messageId = parseInt(item.dataset.id);
        this.selectMessage(messageId);
      });
    });
  }

  selectMessage(messageId) {
    // Update UI
    this.messagesList.querySelectorAll(".message-item").forEach((item) => {
      item.classList.remove("selected");
    });
    this.messagesList
      .querySelector(`[data-id="${messageId}"]`)
      .classList.add("selected");

    // Load message data
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

    // Clear selection
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

    // Validation
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

      if (this.currentMessage) {
        // Update existing message
        await window.configAPI.updateMessage(
          this.currentMessage.id,
          messageData
        );
        this.showStatus("Mensagem atualizada com sucesso", "success");
      } else {
        // Add new message
        await window.configAPI.addMessage(messageData);
        this.showStatus("Mensagem adicionada com sucesso", "success");
      }

      await this.loadMessages();
      this.clearForm();
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
      await window.configAPI.deleteMessage(this.currentMessage.id);
      this.showStatus("Mensagem excluída com sucesso", "success");
      await this.loadMessages();
      this.clearForm();
    } catch (error) {
      console.error("Error deleting message:", error);
      this.showStatus("Erro ao excluir mensagem", "error");
    } finally {
      this.hideButtonLoading(this.btnDeleteMessage);
    }
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

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.configManager = new ConfigManager();
});
