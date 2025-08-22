// renderer/guiScripts/messageRenderer.js
class MessagesManager {
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
    this.btnSaveMessage.addEventListener("click", () => this.saveMessage());
    this.btnClearForm.addEventListener("click", () => this.clearForm());
    this.btnDeleteMessage.addEventListener("click", () => this.deleteMessage());
  }

  async loadInitialData() {
    try {
      await this.loadAvailableOptions();
      await this.loadMessages();
    } catch (error) {
      this.showStatus("Erro ao carregar dados iniciais", "error");
      console.error("Error loading initial data:", error);
    }
  }

  async loadAvailableOptions() {
    try {
      const result = await window.configAPI.getAvailableOptions();

      if (result.success) {
        this.messageTypes = result.data.messageTypes;
        this.locales = result.data.locales;
        this.populateSelect(this.messageTypeSelect, this.messageTypes);
        this.populateSelect(this.messageLocaleSelect, this.locales);
      } else {
        throw new Error(result.error || "Erro ao carregar opções");
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
      optionElement.value = option;
      optionElement.textContent = option;
      selectElement.appendChild(optionElement);
    });
  }

  async loadMessages() {
    try {
      this.showLoading(this.messagesList);
      const result = await window.configAPI.getMessages();

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
        result = await window.configAPI.updateMessage(
          this.currentMessage.id,
          messageData
        );
      } else {
        result = await window.configAPI.addMessage(messageData);
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
      const result = await window.configAPI.deleteMessage(
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
