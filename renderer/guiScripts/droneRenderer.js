// renderer/guiConfig/droneRenderer.js

class DroneManager {
  constructor() {
    this.selectedMessageIndex = null;
    this.selectedMessageData = null;
    this.allMessages = []; // Armazena todas as mensagens carregadas
    this.currentNumbers = [];
    this.currentFile = null;
    this.isDisparoRunning = false;

    this.initializeElements();
    this.setupEventListeners();
    this.loadInitialData();
  }

  initializeElements() {
    // Menu items
    this.menuItems = document.querySelectorAll(".menu-item");
    this.sections = document.querySelectorAll(".section");

    // Status message
    this.statusDiv = document.getElementById("status");

    // Mensagens
    this.messagesList = document.getElementById("messages-list");
    this.selectedMessageInfo = document.getElementById("selected-message-info");
    this.previewLocale = document.getElementById("preview-locale");
    this.previewContent = document.getElementById("preview-content");

    // Números - Stats
    this.statTotal = document.getElementById("stat-total");
    this.statBr = document.getElementById("stat-br");
    this.statInt = document.getElementById("stat-int");

    // Números - Tabs
    this.tabBtns = document.querySelectorAll(".tab-btn");
    this.tabContents = document.querySelectorAll(".tab-content");

    // Números - Manual
    this.numbersInput = document.getElementById("numbers-input");
    this.btnAddNumbers = document.getElementById("btn-add-numbers");
    this.btnClearInput = document.getElementById("btn-clear-input");

    // Números - File
    this.fileUploadArea = document.getElementById("file-upload-area");
    this.fileInput = document.getElementById("file-input");
    this.fileInfo = document.getElementById("file-info");
    this.fileName = document.getElementById("file-name");
    this.fileCount = document.getElementById("file-count");
    this.btnRemoveFile = document.getElementById("btn-remove-file");
    this.btnImportFile = document.getElementById("btn-import-file");

    // Números - Lista
    this.numbersList = document.getElementById("numbers-list");
    this.btnClearAll = document.getElementById("btn-clear-all");

    // Disparo
    this.requirementsCheck = document.getElementById("requirements-check");
    this.reqWhatsapp = document.getElementById("req-whatsapp");
    this.reqMessage = document.getElementById("req-message");
    this.reqNumbers = document.getElementById("req-numbers");
    this.messageSelect = document.getElementById("message-select");
    this.batchSize = document.getElementById("batch-size");
    this.summaryTotal = document.getElementById("summary-total");
    this.summaryBatches = document.getElementById("summary-batches");
    this.btnExecuteDisparo = document.getElementById("btn-execute-disparo");

    // Disparo - Progress
    this.disparoProgress = document.getElementById("disparo-progress");
    this.progressFill = document.getElementById("progress-fill");
    this.progressText = document.getElementById("progress-text");
    this.progressSent = document.getElementById("progress-sent");
    this.progressFailed = document.getElementById("progress-failed");
    this.progressBatch = document.getElementById("progress-batch");

    // Disparo - Results
    this.disparoResults = document.getElementById("disparo-results");
    this.resultsContent = document.getElementById("results-content");

    // Status
    this.whatsappStatus = document.getElementById("whatsapp-status");
    this.statusTotal = document.getElementById("status-total");
    this.statusMessages = document.getElementById("status-messages");
    this.btnRefreshStatus = document.getElementById("btn-refresh-status");
  }

  setupEventListeners() {
    // Menu navigation
    this.menuItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        const section = e.target.dataset.section;
        this.switchSection(section);
      });
    });

    // Tabs
    this.tabBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const tab = e.target.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Números - Manual
    this.btnAddNumbers.addEventListener("click", () => this.addNumbersManual());
    this.btnClearInput.addEventListener("click", () => {
      this.numbersInput.value = "";
    });

    // Números - File Upload
    this.fileUploadArea.addEventListener("click", () => {
      this.fileInput.click();
    });

    this.fileInput.addEventListener("change", (e) => {
      this.handleFileSelect(e.target.files[0]);
    });

    this.fileUploadArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      this.fileUploadArea.classList.add("dragover");
    });

    this.fileUploadArea.addEventListener("dragleave", () => {
      this.fileUploadArea.classList.remove("dragover");
    });

    this.fileUploadArea.addEventListener("drop", (e) => {
      e.preventDefault();
      this.fileUploadArea.classList.remove("dragover");
      const file = e.dataTransfer.files[0];
      this.handleFileSelect(file);
    });

    this.btnRemoveFile.addEventListener("click", () => this.removeFile());
    this.btnImportFile.addEventListener("click", () => this.importFile());

    // Números - Clear All
    this.btnClearAll.addEventListener("click", () => this.clearAllNumbers());

    // Disparo - EVENTO PRINCIPAL DE SELEÇÃO DE MENSAGEM
    this.messageSelect.addEventListener("change", (e) => {
      this.selectMessageFromDisparo();
    });

    this.batchSize.addEventListener("input", () => this.updateDisparoSummary());
    this.btnExecuteDisparo.addEventListener("click", () =>
      this.executeDisparo()
    );

    // Status
    this.btnRefreshStatus.addEventListener("click", () => this.refreshStatus());
  }

  async loadInitialData() {
    await this.loadMessages();
    await this.loadNumbers();
    await this.checkRequirements();
  }

  // ========================================
  // NAVEGAÇÃO
  // ========================================

  switchSection(sectionName) {
    this.menuItems.forEach((item) => item.classList.remove("active"));
    document
      .querySelector(`[data-section="${sectionName}"]`)
      .classList.add("active");

    this.sections.forEach((section) => section.classList.remove("active"));
    document.getElementById(`${sectionName}-section`).classList.add("active");

    // Carrega dados específicos da seção
    if (sectionName === "mensagens") {
      this.loadMessages();
    } else if (sectionName === "numeros") {
      this.loadNumbers();
      this.loadStatistics();
    } else if (sectionName === "disparo") {
      this.checkRequirements();
      this.loadMessagesForSelect();
      this.updateDisparoSummary();
    } else if (sectionName === "status") {
      this.refreshStatus();
    }
  }

  switchTab(tabName) {
    this.tabBtns.forEach((btn) => btn.classList.remove("active"));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add("active");

    this.tabContents.forEach((content) => content.classList.remove("active"));
    document.getElementById(`${tabName}-tab`).classList.add("active");
  }

  // ========================================
  // MENSAGENS
  // ========================================

  async loadMessages() {
    try {
      const result = await window.droneAPI.listarMensagens();

      if (!result.success) {
        this.showStatus(result.error || "Erro ao carregar mensagens", "error");
        return;
      }

      if (!result.mensagens || result.mensagens.length === 0) {
        this.messagesList.innerHTML =
          '<div class="empty-state">Nenhuma mensagem disponível</div>';
        return;
      }

      // Armazena as mensagens para uso posterior
      this.allMessages = result.mensagens;
      this.renderMessages(result.mensagens);
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
      this.showStatus("Erro ao carregar mensagens", "error");
    }
  }

  renderMessages(mensagens) {
    // Renderiza as mensagens apenas para VISUALIZAÇÃO (sem seleção)
    this.messagesList.innerHTML = mensagens
      .map(
        (msg) => `
      <div class="message-item" data-index="${msg.indice}" data-id="${msg.id}">
        <div class="message-header">
          <span class="message-locale">${msg.locale}</span>
          <span class="message-index">#${msg.indice}</span>
        </div>
        <div class="message-content">${this.escapeHtml(msg.conteudo)}</div>
      </div>
    `
      )
      .join("");

    // NÃO adiciona event listeners - apenas visualização
    // A seleção agora acontece apenas na seção de Disparo
  }

  // ========================================
  // NÚMEROS
  // ========================================

  async loadNumbers() {
    try {
      const result = await window.droneAPI.listarNumerosAtuais();

      if (!result.success) {
        this.showStatus(result.error || "Erro ao carregar números", "error");
        return;
      }

      this.currentNumbers = result.numeros || [];
      this.renderNumbers(this.currentNumbers);
      this.updateNumbersCount();
    } catch (error) {
      console.error("Erro ao carregar números:", error);
      this.showStatus("Erro ao carregar números", "error");
    }
  }

  renderNumbers(numeros) {
    if (!numeros || numeros.length === 0) {
      this.numbersList.innerHTML =
        '<div class="empty-state">Nenhum número cadastrado</div>';
      return;
    }

    this.numbersList.innerHTML = numeros
      .map(
        (num) => `
      <div class="number-item" data-id="${num.id}">
        <div class="number-info">
          <div class="number-value">${num.numeroWhatsapp}</div>
          <div class="number-meta">
            <span class="number-type">${num.tipo}</span>
            <span>${num.dataFormatada}</span>
          </div>
        </div>
        <button class="btn-remove" data-id="${num.id}">Remover</button>
      </div>
    `
      )
      .join("");

    // Add remove listeners
    document.querySelectorAll(".btn-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        this.removeNumber(id);
      });
    });
  }

  async addNumbersManual() {
    const input = this.numbersInput.value.trim();

    if (!input) {
      this.showStatus("Digite pelo menos um número", "error");
      return;
    }

    try {
      const result = await window.droneAPI.adicionarNumeros(input);

      if (result.success) {
        this.showStatus(
          `${result.adicionados.length} número(s) adicionado(s)`,
          "success"
        );
        this.numbersInput.value = "";
        await this.loadNumbers();
        await this.loadStatistics();
      } else {
        this.showStatus(result.error || "Erro ao adicionar números", "error");
      }

      // Show errors if any
      if (result.erros && result.erros.length > 0) {
        console.warn("Erros ao adicionar alguns números:", result.erros);
      }
    } catch (error) {
      console.error("Erro ao adicionar números:", error);
      this.showStatus("Erro ao adicionar números", "error");
    }
  }

  handleFileSelect(file) {
    if (!file) return;

    const validTypes = [".txt", ".csv", "text/plain", "text/csv"];
    const ext = "." + file.name.split(".").pop().toLowerCase();

    if (!validTypes.includes(ext) && !validTypes.includes(file.type)) {
      this.showStatus("Arquivo inválido. Use TXT ou CSV", "error");
      return;
    }

    this.currentFile = file;
    this.fileName.textContent = file.name;
    this.fileInfo.style.display = "block";
    this.btnImportFile.disabled = false;

    // Read and count numbers
    window.fileAPI.readFile(file).then((result) => {
      if (result.success) {
        const parsed = window.fileAPI.parseNumbers(result.content);
        this.fileCount.textContent = `${parsed.total} números encontrados`;
      }
    });
  }

  removeFile() {
    this.currentFile = null;
    this.fileInfo.style.display = "none";
    this.btnImportFile.disabled = true;
    this.fileInput.value = "";
  }

  async importFile() {
    if (!this.currentFile) return;

    try {
      const fileResult = await window.fileAPI.readFile(this.currentFile);

      if (!fileResult.success) {
        this.showStatus("Erro ao ler arquivo", "error");
        return;
      }

      const parsed = window.fileAPI.parseNumbers(fileResult.content);

      if (!parsed.success || parsed.numbers.length === 0) {
        this.showStatus("Nenhum número válido encontrado no arquivo", "error");
        return;
      }

      const result = await window.droneAPI.adicionarNumeros(parsed.numbers);

      if (result.success) {
        this.showStatus(
          `${result.adicionados.length} número(s) importado(s)`,
          "success"
        );
        this.removeFile();
        await this.loadNumbers();
        await this.loadStatistics();
      } else {
        this.showStatus(result.error || "Erro ao importar números", "error");
      }
    } catch (error) {
      console.error("Erro ao importar arquivo:", error);
      this.showStatus("Erro ao importar arquivo", "error");
    }
  }

  async removeNumber(id) {
    try {
      const result = await window.droneAPI.removerNumero(id);

      if (result.success) {
        this.showStatus("Número removido", "success");
        await this.loadNumbers();
        await this.loadStatistics();
      } else {
        this.showStatus(result.error || "Erro ao remover número", "error");
      }
    } catch (error) {
      console.error("Erro ao remover número:", error);
      this.showStatus("Erro ao remover número", "error");
    }
  }

  async clearAllNumbers() {
    if (!confirm("Tem certeza que deseja remover TODOS os números?")) {
      return;
    }

    try {
      const result = await window.droneAPI.limparListaCompleta();

      if (result.success) {
        this.showStatus(
          `${result.totalRemovidos} número(s) removido(s)`,
          "success"
        );
        await this.loadNumbers();
        await this.loadStatistics();
      } else {
        this.showStatus(result.error || "Erro ao limpar lista", "error");
      }
    } catch (error) {
      console.error("Erro ao limpar lista:", error);
      this.showStatus("Erro ao limpar lista", "error");
    }
  }

  async loadStatistics() {
    try {
      const result = await window.droneAPI.obterEstatisticasNumeros();

      if (result.success && result.estatisticas) {
        const stats = result.estatisticas;
        this.statTotal.textContent = stats.total || 0;
        this.statBr.textContent = stats.porTipo?.brazilian || 0;
        this.statInt.textContent = stats.porTipo?.international || 0;
      }
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  }

  updateNumbersCount() {
    if (this.summaryTotal) {
      this.summaryTotal.textContent = this.currentNumbers.length;
    }
    if (this.statusTotal) {
      this.statusTotal.textContent = this.currentNumbers.length;
    }
  }

  // ========================================
  // DISPARO
  // ========================================

  async checkRequirements() {
    try {
      // Check WhatsApp
      const statusResult = await window.droneAPI.obterStatusCliente();
      this.updateRequirement(
        this.reqWhatsapp,
        statusResult.conectado,
        statusResult.statusTexto || "Verificando..."
      );

      // Check Message
      const hasMessage = this.selectedMessageIndex !== null;
      this.updateRequirement(
        this.reqMessage,
        hasMessage,
        hasMessage ? "Mensagem selecionada" : "Selecione uma mensagem"
      );

      // Check Numbers
      const numbersResult = await window.droneAPI.listarNumerosAtuais();
      const hasNumbers = numbersResult.success && numbersResult.total > 0;
      this.updateRequirement(
        this.reqNumbers,
        hasNumbers,
        hasNumbers
          ? `${numbersResult.total} número(s) cadastrado(s)`
          : "Adicione números"
      );

      // Enable/disable execute button
      const canExecute = statusResult.conectado && hasMessage && hasNumbers;
      this.btnExecuteDisparo.disabled = !canExecute;
    } catch (error) {
      console.error("Erro ao verificar requisitos:", error);
    }
  }

  updateRequirement(element, isValid, text) {
    const icon = element.querySelector(".req-icon");
    const textEl = element.querySelector(".req-text");

    if (isValid) {
      icon.textContent = "✅";
      element.classList.add("valid");
      element.classList.remove("invalid");
    } else {
      icon.textContent = "❌";
      element.classList.add("invalid");
      element.classList.remove("valid");
    }

    textEl.textContent = text;
  }

  async loadMessagesForSelect() {
    try {
      const result = await window.droneAPI.listarMensagens();

      if (result.success && result.mensagens) {
        // Armazena as mensagens
        this.allMessages = result.mensagens;

        // Popula o select
        this.messageSelect.innerHTML =
          '<option value="">Selecione uma mensagem...</option>' +
          result.mensagens
            .map(
              (msg) =>
                `<option value="${msg.indice}">#${msg.indice} - (${
                  msg.locale
                }) ${msg.conteudo.substring(0, 50)}...</option>`
            )
            .join("");

        // Se já tinha uma mensagem selecionada, mantém a seleção
        if (this.selectedMessageIndex !== null) {
          this.messageSelect.value = this.selectedMessageIndex;
        }

        if (this.statusMessages) {
          this.statusMessages.textContent = result.mensagens.length;
        }
      }
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
    }
  }

  // NOVA FUNÇÃO: Seleciona mensagem através do select na seção Disparo
  selectMessageFromDisparo() {
    const selectedIndex = parseInt(this.messageSelect.value);

    if (!selectedIndex || isNaN(selectedIndex)) {
      // Desseleciona se não houver valor válido
      this.selectedMessageIndex = null;
      this.selectedMessageData = null;
      this.checkRequirements();
      this.updateDisparoSummary();
      return;
    }

    // Encontra a mensagem selecionada
    const selectedMessage = this.allMessages.find(
      (m) => m.indice === selectedIndex
    );

    if (selectedMessage) {
      this.selectedMessageIndex = selectedIndex;
      this.selectedMessageData = selectedMessage;

      this.showStatus(`Mensagem #${selectedIndex} selecionada`, "success");

      // Atualiza os requisitos e resumo
      this.checkRequirements();
      this.updateDisparoSummary();
    } else {
      console.error("Mensagem não encontrada:", selectedIndex);
      this.showStatus("Erro ao selecionar mensagem", "error");
    }
  }

  updateDisparoSummary() {
    const batchSize = parseInt(this.batchSize.value) || 200;
    const totalNumbers = this.currentNumbers.length;

    this.summaryTotal.textContent = totalNumbers;
    this.summaryBatches.textContent = Math.ceil(totalNumbers / batchSize);
  }

  async executeDisparo() {
    if (this.isDisparoRunning) {
      this.showStatus("Disparo já em andamento", "error");
      return;
    }

    const selectedIndex = this.selectedMessageIndex;
    const batchSize = parseInt(this.batchSize.value) || 200;

    if (!selectedIndex) {
      this.showStatus("Selecione uma mensagem", "error");
      return;
    }

    if (
      !confirm(`Executar disparo para ${this.currentNumbers.length} números?`)
    ) {
      return;
    }

    this.isDisparoRunning = true;
    this.btnExecuteDisparo.disabled = true;
    this.disparoProgress.style.display = "block";
    this.disparoResults.style.display = "none";

    try {
      const result = await window.droneAPI.executarDisparoDrone(
        selectedIndex,
        batchSize
      );

      this.isDisparoRunning = false;
      this.btnExecuteDisparo.disabled = false;

      if (result.success) {
        this.showDisparoResults(result);
        this.showStatus("Disparo concluído", "success");
      } else {
        this.showStatus(result.error || "Erro no disparo", "error");
      }
    } catch (error) {
      console.error("Erro ao executar disparo:", error);
      this.showStatus("Erro ao executar disparo", "error");
      this.isDisparoRunning = false;
      this.btnExecuteDisparo.disabled = false;
    } finally {
      this.disparoProgress.style.display = "none";
    }
  }

  showDisparoResults(result) {
    const details = result.detalhes;

    this.resultsContent.innerHTML = `
      <div class="summary-grid">
        <div class="summary-item">
          <span class="summary-label">Total enviados:</span>
          <span class="summary-value">${details.totalEnviados || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Total de falhas:</span>
          <span class="summary-value">${details.totalFalhas || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Batches processados:</span>
          <span class="summary-value">${details.batchesProcessados || 0}/${
      details.totalBatches || 0
    }</span>
        </div>
      </div>
      <p style="margin-top: 15px; color: #666;">${
        result.message || "Disparo finalizado"
      }</p>
    `;

    this.disparoResults.style.display = "block";
  }

  // ========================================
  // STATUS
  // ========================================

  async refreshStatus() {
    try {
      const statusResult = await window.droneAPI.obterStatusCliente();

      const indicator = this.whatsappStatus.querySelector(".indicator-dot");
      const text = this.whatsappStatus.querySelector(".indicator-text");

      if (statusResult.conectado) {
        indicator.textContent = "🟢";
        text.textContent = statusResult.statusTexto || "Conectado";
      } else {
        indicator.textContent = "🔴";
        text.textContent = statusResult.statusTexto || "Desconectado";
      }

      await this.loadStatistics();
      await this.loadMessagesForSelect();

      this.showStatus("Status atualizado", "success");
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      this.showStatus("Erro ao atualizar status", "error");
    }
  }

  // ========================================
  // UTILIDADES
  // ========================================

  showStatus(message, type = "info") {
    this.statusDiv.textContent = message;
    this.statusDiv.className = `status-message ${type} show`;

    setTimeout(() => {
      this.statusDiv.classList.remove("show");
    }, 5000);
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  window.droneManager = new DroneManager();
  console.log("DroneManager inicializado");
});
