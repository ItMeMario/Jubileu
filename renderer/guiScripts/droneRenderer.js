// renderer/guiScripts/droneRenderer.js

class DroneRenderer {
  constructor() {
    // Estado da aplicação
    this.selectedMessageIndex = null;
    this.selectedInstanceId = null;
    this.selectedInstanceInfo = null;
    this.messages = [];
    this.numbers = [];
    this.connectedInstances = [];

    // Elementos do DOM
    this.elements = {};

    // Inicializa quando o DOM estiver pronto
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.init());
    } else {
      this.init();
    }
  }

  // ==================== INICIALIZAÇÃO ====================

  async init() {
    console.log("🚁 Inicializando DroneRenderer...");

    this.cacheElements();
    this.bindEvents();
    this.bindMenuEvents();
    this.bindFileUploadEvents();
    this.bindNumbersEvents();
    this.bindDisparoEvents();
    this.bindInstanceEvents();

    // Carrega dados iniciais
    await this.loadInstances();
    await this.loadMessages();
    await this.loadNumbers();
    await this.updateStats();

    console.log("✅ DroneRenderer inicializado");
  }

  cacheElements() {
    this.elements = {
      // Status
      statusMessage: document.getElementById("status"),
      noInstanceWarning: document.getElementById("no-instance-warning"),

      // Instance Selector
      instanceSelect: document.getElementById("instance-select"),
      instanceStatus: document.getElementById("instance-status"),
      btnRefreshInstances: document.getElementById("btn-refresh-instances"),

      // Sections
      sections: {
        mensagens: document.getElementById("mensagens-section"),
        numeros: document.getElementById("numeros-section"),
        disparo: document.getElementById("disparo-section"),
        status: document.getElementById("status-section"),
      },

      // Messages
      messagesList: document.getElementById("messages-list"),
      selectedMessageInfo: document.getElementById("selected-message-info"),
      previewLocale: document.getElementById("preview-locale"),
      previewContent: document.getElementById("preview-content"),

      // File Upload
      fileUploadArea: document.getElementById("file-upload-area"),
      fileInput: document.getElementById("file-input"),
      fileInfo: document.getElementById("file-info"),
      fileName: document.getElementById("file-name"),
      fileCount: document.getElementById("file-count"),
      btnRemoveFile: document.getElementById("btn-remove-file"),
      processingOptions: document.getElementById("processing-options"),
      btnImportFile: document.getElementById("btn-import-file"),

      // Processing Options
      checkboxDDD: document.getElementById("checkbox-ddd"),
      dddInputWrapper: document.getElementById("ddd-input-wrapper"),
      dddInput: document.getElementById("ddd"),
      checkboxPrefixo: document.getElementById("checkbox-prefixo"),
      prefixoInputWrapper: document.getElementById("prefixo-input-wrapper"),
      prefixoInput: document.getElementById("prefixo-pais"),
      checkbox9Digito: document.getElementById("adicionar-9-digito"),
      checkboxUsarNomes: document.getElementById("usar-nomes-csv"),

      // Numbers List
      numbersList: document.getElementById("numbers-list"),
      statusFilter: document.getElementById("status-filter"),
      btnClearSent: document.getElementById("btn-clear-sent"),
      btnClearFailed: document.getElementById("btn-clear-failed"),
      btnClearAll: document.getElementById("btn-clear-all"),

      // Disparo
      disparoInstanceInfo: document.getElementById("disparo-instance-info"),
      disparoInstanceName: document.getElementById("disparo-instance-name"),
      disparoInstancePhone: document.getElementById("disparo-instance-phone"),
      reqInstance: document.getElementById("req-instance"),
      reqWhatsapp: document.getElementById("req-whatsapp"),
      reqMessage: document.getElementById("req-message"),
      reqNumbers: document.getElementById("req-numbers"),
      messageSelect: document.getElementById("message-select"),
      batchSize: document.getElementById("batch-size"),
      btnExecuteDisparo: document.getElementById("btn-execute-disparo"),

      // Status Section
      instancesStatusList: document.getElementById("instances-status-list"),
      btnRefreshStatus: document.getElementById("btn-refresh-status"),
      statusTotal: document.getElementById("status-total"),
      statusMessages: document.getElementById("status-messages"),
      breakdownPending: document.getElementById("breakdown-pending"),
      breakdownPendingPercent: document.getElementById(
        "breakdown-pending-percent"
      ),
      breakdownSent: document.getElementById("breakdown-sent"),
      breakdownSentPercent: document.getElementById("breakdown-sent-percent"),
      breakdownFailed: document.getElementById("breakdown-failed"),
      breakdownFailedPercent: document.getElementById(
        "breakdown-failed-percent"
      ),
    };
  }

  // ==================== EVENT BINDINGS ====================

  bindEvents() {
    // Menu items
    document.querySelectorAll(".menu-item").forEach((item) => {
      item.addEventListener("click", (e) => this.handleMenuClick(e));
    });
  }

  bindMenuEvents() {
    document.querySelectorAll(".menu-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        const section = e.currentTarget.dataset.section;
        this.showSection(section);
      });
    });
  }

  bindInstanceEvents() {
    // Seletor de instância
    this.elements.instanceSelect?.addEventListener("change", (e) => {
      this.handleInstanceChange(e.target.value);
    });

    // Botão refresh instâncias
    this.elements.btnRefreshInstances?.addEventListener("click", () => {
      this.loadInstances();
    });

    // Botão refresh status
    this.elements.btnRefreshStatus?.addEventListener("click", () => {
      this.loadAllInstancesStatus();
    });
  }

  bindFileUploadEvents() {
    const { fileUploadArea, fileInput, btnRemoveFile, btnImportFile } =
      this.elements;

    // Click na área de upload
    fileUploadArea?.addEventListener("click", () => fileInput?.click());

    // Seleção de arquivo
    fileInput?.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        this.handleFileSelect(e.target.files[0]);
      }
    });

    // Drag and drop
    fileUploadArea?.addEventListener("dragover", (e) => {
      e.preventDefault();
      fileUploadArea.classList.add("dragover");
    });

    fileUploadArea?.addEventListener("dragleave", () => {
      fileUploadArea.classList.remove("dragover");
    });

    fileUploadArea?.addEventListener("drop", (e) => {
      e.preventDefault();
      fileUploadArea.classList.remove("dragover");
      if (e.dataTransfer.files.length > 0) {
        this.handleFileSelect(e.dataTransfer.files[0]);
      }
    });

    // Remover arquivo
    btnRemoveFile?.addEventListener("click", () => this.clearFileSelection());

    // Importar arquivo
    btnImportFile?.addEventListener("click", () => this.importFile());

    // Toggle opções de DDD
    this.elements.checkboxDDD?.addEventListener("change", (e) => {
      this.elements.dddInputWrapper.style.display = e.target.checked
        ? "block"
        : "none";
    });

    // Toggle opções de Prefixo
    this.elements.checkboxPrefixo?.addEventListener("change", (e) => {
      this.elements.prefixoInputWrapper.style.display = e.target.checked
        ? "block"
        : "none";
    });
  }

  bindNumbersEvents() {
    const { statusFilter, btnClearSent, btnClearFailed, btnClearAll } =
      this.elements;

    // Filtro de status
    statusFilter?.addEventListener("change", () => this.loadNumbers());

    // Botões de limpeza
    btnClearSent?.addEventListener("click", () => this.clearNumbers("sent"));
    btnClearFailed?.addEventListener("click", () =>
      this.clearNumbers("failed")
    );
    btnClearAll?.addEventListener("click", () => this.clearNumbers("all"));
  }

  bindDisparoEvents() {
    const { messageSelect, btnExecuteDisparo } = this.elements;

    // Seleção de mensagem no disparo
    messageSelect?.addEventListener("change", () => this.updateRequirements());

    // Executar disparo
    btnExecuteDisparo?.addEventListener("click", () => this.executeDisparo());
  }

  // ==================== INSTANCE MANAGEMENT ====================

  async loadInstances() {
    try {
      this.elements.btnRefreshInstances?.classList.add("loading");

      const result = await window.droneAPI.listarInstanciasConectadas();

      if (result.success) {
        this.connectedInstances = result.instances;
        this.renderInstanceSelector();
        this.updateInstanceWarning();
      } else {
        console.error("Erro ao carregar instâncias:", result.error);
        this.showStatus(
          "Erro ao carregar instâncias: " + result.error,
          "error"
        );
      }
    } catch (error) {
      console.error("Erro ao carregar instâncias:", error);
      this.showStatus("Erro ao carregar instâncias", "error");
    } finally {
      this.elements.btnRefreshInstances?.classList.remove("loading");
    }
  }

  renderInstanceSelector() {
    const select = this.elements.instanceSelect;
    if (!select) return;

    // Limpa opções
    select.innerHTML = "";

    if (this.connectedInstances.length === 0) {
      select.innerHTML =
        '<option value="">Nenhuma instância conectada</option>';
      this.handleInstanceChange("");
      return;
    }

    // Adiciona opção padrão
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Selecione uma instância...";
    select.appendChild(defaultOption);

    // Adiciona instâncias conectadas
    this.connectedInstances.forEach((instance) => {
      const option = document.createElement("option");
      option.value = instance.instanceId;
      option.textContent = instance.displayName;
      select.appendChild(option);
    });

    // Se havia uma instância selecionada, tenta manter
    if (this.selectedInstanceId) {
      const stillExists = this.connectedInstances.find(
        (i) => i.instanceId === this.selectedInstanceId
      );
      if (stillExists) {
        select.value = this.selectedInstanceId;
      } else {
        this.handleInstanceChange("");
      }
    }
  }

  handleInstanceChange(instanceId) {
    this.selectedInstanceId = instanceId || null;

    if (instanceId) {
      const instance = this.connectedInstances.find(
        (i) => i.instanceId === instanceId
      );
      this.selectedInstanceInfo = instance || null;
    } else {
      this.selectedInstanceInfo = null;
    }

    this.updateInstanceStatus();
    this.updateInstanceWarning();
    this.updateDisparoInstanceInfo();
    this.updateRequirements();

    console.log(
      "Instância selecionada:",
      this.selectedInstanceId,
      this.selectedInstanceInfo
    );
  }

  updateInstanceStatus() {
    const statusEl = this.elements.instanceStatus;
    if (!statusEl) return;

    if (this.selectedInstanceInfo) {
      statusEl.innerHTML = `
        <span class="status-dot">🟢</span>
        <span class="status-text">${
          this.selectedInstanceInfo.phoneFormatted || "Conectado"
        }</span>
      `;
      statusEl.className = "instance-status connected";
    } else if (this.connectedInstances.length === 0) {
      statusEl.innerHTML = `
        <span class="status-dot">🔴</span>
        <span class="status-text">Nenhuma instância disponível</span>
      `;
      statusEl.className = "instance-status disconnected";
    } else {
      statusEl.innerHTML = `
        <span class="status-dot">⚪</span>
        <span class="status-text">Selecione uma instância</span>
      `;
      statusEl.className = "instance-status";
    }
  }

  updateInstanceWarning() {
    const warning = this.elements.noInstanceWarning;
    if (!warning) return;

    if (!this.selectedInstanceId) {
      warning.classList.add("visible");
    } else {
      warning.classList.remove("visible");
    }
  }

  updateDisparoInstanceInfo() {
    const badge =
      this.elements.disparoInstanceInfo?.querySelector(".instance-badge");
    const nameEl = this.elements.disparoInstanceName;
    const phoneEl = this.elements.disparoInstancePhone;

    if (!badge || !nameEl || !phoneEl) return;

    if (this.selectedInstanceInfo) {
      nameEl.textContent = this.selectedInstanceInfo.name;
      phoneEl.textContent = this.selectedInstanceInfo.phoneFormatted || "";
      badge.className = "instance-badge connected";
    } else {
      nameEl.textContent = "Nenhuma instância selecionada";
      phoneEl.textContent = "";
      badge.className = "instance-badge no-instance";
    }
  }

  // ==================== INSTANCES STATUS (Status Section) ====================

  async loadAllInstancesStatus() {
    try {
      const listEl = this.elements.instancesStatusList;
      if (!listEl) return;

      listEl.innerHTML =
        '<div class="loading-instances">Carregando instâncias...</div>';

      const result = await window.droneAPI.obterStatusTodasInstancias();

      if (result.success) {
        this.renderInstancesStatus(result.instances);
      } else {
        listEl.innerHTML = `<div class="no-instances">Erro: ${result.error}</div>`;
      }
    } catch (error) {
      console.error("Erro ao carregar status das instâncias:", error);
      this.elements.instancesStatusList.innerHTML =
        '<div class="no-instances">Erro ao carregar instâncias</div>';
    }
  }

  renderInstancesStatus(instances) {
    const listEl = this.elements.instancesStatusList;
    if (!listEl) return;

    if (!instances || instances.length === 0) {
      listEl.innerHTML = `
        <div class="no-instances">
          <p>Nenhuma instância cadastrada</p>
          <p>Crie instâncias na tela principal</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = instances
      .map((instance) => {
        const stateClass = instance.connected
          ? "connected"
          : instance.state === "OPENING"
          ? "connecting"
          : "disconnected";

        return `
        <div class="instance-status-item ${stateClass}">
          <span class="instance-icon">📱</span>
          <div class="instance-info">
            <div class="instance-name">${this.escapeHtml(instance.name)}</div>
            <div class="instance-phone">${
              instance.phoneNumber || "Não conectado"
            }</div>
          </div>
          <span class="instance-state ${stateClass}">${
          instance.stateTexto
        }</span>
        </div>
      `;
      })
      .join("");
  }

  // ==================== MESSAGES ====================

  async loadMessages() {
    try {
      const result = await window.droneAPI.listarMensagens();

      if (result.success) {
        this.messages = result.messages;
        this.renderMessages();
        this.populateMessageSelect();
        this.updateStats();
      } else {
        this.elements.messagesList.innerHTML = `
          <div class="empty-state">Erro ao carregar mensagens: ${result.error}</div>
        `;
      }
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
      this.elements.messagesList.innerHTML = `
        <div class="empty-state">Erro ao carregar mensagens</div>
      `;
    }
  }

  renderMessages() {
    const list = this.elements.messagesList;
    if (!list) return;

    if (this.messages.length === 0) {
      list.innerHTML =
        '<div class="empty-state">Nenhuma mensagem disponível</div>';
      return;
    }

    list.innerHTML = this.messages
      .map(
        (msg, index) => `
      <div class="message-item ${
        this.selectedMessageIndex === index + 1 ? "selected" : ""
      }" 
           data-index="${index + 1}">
        <div class="message-header">
          <span class="message-id">Mensagem #${index + 1}</span>
          <span class="message-locale">${this.escapeHtml(
            msg.locale || "Padrão"
          )}</span>
        </div>
        <div class="message-content">${this.escapeHtml(
          msg.content || msg.message_content
        )}</div>
      </div>
    `
      )
      .join("");

    // Bind click events
    list.querySelectorAll(".message-item").forEach((item) => {
      item.addEventListener("click", () => {
        const index = parseInt(item.dataset.index);
        this.selectMessage(index);
      });
    });
  }

  selectMessage(index) {
    this.selectedMessageIndex = index;

    // Atualiza UI
    document.querySelectorAll(".message-item").forEach((item) => {
      item.classList.toggle("selected", parseInt(item.dataset.index) === index);
    });

    // Mostra preview
    const message = this.messages[index - 1];
    if (message && this.elements.selectedMessageInfo) {
      this.elements.previewLocale.textContent = message.locale || "Padrão";
      this.elements.previewContent.textContent =
        message.content || message.message_content;
      this.elements.selectedMessageInfo.style.display = "block";
    }

    // Atualiza select do disparo
    if (this.elements.messageSelect) {
      this.elements.messageSelect.value = index;
    }

    this.updateRequirements();
  }

  populateMessageSelect() {
    const select = this.elements.messageSelect;
    if (!select) return;

    select.innerHTML = '<option value="">Selecione uma mensagem...</option>';

    this.messages.forEach((msg, index) => {
      const option = document.createElement("option");
      option.value = index + 1;
      option.textContent = `#${index + 1} - ${(
        msg.locale || "Padrão"
      ).substring(0, 30)}`;
      select.appendChild(option);
    });
  }

  // ==================== FILE UPLOAD ====================

  async handleFileSelect(file) {
    if (!file.name.endsWith(".csv")) {
      this.showStatus("Por favor, selecione um arquivo CSV", "error");
      return;
    }

    try {
      const result = await window.fileAPI.readFile(file);

      if (result.success) {
        this.currentFileContent = result.content;
        this.currentFileName = result.name;

        // Preview do arquivo
        const preview = await window.droneAPI.previewCSV(result.content, 5);

        this.elements.fileName.textContent = result.name;
        this.elements.fileCount.textContent = preview.success
          ? `${preview.totalLinhas} linhas encontradas`
          : "Erro ao processar";

        this.elements.fileUploadArea.style.display = "none";
        this.elements.fileInfo.style.display = "block";
        this.elements.processingOptions.style.display = "block";
        this.elements.btnImportFile.disabled = false;
      } else {
        this.showStatus("Erro ao ler arquivo: " + result.error, "error");
      }
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      this.showStatus("Erro ao processar arquivo", "error");
    }
  }

  clearFileSelection() {
    this.currentFileContent = null;
    this.currentFileName = null;

    this.elements.fileInput.value = "";
    this.elements.fileUploadArea.style.display = "block";
    this.elements.fileInfo.style.display = "none";
    this.elements.processingOptions.style.display = "none";
    this.elements.btnImportFile.disabled = true;
  }

  async importFile() {
    if (!this.currentFileContent) {
      this.showStatus("Nenhum arquivo selecionado", "error");
      return;
    }

    try {
      this.elements.btnImportFile.disabled = true;
      this.elements.btnImportFile.textContent = "Importando...";

      const opcoes = {
        adicionar9Digito: this.elements.checkbox9Digito?.checked || false,
        usarNomesCSV: this.elements.checkboxUsarNomes?.checked || true,
        usarDDD: this.elements.checkboxDDD?.checked || false,
        ddd: this.elements.dddInput?.value || "",
        usarPrefixo: this.elements.checkboxPrefixo?.checked || false,
        prefixoPais: this.elements.prefixoInput?.value || "",
      };

      const result = await window.droneAPI.processarArquivoCSV(
        this.currentFileContent,
        opcoes
      );

      if (result.success) {
        this.showStatus(
          `✅ ${result.adicionados} números importados com sucesso!`,
          "success"
        );
        this.clearFileSelection();
        await this.loadNumbers();
        await this.updateStats();
      } else {
        this.showStatus("Erro ao importar: " + result.error, "error");
      }
    } catch (error) {
      console.error("Erro ao importar arquivo:", error);
      this.showStatus("Erro ao importar arquivo", "error");
    } finally {
      this.elements.btnImportFile.disabled = false;
      this.elements.btnImportFile.textContent = "Importar Números";
    }
  }

  // ==================== NUMBERS ====================

  async loadNumbers() {
    try {
      const filter = this.elements.statusFilter?.value || "all";
      const result = await window.droneAPI.listarNumerosAtuais(filter);

      if (result.success) {
        this.numbers = result.numbers;
        this.renderNumbers();
        this.updateRequirements();
      } else {
        this.elements.numbersList.innerHTML = `
          <div class="empty-state">Erro ao carregar números: ${result.error}</div>
        `;
      }
    } catch (error) {
      console.error("Erro ao carregar números:", error);
      this.elements.numbersList.innerHTML = `
        <div class="empty-state">Erro ao carregar números</div>
      `;
    }
  }

  renderNumbers() {
    const list = this.elements.numbersList;
    if (!list) return;

    if (this.numbers.length === 0) {
      list.innerHTML =
        '<div class="empty-state">Nenhum número cadastrado</div>';
      return;
    }

    list.innerHTML = this.numbers
      .map(
        (num, index) => `
      <div class="number-item">
        <span class="number-index">#${index + 1}</span>
        <span class="number-value">${this.escapeHtml(num.phone_number)}</span>
        <span class="number-name">${this.escapeHtml(
          num.custom_name || "-"
        )}</span>
        <span class="number-status ${num.status}">${this.getStatusLabel(
          num.status
        )}</span>
        <button class="btn-remove" data-id="${
          num.id
        }" title="Remover">✕</button>
      </div>
    `
      )
      .join("");

    // Bind remove events
    list.querySelectorAll(".btn-remove").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = e.target.dataset.id;
        await this.removeNumber(id);
      });
    });
  }

  getStatusLabel(status) {
    const labels = {
      pending: "⏳ Pendente",
      sent: "✅ Enviado",
      failed: "❌ Falha",
    };
    return labels[status] || status;
  }

  async removeNumber(id) {
    try {
      const result = await window.droneAPI.removerNumero(id);

      if (result.success) {
        await this.loadNumbers();
        await this.updateStats();
        this.showStatus("Número removido", "success");
      } else {
        this.showStatus("Erro ao remover: " + result.error, "error");
      }
    } catch (error) {
      console.error("Erro ao remover número:", error);
      this.showStatus("Erro ao remover número", "error");
    }
  }

  async clearNumbers(type) {
    const confirmMessages = {
      sent: "Deseja limpar todos os números enviados?",
      failed: "Deseja limpar todos os números com falha?",
      all: "Deseja limpar TODOS os números? Esta ação não pode ser desfeita.",
    };

    if (!confirm(confirmMessages[type])) return;

    try {
      let result;

      switch (type) {
        case "sent":
          result = await window.droneAPI.limparEnviados();
          break;
        case "failed":
          result = await window.droneAPI.limparFalhas();
          break;
        case "all":
          result = await window.droneAPI.limparListaCompleta();
          break;
      }

      if (result.success) {
        this.showStatus(
          `✅ ${result.message || "Números removidos com sucesso"}`,
          "success"
        );
        await this.loadNumbers();
        await this.updateStats();
      } else {
        this.showStatus("Erro: " + result.error, "error");
      }
    } catch (error) {
      console.error("Erro ao limpar números:", error);
      this.showStatus("Erro ao limpar números", "error");
    }
  }

  // ==================== DISPARO ====================

  updateRequirements() {
    const {
      reqInstance,
      reqWhatsapp,
      reqMessage,
      reqNumbers,
      btnExecuteDisparo,
    } = this.elements;

    // Requisito: Instância selecionada
    const hasInstance = !!this.selectedInstanceId;
    this.setRequirementStatus(reqInstance, hasInstance);

    // Requisito: WhatsApp conectado (se tem instância, está conectado)
    const isConnected = hasInstance && this.selectedInstanceInfo;
    this.setRequirementStatus(reqWhatsapp, isConnected);

    // Requisito: Mensagem selecionada
    const messageIndex = this.elements.messageSelect?.value;
    const hasMessage = !!messageIndex;
    this.setRequirementStatus(reqMessage, hasMessage);

    // Requisito: Números cadastrados
    const hasNumbers = this.numbers.length > 0;
    this.setRequirementStatus(reqNumbers, hasNumbers);

    // Habilita botão se todos os requisitos foram atendidos
    const allMet = hasInstance && isConnected && hasMessage && hasNumbers;
    if (btnExecuteDisparo) {
      btnExecuteDisparo.disabled = !allMet;
    }
  }

  setRequirementStatus(element, success) {
    if (!element) return;

    const icon = element.querySelector(".req-icon");
    element.classList.remove("success", "error", "pending");

    if (success) {
      element.classList.add("success");
      if (icon) icon.textContent = "✅";
    } else {
      element.classList.add("error");
      if (icon) icon.textContent = "❌";
    }
  }

  async executeDisparo() {
    if (!this.selectedInstanceId) {
      this.showStatus("Selecione uma instância antes de disparar", "error");
      return;
    }

    const messageIndex = parseInt(this.elements.messageSelect?.value);
    if (!messageIndex) {
      this.showStatus("Selecione uma mensagem", "error");
      return;
    }

    const batchSize = parseInt(this.elements.batchSize?.value) || 200;

    const confirmMsg =
      `Confirma o disparo?\n\n` +
      `Instância: ${
        this.selectedInstanceInfo?.name || this.selectedInstanceId
      }\n` +
      `Mensagem: #${messageIndex}\n` +
      `Batch: ${batchSize} números por lote\n` +
      `Total: ${this.numbers.length} números`;

    if (!confirm(confirmMsg)) return;

    try {
      this.elements.btnExecuteDisparo.disabled = true;
      this.elements.btnExecuteDisparo.textContent = "🚀 Disparando...";

      this.showStatus("Iniciando disparo...", "info");

      const result = await window.droneAPI.executarDisparoDrone(
        this.selectedInstanceId,
        messageIndex,
        batchSize
      );

      if (result.success) {
        const detalhes = result.detalhes || {};
        this.showStatus(
          `✅ Disparo concluído! Enviados: ${
            detalhes.totalEnviados || 0
          }, Falhas: ${detalhes.totalFalhas || 0}`,
          "success"
        );
      } else {
        this.showStatus("❌ Erro no disparo: " + result.error, "error");
      }

      // Recarrega números para atualizar status
      await this.loadNumbers();
      await this.updateStats();
    } catch (error) {
      console.error("Erro ao executar disparo:", error);
      this.showStatus("Erro ao executar disparo", "error");
    } finally {
      this.elements.btnExecuteDisparo.disabled = false;
      this.elements.btnExecuteDisparo.textContent = "🚀 Executar Disparo";
      this.updateRequirements();
    }
  }

  // ==================== STATS ====================

  async updateStats() {
    try {
      const stats = await window.droneAPI.obterEstatisticasNumeros();

      if (stats.success) {
        const data = stats.estatisticas || stats;

        // Total e mensagens
        if (this.elements.statusTotal) {
          this.elements.statusTotal.textContent = data.total || 0;
        }
        if (this.elements.statusMessages) {
          this.elements.statusMessages.textContent = this.messages.length;
        }

        // Breakdown
        const total = data.total || 0;
        const pending = data.porStatus?.pending || 0;
        const sent = data.porStatus?.sent || 0;
        const failed = data.porStatus?.failed || 0;

        this.updateBreakdownItem("pending", pending, total);
        this.updateBreakdownItem("sent", sent, total);
        this.updateBreakdownItem("failed", failed, total);
      }

      // Carrega status de todas as instâncias
      await this.loadAllInstancesStatus();
    } catch (error) {
      console.error("Erro ao atualizar estatísticas:", error);
    }
  }

  updateBreakdownItem(type, value, total) {
    const valueEl = this.elements[`breakdown${this.capitalize(type)}`];
    const percentEl = this.elements[`breakdown${this.capitalize(type)}Percent`];

    if (valueEl) valueEl.textContent = value;
    if (percentEl) {
      const percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
      percentEl.textContent = `(${percent}%)`;
    }
  }

  // ==================== UI HELPERS ====================

  showSection(sectionName) {
    // Remove active de todos os menus
    document.querySelectorAll(".menu-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.section === sectionName);
    });

    // Mostra seção correta
    Object.entries(this.elements.sections).forEach(([name, section]) => {
      if (section) {
        section.classList.toggle("active", name === sectionName);
      }
    });

    // Ações específicas por seção
    if (sectionName === "status") {
      this.updateStats();
    } else if (sectionName === "disparo") {
      this.updateRequirements();
    }
  }

  handleMenuClick(e) {
    const section = e.currentTarget.dataset.section;
    if (section) {
      this.showSection(section);
    }
  }

  showStatus(message, type = "info") {
    const el = this.elements.statusMessage;
    if (!el) return;

    el.textContent = message;
    el.className = `status-message ${type}`;

    // Auto-hide após 5 segundos
    setTimeout(() => {
      el.className = "status-message";
    }, 5000);
  }

  escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// Inicializa o renderer
const droneRenderer = new DroneRenderer();

export default droneRenderer;
