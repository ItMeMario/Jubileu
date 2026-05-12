// renderer/guiScripts/droneModules/droneInstances.js

export default class DroneInstances {
  constructor(manager) {
    this.manager = manager;
    this.instances = [];
    this.maxInstances = 30;
    this.instanceToRemove = null;

    // Elementos do DOM (assumindo que o renderer passa ou achamos no document)
    this.elements = {
      grid: document.getElementById("instances-grid"),
      noInstances: document.getElementById("no-instances"),
      instanceCount: document.getElementById("instance-count"),
      btnAddInstance: document.getElementById("btn-add-instance"),
      btnAddFirst: document.getElementById("btn-add-first"),
      template: document.getElementById("instance-card-template"),

      // Modal criar
      modalCreate: document.getElementById("modal-create-instance"),
      inputName: document.getElementById("instance-name"),
      btnModalCancel: document.getElementById("btn-modal-cancel"),
      btnModalConfirm: document.getElementById("btn-modal-confirm"),

      // Modal remover
      modalRemove: document.getElementById("modal-remove-instance"),
      removeMessage: document.getElementById("remove-instance-message"),
      btnRemoveCancel: document.getElementById("btn-remove-cancel"),
      btnRemoveConfirm: document.getElementById("btn-remove-confirm"),
      btnRemoveAll: document.getElementById("btn-remove-all-instances"),
    };

    // Binds
    this.handleQR = this.handleQR.bind(this);
    this.handleReady = this.handleReady.bind(this);
    this.handleDisconnected = this.handleDisconnected.bind(this);
    this.handleAuthFailure = this.handleAuthFailure.bind(this);
    this.handleAuthenticated = this.handleAuthenticated.bind(this);
    this.handleLoading = this.handleLoading.bind(this);
    this.handleCreated = this.handleCreated.bind(this);
    this.handleRemoved = this.handleRemoved.bind(this);
    this.handleRenamed = this.handleRenamed.bind(this);
    
    this.setupEventListeners();
    this.setupBackendListeners();
  }

  setupEventListeners() {
    // Botões de adicionar
    this.elements.btnAddInstance?.addEventListener("click", () => this.openCreateModal());
    this.elements.btnAddFirst?.addEventListener("click", () => this.openCreateModal());

    // Modal criar
    this.elements.btnModalCancel?.addEventListener("click", () => this.closeCreateModal());
    this.elements.btnModalConfirm?.addEventListener("click", () => this.confirmCreate());
    this.elements.inputName?.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.confirmCreate();
    });
    this.elements.modalCreate?.addEventListener("click", (e) => {
      if (e.target === this.elements.modalCreate) this.closeCreateModal();
    });

    // Modal remover
    this.elements.btnRemoveCancel?.addEventListener("click", () => this.closeRemoveModal());
    this.elements.btnRemoveConfirm?.addEventListener("click", () => this.confirmRemove());
    this.elements.modalRemove?.addEventListener("click", (e) => {
      if (e.target === this.elements.modalRemove) this.closeRemoveModal();
    });
    this.elements.btnRemoveAll?.addEventListener("click", () => this.openRemoveAllModal());

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeCreateModal();
        this.closeRemoveModal();
      }
    });
  }

  setupBackendListeners() {
    if (window.droneAPI && window.droneAPI.onQR) {
      window.droneAPI.onQR(this.handleQR);
      window.droneAPI.onReady(this.handleReady);
      window.droneAPI.onDisconnected(this.handleDisconnected);
      window.droneAPI.onAuthFailure(this.handleAuthFailure);
      window.droneAPI.onAuthenticated(this.handleAuthenticated);
      window.droneAPI.onLoading(this.handleLoading);
      window.droneAPI.onCreated(this.handleCreated);
      window.droneAPI.onRemoved(this.handleRemoved);
      window.droneAPI.onRenamed(this.handleRenamed);
    }
  }

  async loadInstances() {
    try {
      const result = await window.droneAPI.listInstances();
      if (result.success) {
        this.instances = result.data;
        this.renderAllInstances();
      } else {
        console.error("Erro ao carregar instâncias:", result.message);
      }
    } catch (error) {
      console.error("Erro ao carregar instâncias:", error);
    }
  }

  renderAllInstances() {
    if (!this.elements.grid) return;
    const cards = this.elements.grid.querySelectorAll(".instance-card");
    cards.forEach((card) => card.remove());

    this.updateCount();

    if (this.instances.length === 0) {
      if(this.elements.noInstances) this.elements.noInstances.style.display = "block";
    } else {
      if(this.elements.noInstances) this.elements.noInstances.style.display = "none";
      this.instances.forEach((instance) => {
        this.renderInstanceCard(instance);
      });
    }

    this.updateAddButton();
    
    // Atualiza requisitos de disparo (deve haver pelo menos 1 conectada)
    if (this.manager.dispatch) {
      this.manager.dispatch.checkRequirements();
    }
  }

  renderInstanceCard(instance) {
    if (!this.elements.template) return;
    const template = this.elements.template.content.cloneNode(true);
    const card = template.querySelector(".instance-card");

    card.dataset.instanceId = instance.instance_id;

    const nameText = card.querySelector(".name-text");
    if(nameText) nameText.textContent = instance.name;

    this.setupCardButtons(card, instance.instance_id);
    this.updateCardState(card, instance.status, instance);

    if(this.elements.noInstances) {
      this.elements.grid.insertBefore(card, this.elements.noInstances);
    } else {
      this.elements.grid.appendChild(card);
    }
  }

  setupCardButtons(card, instanceId) {
    const btnStart = card.querySelector(".btn-start-instance");
    if(btnStart) btnStart.addEventListener("click", () => this.startInstance(instanceId));

    const btnStop = card.querySelector(".btn-stop-instance");
    if(btnStop) btnStop.addEventListener("click", () => this.stopInstance(instanceId));

    const btnReconnect = card.querySelector(".btn-reconnect-instance");
    if(btnReconnect) btnReconnect.addEventListener("click", () => this.reconnectInstance(instanceId));

    const btnRemove = card.querySelector(".btn-remove-instance");
    if(btnRemove) btnRemove.addEventListener("click", () => this.openRemoveModal(instanceId));

    const btnEditName = card.querySelector(".btn-edit-name");
    if(btnEditName) btnEditName.addEventListener("click", () => this.startEditName(card, instanceId));
  }

  updateCardState(card, status, data = {}) {
    if (!card) return;
    const badge = card.querySelector(".status-badge");
    const placeholder = card.querySelector(".instance-placeholder");
    const qrContainer = card.querySelector(".instance-qr-container");
    const loading = card.querySelector(".instance-loading");
    const info = card.querySelector(".instance-info");

    const btnStart = card.querySelector(".btn-start-instance");
    const btnStop = card.querySelector(".btn-stop-instance");
    const btnReconnect = card.querySelector(".btn-reconnect-instance");
    const btnRemove = card.querySelector(".btn-remove-instance");

    if(placeholder) placeholder.style.display = "none";
    if(qrContainer) qrContainer.style.display = "none";
    if(loading) loading.style.display = "none";
    if(info) info.style.display = "none";

    if(btnStart) btnStart.style.display = "none";
    if(btnStop) btnStop.style.display = "none";
    if(btnReconnect) btnReconnect.style.display = "none";

    if(badge) badge.className = "status-badge";

    switch (status) {
      case "disconnected":
        if(badge) { badge.classList.add("disconnected"); badge.textContent = "Desconectado"; }
        if(placeholder) placeholder.style.display = "block";
        if(btnStart) btnStart.style.display = "inline-flex";
        if(btnRemove) btnRemove.disabled = false;
        break;

      case "connecting":
        if(badge) { badge.classList.add("connecting"); badge.textContent = "Conectando"; }
        if(loading) {
            loading.style.display = "flex";
            const lt = loading.querySelector(".loading-text");
            if(lt) lt.textContent = "Conectando...";
        }
        if(btnStop) btnStop.style.display = "inline-flex";
        if(btnRemove) btnRemove.disabled = true;
        break;

      case "qr_pending":
        if(badge) { badge.classList.add("qr_pending"); badge.textContent = "Aguardando QR"; }
        if(qrContainer) {
            qrContainer.style.display = "block";
            if (data.qrCode) qrContainer.querySelector(".qr-image").src = data.qrCode;
        }
        if(btnStop) btnStop.style.display = "inline-flex";
        if(btnRemove) btnRemove.disabled = true;
        break;

      case "connected":
        if(badge) { badge.classList.add("connected"); badge.textContent = "Conectado"; }
        if(info) {
            info.style.display = "block";
            const pn = info.querySelector(".phone-number");
            if(pn) pn.style.display = "none";
        }
        if(btnStop) btnStop.style.display = "inline-flex";
        if(btnReconnect) btnReconnect.style.display = "inline-flex";
        if(btnRemove) btnRemove.disabled = true;
        break;

      case "auth_failure":
        if(badge) { badge.classList.add("auth_failure"); badge.textContent = "Falha na Auth"; }
        if(placeholder) {
            placeholder.style.display = "block";
            const icon = placeholder.querySelector(".placeholder-icon");
            if(icon) icon.textContent = "⚠️";
            const text = placeholder.querySelector(".placeholder-text");
            if(text) text.textContent = "Falha na autenticação";
        }
        if(btnStart) btnStart.style.display = "inline-flex";
        if(btnReconnect) btnReconnect.style.display = "inline-flex";
        if(btnRemove) btnRemove.disabled = false;
        break;

      default:
        if(badge) { badge.classList.add("disconnected"); badge.textContent = status || "Desconhecido"; }
        if(placeholder) placeholder.style.display = "block";
        if(btnStart) btnStart.style.display = "inline-flex";
        if(btnRemove) btnRemove.disabled = false;
    }

    if (this.manager.dispatch) {
      this.manager.dispatch.checkRequirements();
    }
  }

  getCardByInstanceId(instanceId) {
    if(!this.elements.grid) return null;
    return this.elements.grid.querySelector(`[data-instance-id="${instanceId}"]`);
  }

  formatPhoneNumber(phone) {
    if (!phone) return "Número não disponível";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    } else if (cleaned.length === 12) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 8)}-${cleaned.slice(8)}`;
    }
    return phone;
  }

  // Ações
  async startInstance(instanceId) {
    const card = this.getCardByInstanceId(instanceId);
    if (!card) return;
    this.updateCardState(card, "connecting");
    try {
      const result = await window.droneAPI.startInstance(instanceId);
      if (!result.success) {
        this.updateCardState(card, "disconnected");
        if(this.manager.utility) this.manager.utility.showStatus(`Erro: ${result.message}`, "error");
      }
    } catch (error) {
      this.updateCardState(card, "disconnected");
      if(this.manager.utility) this.manager.utility.showStatus("Erro ao iniciar instância", "error");
    }
  }

  async stopInstance(instanceId) {
    const card = this.getCardByInstanceId(instanceId);
    if (!card) return;
    try {
      const result = await window.droneAPI.stopInstance(instanceId);
      if (result.success) {
        this.updateCardState(card, "disconnected");
      } else {
        if(this.manager.utility) this.manager.utility.showStatus(`Erro: ${result.message}`, "error");
      }
    } catch (error) {
      if(this.manager.utility) this.manager.utility.showStatus("Erro ao parar instância", "error");
    }
  }

  async reconnectInstance(instanceId) {
    const card = this.getCardByInstanceId(instanceId);
    if (!card) return;
    this.updateCardState(card, "connecting");
    const lt = card.querySelector(".loading-text");
    if(lt) lt.textContent = "Reconectando...";
    try {
      const result = await window.droneAPI.reconnectInstance(instanceId);
      if (!result.success) {
        this.updateCardState(card, "disconnected");
        if(this.manager.utility) this.manager.utility.showStatus(`Erro: ${result.message}`, "error");
      }
    } catch (error) {
      this.updateCardState(card, "disconnected");
      if(this.manager.utility) this.manager.utility.showStatus("Erro ao reconectar instância", "error");
    }
  }

  // Modais
  openCreateModal() {
    if(this.elements.inputName) this.elements.inputName.value = "";
    if(this.elements.modalCreate) this.elements.modalCreate.style.display = "flex";
    if(this.elements.inputName) this.elements.inputName.focus();
  }

  closeCreateModal() {
    if(this.elements.modalCreate) this.elements.modalCreate.style.display = "none";
    if(this.elements.inputName) this.elements.inputName.value = "";
  }

  async confirmCreate() {
    if(!this.elements.inputName) return;
    const name = this.elements.inputName.value.trim();
    if (!name) {
      this.elements.inputName.focus();
      return;
    }
    if(this.elements.btnModalConfirm) {
        this.elements.btnModalConfirm.disabled = true;
        this.elements.btnModalConfirm.textContent = "Criando...";
    }
    try {
      const result = await window.droneAPI.createInstance(name);
      if (result.success) {
        this.closeCreateModal();
      } else {
        if(this.manager.utility) this.manager.utility.showStatus(`Erro: ${result.message}`, "error");
      }
    } catch (error) {
      if(this.manager.utility) this.manager.utility.showStatus("Erro ao criar instância", "error");
    } finally {
      if(this.elements.btnModalConfirm) {
          this.elements.btnModalConfirm.disabled = false;
          this.elements.btnModalConfirm.textContent = "Criar";
      }
    }
  }

  openRemoveModal(instanceId) {
    const instance = this.instances.find((i) => i.instance_id === instanceId);
    if (!instance) return;
    this.instanceToRemove = instanceId;
    if(this.elements.removeMessage) this.elements.removeMessage.textContent = `Tem certeza que deseja remover a instância "${instance.name}"?`;
    if(this.elements.modalRemove) this.elements.modalRemove.style.display = "flex";
  }

  closeRemoveModal() {
    if(this.elements.modalRemove) this.elements.modalRemove.style.display = "none";
    this.instanceToRemove = null;
  }

  openRemoveAllModal() {
    if (this.instances.length === 0) return;
    this.instanceToRemove = "all";
    if(this.elements.removeMessage) this.elements.removeMessage.textContent = `Tem certeza que deseja remover TODAS as instâncias do Drone?`;
    if(this.elements.modalRemove) this.elements.modalRemove.style.display = "flex";
  }

  async confirmRemove() {
    if (!this.instanceToRemove) return;
    const instanceId = this.instanceToRemove;
    if(this.elements.btnRemoveConfirm) {
        this.elements.btnRemoveConfirm.disabled = true;
        this.elements.btnRemoveConfirm.textContent = "Removendo...";
    }
    try {
      if (instanceId === "all") {
        const instancesToDelete = [...this.instances];
        for (const instance of instancesToDelete) {
           await window.droneAPI.removeInstance(instance.instance_id);
        }
        this.closeRemoveModal();
      } else {
        const result = await window.droneAPI.removeInstance(instanceId);
        if (result.success) {
          this.closeRemoveModal();
        } else {
          if(this.manager.utility) this.manager.utility.showStatus(`Erro: ${result.message}`, "error");
        }
      }
    } catch (error) {
      if(this.manager.utility) this.manager.utility.showStatus("Erro ao remover instância", "error");
    } finally {
      if(this.elements.btnRemoveConfirm) {
          this.elements.btnRemoveConfirm.disabled = false;
          this.elements.btnRemoveConfirm.textContent = "Remover";
      }
    }
  }

  startEditName(card, instanceId) {
    const nameContainer = card.querySelector(".instance-name");
    const nameText = nameContainer.querySelector(".name-text");
    const btnEdit = nameContainer.querySelector(".btn-edit-name");
    const currentName = nameText.textContent;
    const input = document.createElement("input");
    input.type = "text";
    input.value = currentName;
    input.maxLength = 50;
    nameText.style.display = "none";
    btnEdit.style.display = "none";
    nameContainer.insertBefore(input, nameText);
    input.focus();
    input.select();

    const saveName = async () => {
      const newName = input.value.trim();
      if (newName && newName !== currentName) {
        try {
          await window.droneAPI.renameInstance(instanceId, newName);
          nameText.textContent = newName;
          const instance = this.instances.find((i) => i.instance_id === instanceId);
          if (instance) instance.name = newName;
        } catch (error) {
          console.error("Erro ao renomear:", error);
        }
      }
      input.remove();
      nameText.style.display = "";
      btnEdit.style.display = "";
    };

    input.addEventListener("blur", saveName);
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        input.blur();
      }
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        input.value = currentName;
        input.blur();
      }
    });
  }

  // Handlers do Backend
  handleQR({ instanceId, qrImage }) {
    const card = this.getCardByInstanceId(instanceId);
    if (!card) return;
    this.updateCardState(card, "qr_pending", { qrCode: qrImage });
  }

  handleAuthenticated({ instanceId }) {
    const card = this.getCardByInstanceId(instanceId);
    if (!card) return;
    this.updateCardState(card, "connecting");
    const lt = card.querySelector(".loading-text");
    if(lt) lt.textContent = "Autenticado, carregando...";
  }

  handleReady({ instanceId, info }) {
    const card = this.getCardByInstanceId(instanceId);
    if (!card) return;
    const instance = this.instances.find((i) => i.instance_id === instanceId);
    if (instance) {
      instance.status = "connected";
      instance.phone_number = info?.phoneNumber;
    }
    this.updateCardState(card, "connected", { info });
  }

  handleDisconnected({ instanceId, reason }) {
    const card = this.getCardByInstanceId(instanceId);
    if (!card) return;
    const instance = this.instances.find((i) => i.instance_id === instanceId);
    if (instance) {
      instance.status = "disconnected";
    }
    this.updateCardState(card, "disconnected");
  }

  handleAuthFailure({ instanceId, message }) {
    const card = this.getCardByInstanceId(instanceId);
    if (!card) return;
    this.updateCardState(card, "auth_failure");
    if(this.manager.utility) this.manager.utility.showStatus(`Falha na autenticação: ${message}`, "error");
  }

  handleLoading({ instanceId, percent, message }) {
    const card = this.getCardByInstanceId(instanceId);
    if (!card) return;
    const loadingText = card.querySelector(".loading-text");
    if (loadingText) {
      loadingText.textContent = `${message} (${percent}%)`;
    }
  }

  handleCreated({ instance }) {
    this.instances.push(instance);
    this.renderInstanceCard(instance);
    if(this.elements.noInstances) this.elements.noInstances.style.display = "none";
    this.updateCount();
    this.updateAddButton();
    if(this.manager.utility) this.manager.utility.showStatus(`Instância "${instance.name}" criada!`, "success");
  }

  handleRemoved({ instanceId }) {
    this.instances = this.instances.filter((i) => i.instance_id !== instanceId);
    const card = this.getCardByInstanceId(instanceId);
    if (card) {
      card.remove();
    }
    if (this.instances.length === 0) {
      if(this.elements.noInstances) this.elements.noInstances.style.display = "block";
    }
    this.updateCount();
    this.updateAddButton();
    if(this.manager.utility) this.manager.utility.showStatus("Instância removida!", "success");
  }

  handleRenamed({ instanceId, name }) {
    const instance = this.instances.find((i) => i.instance_id === instanceId);
    if (instance) {
      instance.name = name;
    }
    const card = this.getCardByInstanceId(instanceId);
    if (card) {
      const nt = card.querySelector(".name-text");
      if(nt) nt.textContent = name;
    }
  }

  // Utilitários
  updateCount() {
    if(this.elements.instanceCount) this.elements.instanceCount.textContent = `${this.instances.length}/${this.maxInstances}`;
  }

  updateAddButton() {
    const disabled = this.instances.length >= this.maxInstances;
    if(this.elements.btnAddInstance) {
        this.elements.btnAddInstance.disabled = disabled;
        this.elements.btnAddInstance.title = disabled ? "Limite máximo de instâncias atingido" : "";
    }
    if(this.elements.btnAddFirst) this.elements.btnAddFirst.disabled = disabled;
  }

  isInstanceReady() {
    return this.instances.some(i => i.status === "connected");
  }

  async loadAllInstancesStatus() {
     return; // não é mais necessário aqui
  }

  getSelectedInstanceId() {
      return "drone_global"; // a partir de agora é global
  }
}
