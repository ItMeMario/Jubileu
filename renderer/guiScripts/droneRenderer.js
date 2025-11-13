// renderer/guiScripts/droneRenderer.js

// Importa todos os módulos necessários
import DroneUtility from "./droneModules/droneUtility.js";
import DroneNavigation from "./droneModules/droneNavigation.js";
import DroneMessage from "./droneModules/droneMessage.js";
import DroneNumbers from "./droneModules/droneNumbers.js";
import DroneDispatch from "./droneModules/droneDispatch.js";
import DroneStatus from "./droneModules/droneStatus.js";

class DroneManager {
  constructor() {
    // Estado centralizado
    this.selectedMessageIndex = null;
    this.selectedMessageData = null;
    this.allMessages = [];
    this.currentNumbers = [];
    this.currentFile = null;
    this.isDisparoRunning = false;
    this.currentStatusFilter = "all";

    // Inicializa elementos DOM
    this.initializeElements();

    // Inicializa módulos
    this.initializeModules();

    // Configura event listeners
    this.setupEventListeners();

    // Carrega dados iniciais
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

    // Números - File
    this.fileUploadArea = document.getElementById("file-upload-area");
    this.fileInput = document.getElementById("file-input");
    this.fileInfo = document.getElementById("file-info");
    this.fileName = document.getElementById("file-name");
    this.fileCount = document.getElementById("file-count");
    this.btnRemoveFile = document.getElementById("btn-remove-file");
    this.btnImportFile = document.getElementById("btn-import-file");

    // Números - Processing Options
    this.processingOptions = document.getElementById("processing-options");

    // Números - Lista e controles
    this.numbersList = document.getElementById("numbers-list");
    this.statusFilter = document.getElementById("status-filter");
    this.btnClearAll = document.getElementById("btn-clear-all");
    this.btnClearSent = document.getElementById("btn-clear-sent");
    this.btnClearFailed = document.getElementById("btn-clear-failed");

    // Disparo
    this.requirementsCheck = document.getElementById("requirements-check");
    this.reqWhatsapp = document.getElementById("req-whatsapp");
    this.reqMessage = document.getElementById("req-message");
    this.reqNumbers = document.getElementById("req-numbers");
    this.messageSelect = document.getElementById("message-select");
    this.batchSize = document.getElementById("batch-size");
    this.summaryTotal = document.getElementById("summary-total");
    this.summaryToSend = document.getElementById("summary-to-send");
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

    // Status - Elementos principais
    this.whatsappStatus = document.getElementById("whatsapp-status");
    this.statusTotal = document.getElementById("status-total");
    this.statusMessages = document.getElementById("status-messages");
    this.btnRefreshStatus = document.getElementById("btn-refresh-status");

    // Status - Breakdown (ÚNICOS indicadores de status mantidos)
    this.breakdownPending = document.getElementById("breakdown-pending");
    this.breakdownSent = document.getElementById("breakdown-sent");
    this.breakdownFailed = document.getElementById("breakdown-failed");
    this.breakdownPendingPercent = document.getElementById(
      "breakdown-pending-percent"
    );
    this.breakdownSentPercent = document.getElementById(
      "breakdown-sent-percent"
    );
    this.breakdownFailedPercent = document.getElementById(
      "breakdown-failed-percent"
    );
  }

  initializeModules() {
    // Instancia todos os módulos passando o manager (this)
    this.utility = new DroneUtility(this);
    this.navigation = new DroneNavigation(this);
    this.messages = new DroneMessage(this);
    this.numbers = new DroneNumbers(this);
    this.dispatch = new DroneDispatch(this);
    this.status = new DroneStatus(this);
  }

  setupEventListeners() {
    // Menu navigation
    this.menuItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        const section = e.target.dataset.section;
        this.navigation.switchSection(section);
      });
    });

    // Números - File Upload
    this.fileUploadArea.addEventListener("click", () => {
      this.fileInput.click();
    });

    this.fileInput.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        this.numbers.handleFileSelect(e.target.files[0]);
      }
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
      if (e.dataTransfer.files.length > 0) {
        this.numbers.handleFileSelect(e.dataTransfer.files[0]);
      }
    });

    this.btnRemoveFile.addEventListener("click", () =>
      this.numbers.removeFile()
    );
    this.btnImportFile.addEventListener("click", () =>
      this.numbers.importFile()
    );

    // Números - Filtro de status
    this.statusFilter.addEventListener("change", (e) => {
      this.currentStatusFilter = e.target.value;
      this.numbers.loadNumbers(this.currentStatusFilter);
    });

    // Números - Botões de limpeza
    this.btnClearAll.addEventListener("click", () =>
      this.numbers.clearAllNumbers()
    );
    this.btnClearSent.addEventListener("click", () =>
      this.numbers.clearSentNumbers()
    );
    this.btnClearFailed.addEventListener("click", () =>
      this.numbers.clearFailedNumbers()
    );

    // Disparo - Seleção de mensagem
    this.messageSelect.addEventListener("change", () => {
      this.dispatch.selectMessageFromDisparo();
    });

    this.batchSize.addEventListener("input", () =>
      this.dispatch.updateDisparoSummary()
    );
    this.btnExecuteDisparo.addEventListener("click", () =>
      this.dispatch.executeDisparo()
    );

    // Status
    this.btnRefreshStatus.addEventListener("click", () =>
      this.status.refreshStatus()
    );
  }

  async loadInitialData() {
    await this.messages.loadMessages();
    await this.numbers.loadNumbers();
    await this.dispatch.loadMessagesForSelect();
    await this.dispatch.checkRequirements();
    await this.status.refreshStatus();
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  window.droneManager = new DroneManager();
  console.log("DroneManager inicializado com módulos");
});
