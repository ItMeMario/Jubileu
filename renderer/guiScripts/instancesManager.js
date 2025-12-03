// ========================================
// Gerenciador de Instâncias WhatsApp
// ========================================

class InstancesManager {
  constructor() {
    // Estado
    this.instances = [];
    this.maxInstances = 5;
    this.instanceToRemove = null;

    // Elementos do DOM
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
    };

    // Bind dos métodos
    this.handleQR = this.handleQR.bind(this);
    this.handleReady = this.handleReady.bind(this);
    this.handleDisconnected = this.handleDisconnected.bind(this);
    this.handleAuthFailure = this.handleAuthFailure.bind(this);
    this.handleAuthenticated = this.handleAuthenticated.bind(this);
    this.handleLoading = this.handleLoading.bind(this);
    this.handleCreated = this.handleCreated.bind(this);
    this.handleRemoved = this.handleRemoved.bind(this);
    this.handleRenamed = this.handleRenamed.bind(this);
  }

  // ========================================
  // Inicialização
  // ========================================

  async init() {
    console.log("🚀 Inicializando InstancesManager...");

    try {
      // Inicializa o manager no backend
      await window.electronAPI.instances.initialize();

      // Carrega configuração
      const configResult = await window.electronAPI.instances.getConfig();
      if (configResult.success) {
        this.maxInstances = configResult.data.maxInstances;
      }

      // Configura event listeners do DOM
      this.setupEventListeners();

      // Configura listeners de eventos do backend
      this.setupBackendListeners();

      // Carrega instâncias existentes
      await this.loadInstances();

      console.log("✅ InstancesManager inicializado");
    } catch (error) {
      console.error("❌ Erro ao inicializar InstancesManager:", error);
    }
  }

  setupEventListeners() {
    // Botões de adicionar
    this.elements.btnAddInstance.addEventListener("click", () =>
      this.openCreateModal()
    );
    this.elements.btnAddFirst.addEventListener("click", () =>
      this.openCreateModal()
    );

    // Modal criar - cancelar
    this.elements.btnModalCancel.addEventListener("click", () =>
      this.closeCreateModal()
    );

    // Modal criar - confirmar
    this.elements.btnModalConfirm.addEventListener("click", () =>
      this.confirmCreate()
    );

    // Modal criar - Enter para confirmar
    this.elements.inputName.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.confirmCreate();
    });

    // Modal criar - fechar ao clicar fora
    this.elements.modalCreate.addEventListener("click", (e) => {
      if (e.target === this.elements.modalCreate) this.closeCreateModal();
    });

    // Modal remover - cancelar
    this.elements.btnRemoveCancel.addEventListener("click", () =>
      this.closeRemoveModal()
    );

    // Modal remover - confirmar
    this.elements.btnRemoveConfirm.addEventListener("click", () =>
      this.confirmRemove()
    );

    // Modal remover - fechar ao clicar fora
    this.elements.modalRemove.addEventListener("click", (e) => {
      if (e.target === this.elements.modalRemove) this.closeRemoveModal();
    });

    // Tecla Escape para fechar modais
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.closeCreateModal();
        this.closeRemoveModal();
      }
    });
  }

  setupBackendListeners() {
    const api = window.electronAPI.instances;

    api.onQR(this.handleQR);
    api.onReady(this.handleReady);
    api.onDisconnected(this.handleDisconnected);
    api.onAuthFailure(this.handleAuthFailure);
    api.onAuthenticated(this.handleAuthenticated);
    api.onLoading(this.handleLoading);
    api.onCreated(this.handleCreated);
    api.onRemoved(this.handleRemoved);
    api.onRenamed(this.handleRenamed);
  }

  // ========================================
  // Carregar e renderizar instâncias
  // ========================================

  async loadInstances() {
    try {
      const result = await window.electronAPI.instances.list();

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
    // Limpa grid (exceto o no-instances)
    const cards = this.elements.grid.querySelectorAll(".instance-card");
    cards.forEach((card) => card.remove());

    // Atualiza contador
    this.updateCount();

    // Mostra/esconde mensagem de vazio
    if (this.instances.length === 0) {
      this.elements.noInstances.style.display = "block";
    } else {
      this.elements.noInstances.style.display = "none";

      // Renderiza cada instância
      this.instances.forEach((instance) => {
        this.renderInstanceCard(instance);
      });
    }

    // Atualiza estado do botão adicionar
    this.updateAddButton();
  }

  renderInstanceCard(instance) {
    // Clona o template
    const template = this.elements.template.content.cloneNode(true);
    const card = template.querySelector(".instance-card");

    // Define o ID
    card.dataset.instanceId = instance.instance_id;

    // Define o nome
    const nameText = card.querySelector(".name-text");
    nameText.textContent = instance.name;

    // Configura botões do card
    this.setupCardButtons(card, instance.instance_id);

    // Atualiza o estado visual
    this.updateCardState(card, instance.status, instance);

    // Insere antes do no-instances
    this.elements.grid.insertBefore(card, this.elements.noInstances);
  }

  setupCardButtons(card, instanceId) {
    // Botão iniciar
    const btnStart = card.querySelector(".btn-start-instance");
    btnStart.addEventListener("click", () => this.startInstance(instanceId));

    // Botão parar
    const btnStop = card.querySelector(".btn-stop-instance");
    btnStop.addEventListener("click", () => this.stopInstance(instanceId));

    // Botão reconectar
    const btnReconnect = card.querySelector(".btn-reconnect-instance");
    btnReconnect.addEventListener("click", () =>
      this.reconnectInstance(instanceId)
    );

    // Botão remover
    const btnRemove = card.querySelector(".btn-remove-instance");
    btnRemove.addEventListener("click", () => this.openRemoveModal(instanceId));

    // Botão editar nome
    const btnEditName = card.querySelector(".btn-edit-name");
    btnEditName.addEventListener("click", () =>
      this.startEditName(card, instanceId)
    );
  }

  // ========================================
  // Atualização de estado do card
  // ========================================

  updateCardState(card, status, data = {}) {
    // Elementos do card
    const badge = card.querySelector(".status-badge");
    const placeholder = card.querySelector(".instance-placeholder");
    const qrContainer = card.querySelector(".instance-qr-container");
    const loading = card.querySelector(".instance-loading");
    const info = card.querySelector(".instance-info");

    const btnStart = card.querySelector(".btn-start-instance");
    const btnStop = card.querySelector(".btn-stop-instance");
    const btnReconnect = card.querySelector(".btn-reconnect-instance");
    const btnRemove = card.querySelector(".btn-remove-instance");

    // Esconde todos os estados do body
    placeholder.style.display = "none";
    qrContainer.style.display = "none";
    loading.style.display = "none";
    info.style.display = "none";

    // Esconde todos os botões de ação
    btnStart.style.display = "none";
    btnStop.style.display = "none";
    btnReconnect.style.display = "none";

    // Remove classes antigas do badge
    badge.className = "status-badge";

    switch (status) {
      case "disconnected":
        badge.classList.add("disconnected");
        badge.textContent = "Desconectado";
        placeholder.style.display = "block";
        btnStart.style.display = "inline-flex";
        btnRemove.disabled = false;
        break;

      case "connecting":
        badge.classList.add("connecting");
        badge.textContent = "Conectando";
        loading.style.display = "flex";
        loading.querySelector(".loading-text").textContent = "Conectando...";
        btnStop.style.display = "inline-flex";
        btnRemove.disabled = true;
        break;

      case "qr_pending":
        badge.classList.add("qr_pending");
        badge.textContent = "Aguardando QR";
        qrContainer.style.display = "block";
        if (data.qrCode) {
          qrContainer.querySelector(".qr-image").src = data.qrCode;
        }
        btnStop.style.display = "inline-flex";
        btnRemove.disabled = true;
        break;

      case "connected":
        badge.classList.add("connected");
        badge.textContent = "Conectado";
        info.style.display = "block";
        const phoneNumber =
          data.info?.phoneNumber ||
          data.phone_number ||
          "Número não disponível";
        info.querySelector(".phone-number").textContent =
          this.formatPhoneNumber(phoneNumber);
        btnStop.style.display = "inline-flex";
        btnReconnect.style.display = "inline-flex";
        btnRemove.disabled = true;
        break;

      case "auth_failure":
        badge.classList.add("auth_failure");
        badge.textContent = "Falha na Auth";
        placeholder.style.display = "block";
        placeholder.querySelector(".placeholder-icon").textContent = "⚠️";
        placeholder.querySelector(".placeholder-text").textContent =
          "Falha na autenticação";
        btnStart.style.display = "inline-flex";
        btnReconnect.style.display = "inline-flex";
        btnRemove.disabled = false;
        break;

      default:
        badge.classList.add("disconnected");
        badge.textContent = status || "Desconhecido";
        placeholder.style.display = "block";
        btnStart.style.display = "inline-flex";
        btnRemove.disabled = false;
    }
  }

  getCardByInstanceId(instanceId) {
    return this.elements.grid.querySelector(
      `[data-instance-id="${instanceId}"]`
    );
  }

  formatPhoneNumber(phone) {
    if (!phone) return "Número não disponível";

    // Remove caracteres não numéricos
    const cleaned = phone.replace(/\D/g, "");

    // Formata para o padrão brasileiro
    if (cleaned.length === 13) {
      // +55 11 99999-9999
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(
        4,
        9
      )}-${cleaned.slice(9)}`;
    } else if (cleaned.length === 12) {
      // +55 11 9999-9999
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(
        4,
        8
      )}-${cleaned.slice(8)}`;
    }

    return phone;
  }

  // ========================================
  // Ações das instâncias
  // ========================================

  async startInstance(instanceId) {
    const card = this.getCardByInstanceId(instanceId);
    if (!card) return;

    console.log(`▶️ Iniciando instância: ${instanceId}`);

    // Atualiza UI para conectando
    this.updateCardState(card, "connecting");

    try {
      const result = await window.electronAPI.instances.start(instanceId);

      if (!result.success) {
        console.error("Erro ao iniciar:", result.message);
        this.updateCardState(card, "disconnected");
        this.showStatus(`Erro: ${result.message}`, "error");
      }
    } catch (error) {
      console.error("Erro ao iniciar instância:", error);
      this.updateCardState(card, "disconnected");
      this.showStatus("Erro ao iniciar instância", "error");
    }
  }

  async stopInstance(instanceId) {
    const card = this.getCardByInstanceId(instanceId);
    if (!card) return;

    console.log(`⏹️ Parando instância: ${instanceId}`);

    try {
      const result = await window.electronAPI.instances.stop(instanceId);

      if (result.success) {
        this.updateCardState(card, "disconnected");
      } else {
        console.error("Erro ao parar:", result.message);
        this.showStatus(`Erro: ${result.message}`, "error");
      }
    } catch (error) {
      console.error("Erro ao parar instância:", error);
      this.showStatus("Erro ao parar instância", "error");
    }
  }

  async reconnectInstance(instanceId) {
    const card = this.getCardByInstanceId(instanceId);
    if (!card) return;

    console.log(`🔄 Reconectando instância: ${instanceId}`);

    // Atualiza UI para conectando
    this.updateCardState(card, "connecting");
    card.querySelector(".loading-text").textContent = "Reconectando...";

    try {
      const result = await window.electronAPI.instances.reconnect(instanceId);

      if (!result.success) {
        console.error("Erro ao reconectar:", result.message);
        this.updateCardState(card, "disconnected");
        this.showStatus(`Erro: ${result.message}`, "error");
      }
    } catch (error) {
      console.error("Erro ao reconectar instância:", error);
      this.updateCardState(card, "disconnected");
      this.showStatus("Erro ao reconectar instância", "error");
    }
  }

  // ========================================
  // Criar instância
  // ========================================

  openCreateModal() {
    this.elements.inputName.value = "";
    this.elements.modalCreate.classList.add("show");
    this.elements.inputName.focus();
  }

  closeCreateModal() {
    this.elements.modalCreate.classList.remove("show");
    this.elements.inputName.value = "";
  }

  async confirmCreate() {
    const name = this.elements.inputName.value.trim();

    if (!name) {
      this.elements.inputName.focus();
      return;
    }

    // Desabilita botão durante a criação
    this.elements.btnModalConfirm.disabled = true;
    this.elements.btnModalConfirm.textContent = "Criando...";

    try {
      const result = await window.electronAPI.instances.create(name);

      if (result.success) {
        this.closeCreateModal();
        // A instância será adicionada via evento onCreated
      } else {
        this.showStatus(`Erro: ${result.message}`, "error");
      }
    } catch (error) {
      console.error("Erro ao criar instância:", error);
      this.showStatus("Erro ao criar instância", "error");
    } finally {
      this.elements.btnModalConfirm.disabled = false;
      this.elements.btnModalConfirm.textContent = "Criar";
    }
  }

  // ========================================
  // Remover instância
  // ========================================

  openRemoveModal(instanceId) {
    const instance = this.instances.find((i) => i.instance_id === instanceId);
    if (!instance) return;

    this.instanceToRemove = instanceId;
    this.elements.removeMessage.textContent = `Tem certeza que deseja remover a instância "${instance.name}"?`;
    this.elements.modalRemove.classList.add("show");
  }

  closeRemoveModal() {
    this.elements.modalRemove.classList.remove("show");
    this.instanceToRemove = null;
  }

  async confirmRemove() {
    if (!this.instanceToRemove) return;

    const instanceId = this.instanceToRemove;

    // Desabilita botão durante a remoção
    this.elements.btnRemoveConfirm.disabled = true;
    this.elements.btnRemoveConfirm.textContent = "Removendo...";

    try {
      const result = await window.electronAPI.instances.remove(instanceId);

      if (result.success) {
        this.closeRemoveModal();
        // A instância será removida via evento onRemoved
      } else {
        this.showStatus(`Erro: ${result.message}`, "error");
      }
    } catch (error) {
      console.error("Erro ao remover instância:", error);
      this.showStatus("Erro ao remover instância", "error");
    } finally {
      this.elements.btnRemoveConfirm.disabled = false;
      this.elements.btnRemoveConfirm.textContent = "Remover";
    }
  }

  // ========================================
  // Editar nome
  // ========================================

  startEditName(card, instanceId) {
    const nameContainer = card.querySelector(".instance-name");
    const nameText = nameContainer.querySelector(".name-text");
    const btnEdit = nameContainer.querySelector(".btn-edit-name");

    const currentName = nameText.textContent;

    // Cria input
    const input = document.createElement("input");
    input.type = "text";
    input.value = currentName;
    input.maxLength = 50;

    // Esconde elementos atuais
    nameText.style.display = "none";
    btnEdit.style.display = "none";

    // Insere input
    nameContainer.insertBefore(input, nameText);
    input.focus();
    input.select();

    // Handler para salvar
    const saveName = async () => {
      const newName = input.value.trim();

      if (newName && newName !== currentName) {
        try {
          await window.electronAPI.instances.rename(instanceId, newName);
          nameText.textContent = newName;

          // Atualiza no array local
          const instance = this.instances.find(
            (i) => i.instance_id === instanceId
          );
          if (instance) instance.name = newName;
        } catch (error) {
          console.error("Erro ao renomear:", error);
        }
      }

      // Restaura elementos
      input.remove();
      nameText.style.display = "";
      btnEdit.style.display = "";
    };

    // Eventos do input
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

  // ========================================
  // Handlers de eventos do backend
  // ========================================

  handleQR({ instanceId, qrImage }) {
    console.log(`📱 QR Code recebido para: ${instanceId}`);

    const card = this.getCardByInstanceId(instanceId);
    if (!card) return;

    this.updateCardState(card, "qr_pending", { qrCode: qrImage });
  }

  handleAuthenticated({ instanceId }) {
    console.log(`✅ Autenticado: ${instanceId}`);

    const card = this.getCardByInstanceId(instanceId);
    if (!card) return;

    this.updateCardState(card, "connecting");
    card.querySelector(".loading-text").textContent =
      "Autenticado, carregando...";
  }

  handleReady({ instanceId, info }) {
    console.log(`✅ Pronto: ${instanceId}`, info);

    const card = this.getCardByInstanceId(instanceId);
    if (!card) return;

    // Atualiza instância local
    const instance = this.instances.find((i) => i.instance_id === instanceId);
    if (instance) {
      instance.status = "connected";
      instance.phone_number = info?.phoneNumber;
    }

    this.updateCardState(card, "connected", { info });
  }

  handleDisconnected({ instanceId, reason }) {
    console.log(`🔌 Desconectado: ${instanceId} - ${reason}`);

    const card = this.getCardByInstanceId(instanceId);
    if (!card) return;

    // Atualiza instância local
    const instance = this.instances.find((i) => i.instance_id === instanceId);
    if (instance) {
      instance.status = "disconnected";
    }

    this.updateCardState(card, "disconnected");
  }

  handleAuthFailure({ instanceId, message }) {
    console.log(`❌ Falha auth: ${instanceId} - ${message}`);

    const card = this.getCardByInstanceId(instanceId);
    if (!card) return;

    this.updateCardState(card, "auth_failure");
    this.showStatus(`Falha na autenticação: ${message}`, "error");
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
    console.log(`➕ Instância criada:`, instance);

    // Adiciona ao array local
    this.instances.push(instance);

    // Renderiza o card
    this.renderInstanceCard(instance);

    // Atualiza UI
    this.elements.noInstances.style.display = "none";
    this.updateCount();
    this.updateAddButton();

    this.showStatus(`Instância "${instance.name}" criada!`, "success");
  }

  handleRemoved({ instanceId }) {
    console.log(`🗑️ Instância removida: ${instanceId}`);

    // Remove do array local
    this.instances = this.instances.filter((i) => i.instance_id !== instanceId);

    // Remove o card
    const card = this.getCardByInstanceId(instanceId);
    if (card) {
      card.remove();
    }

    // Atualiza UI
    if (this.instances.length === 0) {
      this.elements.noInstances.style.display = "block";
    }
    this.updateCount();
    this.updateAddButton();

    this.showStatus("Instância removida!", "success");
  }

  handleRenamed({ instanceId, name }) {
    console.log(`✏️ Instância renomeada: ${instanceId} -> ${name}`);

    // Atualiza no array local
    const instance = this.instances.find((i) => i.instance_id === instanceId);
    if (instance) {
      instance.name = name;
    }

    // Atualiza no card
    const card = this.getCardByInstanceId(instanceId);
    if (card) {
      card.querySelector(".name-text").textContent = name;
    }
  }

  // ========================================
  // Utilitários
  // ========================================

  updateCount() {
    this.elements.instanceCount.textContent = `${this.instances.length}/${this.maxInstances}`;
  }

  updateAddButton() {
    const disabled = this.instances.length >= this.maxInstances;
    this.elements.btnAddInstance.disabled = disabled;
    this.elements.btnAddFirst.disabled = disabled;

    if (disabled) {
      this.elements.btnAddInstance.title =
        "Limite máximo de instâncias atingido";
    } else {
      this.elements.btnAddInstance.title = "";
    }
  }

  showStatus(message, type = "info") {
    const statusDiv = document.getElementById("status");
    if (statusDiv) {
      statusDiv.textContent = message;
      statusDiv.className = `status ${type}`;
      statusDiv.classList.remove("hidden");

      // Auto-esconde após 5 segundos
      setTimeout(() => {
        statusDiv.classList.add("hidden");
      }, 5000);
    }
  }

  // ========================================
  // Cleanup
  // ========================================

  destroy() {
    window.electronAPI.instances.removeAllListeners();
  }
}

// Cria instância global
const instancesManager = new InstancesManager();

// Exporta para uso global
window.instancesManager = instancesManager;
