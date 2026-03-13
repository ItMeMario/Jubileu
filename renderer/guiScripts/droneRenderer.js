// renderer/guiScripts/droneRenderer.js

import DroneNavigation from "./droneModules/droneNavigation.js";
import DroneMessage from "./droneModules/droneMessage.js";
import DroneNumbers from "./droneModules/droneNumbers.js";
import DroneDispatch from "./droneModules/droneDispatch.js";
import DroneStatus from "./droneModules/droneStatus.js";
import DroneUtility from "./droneModules/droneUtility.js";
import DroneInstances from "./droneModules/droneInstances.js";

class DroneRenderer {
  constructor() {
    // Estado da aplicação
    this.selectedMessageIndex = null;
    this.selectedMessageData = null;
    this.selectedInstanceId = null;
    this.selectedInstanceInfo = null;
    this.allMessages = [];
    this.currentNumbers = [];
    this.connectedInstances = [];
    this.currentStatusFilter = "all";
    this.currentFile = null;
    this.disparoRunningInstances = new Set();

    // Inicializa quando o DOM estiver pronto
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.init());
    } else {
      this.init();
    }
  }

  async init() {
    console.log("🚁 Inicializando DroneRenderer...");

    // Cache dos elementos do DOM
    this.cacheElements();

    // Inicializa módulos
    this.initModules();

    // Configura event listeners
    this.setupEventListeners();

    // Carrega dados iniciais
    await this.loadInitialData();

    console.log(
      "✅ DroneRenderer inicializado com suporte a múltiplas instâncias"
    );
  }

  /**
   * Cache de todos os elementos do DOM
   */
  cacheElements() {
    // Status message
    this.statusDiv = document.getElementById("status");

    // Instance Selector (NOVO)
    this.instanceSelect = document.getElementById("instance-select");
    this.instanceStatus = document.getElementById("instance-status");
    this.btnRefreshInstances = document.getElementById("btn-refresh-instances");
    this.noInstanceWarning = document.getElementById("no-instance-warning");

    // Disparo - Instance Info (NOVO)
    this.disparoInstanceInfo = document.getElementById("disparo-instance-info");
    this.disparoInstanceName = document.getElementById("disparo-instance-name");
    this.disparoInstancePhone = document.getElementById(
      "disparo-instance-phone"
    );

    // Navigation
    this.menuItems = document.querySelectorAll(".menu-item");
    this.sections = document.querySelectorAll(".section");
    this.tabBtns = document.querySelectorAll(".tab-btn");
    this.tabContents = document.querySelectorAll(".tab-content");

    // Messages
    this.messagesList = document.getElementById("messages-list");

    // Numbers
    this.numbersList = document.getElementById("numbers-list");
    this.fileUploadArea = document.getElementById("file-upload-area");
    this.fileInput = document.getElementById("file-input");
    this.fileInfo = document.getElementById("file-info");
    this.fileName = document.getElementById("file-name");
    this.fileCount = document.getElementById("file-count");
    this.btnRemoveFile = document.getElementById("btn-remove-file");
    this.btnImportFile = document.getElementById("btn-import-file");
    this.processingOptions = document.getElementById("processing-options");
    this.statusFilter = document.getElementById("status-filter");
    this.btnClearAll = document.getElementById("btn-clear-all");
    this.btnClearSent = document.getElementById("btn-clear-sent");
    this.btnClearFailed = document.getElementById("btn-clear-failed");

    // Disparo
    this.reqInstance = document.getElementById("req-instance");
    this.reqWhatsapp = document.getElementById("req-whatsapp");
    this.reqMessage = document.getElementById("req-message");
    this.reqNumbers = document.getElementById("req-numbers");
    this.messageSelect = document.getElementById("message-select");
    this.batchSize = document.getElementById("batch-size");
    this.btnExecuteDisparo = document.getElementById("btn-execute-disparo");

    // Status
    this.whatsappStatus = document.getElementById("whatsapp-status");
    this.statusTotal = document.getElementById("status-total");
    this.statusMessages = document.getElementById("status-messages");
    this.btnRefreshStatus = document.getElementById("btn-refresh-status");

    // Status Breakdown
    this.breakdownPending = document.getElementById("breakdown-pending");
    this.breakdownPendingPercent = document.getElementById(
      "breakdown-pending-percent"
    );
    this.breakdownSent = document.getElementById("breakdown-sent");
    this.breakdownSentPercent = document.getElementById(
      "breakdown-sent-percent"
    );
    this.breakdownFailed = document.getElementById("breakdown-failed");
    this.breakdownFailedPercent = document.getElementById(
      "breakdown-failed-percent"
    );

    // Instances Status List (NOVO)
    this.instancesStatusList = document.getElementById("instances-status-list");
    this.instancesConnectedCount = document.getElementById(
      "instances-connected-count"
    );
    this.instancesTotalCount = document.getElementById("instances-total-count");
  }

  /**
   * Inicializa todos os módulos
   */
  initModules() {
    this.utility = new DroneUtility(this);
    this.navigation = new DroneNavigation(this);
    this.messages = new DroneMessage(this);
    this.numbers = new DroneNumbers(this);
    this.dispatch = new DroneDispatch(this);
    this.status = new DroneStatus(this);
    this.instances = new DroneInstances(this);

    console.log("📦 Módulos inicializados:", [
      "utility",
      "navigation",
      "messages",
      "numbers",
      "dispatch",
      "status",
      "instances",
    ]);
  }

  /**
   * Configura todos os event listeners
   */
  setupEventListeners() {
    // Navigation
    this.menuItems.forEach((item) => {
      item.addEventListener("click", () => {
        const section = item.dataset.section;
        this.navigation.switchSection(section);
      });
    });

    // Tabs (se existirem)
    this.tabBtns?.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.tab;
        this.navigation.switchTab(tab);
      });
    });

    // Instance Selector (NOVO)
    this.instanceSelect?.addEventListener("change", (e) => {
      this.instances.handleInstanceChange(e.target.value);
    });

    // Refresh Instances (NOVO)
    this.btnRefreshInstances?.addEventListener("click", () => {
      this.instances.loadInstances();
    });

    // File Upload
    this.fileUploadArea?.addEventListener("click", () => {
      this.fileInput?.click();
    });

    this.fileUploadArea?.addEventListener("dragover", (e) => {
      e.preventDefault();
      this.fileUploadArea.classList.add("dragover");
    });

    this.fileUploadArea?.addEventListener("dragleave", () => {
      this.fileUploadArea.classList.remove("dragover");
    });

    this.fileUploadArea?.addEventListener("drop", (e) => {
      e.preventDefault();
      this.fileUploadArea.classList.remove("dragover");
      const file = e.dataTransfer.files[0];
      if (file) {
        this.numbers.handleFileSelect(file);
      }
    });

    this.fileInput?.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        this.numbers.handleFileSelect(file);
      }
    });

    this.btnRemoveFile?.addEventListener("click", () => {
      this.numbers.removeFile();
    });

    this.btnImportFile?.addEventListener("click", () => {
      this.numbers.importFile();
    });

    // Status Filter
    this.statusFilter?.addEventListener("change", (e) => {
      this.currentStatusFilter = e.target.value;
      this.numbers.loadNumbers(this.currentStatusFilter);
    });

    // Clear buttons
    this.btnClearAll?.addEventListener("click", () => {
      this.numbers.clearAllNumbers();
    });

    this.btnClearSent?.addEventListener("click", () => {
      this.numbers.clearSentNumbers();
    });

    this.btnClearFailed?.addEventListener("click", () => {
      this.numbers.clearFailedNumbers();
    });

    // Disparo
    this.messageSelect?.addEventListener("change", () => {
      this.dispatch.selectMessageFromDisparo();
    });

    this.btnExecuteDisparo?.addEventListener("click", () => {
      this.dispatch.executeDisparo();
    });

    // Status refresh
    this.btnRefreshStatus?.addEventListener("click", () => {
      this.status.refreshStatus();
    });
  }

  /**
   * Carrega dados iniciais da aplicação
   */
  async loadInitialData() {
    try {
      // Carrega instâncias primeiro (NOVO)
      await this.instances.loadInstances();

      // Carrega mensagens
      await this.messages.loadMessages();

      // Carrega números
      await this.numbers.loadNumbers(this.currentStatusFilter);

      // Atualiza status
      await this.status.updateStatusBreakdown();

      // Verifica requisitos do disparo
      await this.dispatch.checkRequirements();

      console.log("📊 Dados iniciais carregados");
    } catch (error) {
      console.error("Erro ao carregar dados iniciais:", error);
      this.utility.showStatus("Erro ao carregar dados iniciais", "error");
    }
  }

  /**
   * Recarrega todos os dados
   */
  async reloadAll() {
    await this.loadInitialData();
    this.utility.showStatus("Dados recarregados", "success");
  }
}

// Inicializa o renderer
const droneRenderer = new DroneRenderer();

export default droneRenderer;
