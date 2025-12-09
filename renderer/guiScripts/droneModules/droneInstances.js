// renderer/guiScripts/droneModules/droneInstances.js

export default class DroneInstances {
  constructor(manager) {
    this.manager = manager;
  }

  /**
   * Carrega instâncias conectadas do backend
   */
  async loadInstances() {
    try {
      this.manager.btnRefreshInstances?.classList.add("loading");

      const result = await window.droneAPI.listarInstanciasConectadas();

      if (result.success) {
        this.manager.connectedInstances = result.instances || [];
        this.renderInstanceSelector();
        this.updateInstanceWarning();
      } else {
        console.error("Erro ao carregar instâncias:", result.error);
        this.manager.utility.showStatus(
          "Erro ao carregar instâncias: " + result.error,
          "error"
        );
      }
    } catch (error) {
      console.error("Erro ao carregar instâncias:", error);
      this.manager.utility.showStatus("Erro ao carregar instâncias", "error");
    } finally {
      this.manager.btnRefreshInstances?.classList.remove("loading");
    }
  }

  /**
   * Renderiza o dropdown de seleção de instância
   */
  renderInstanceSelector() {
    const select = this.manager.instanceSelect;
    if (!select) return;

    // Limpa opções
    select.innerHTML = "";

    if (this.manager.connectedInstances.length === 0) {
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
    this.manager.connectedInstances.forEach((instance) => {
      const option = document.createElement("option");
      option.value = instance.instanceId;
      option.textContent = instance.displayName;
      select.appendChild(option);
    });

    // Se havia uma instância selecionada, tenta manter
    if (this.manager.selectedInstanceId) {
      const stillExists = this.manager.connectedInstances.find(
        (i) => i.instanceId === this.manager.selectedInstanceId
      );
      if (stillExists) {
        select.value = this.manager.selectedInstanceId;
      } else {
        this.handleInstanceChange("");
      }
    }
  }

  /**
   * Gerencia mudança de instância selecionada
   * @param {string} instanceId - ID da instância selecionada
   */
  handleInstanceChange(instanceId) {
    this.manager.selectedInstanceId = instanceId || null;

    if (instanceId) {
      const instance = this.manager.connectedInstances.find(
        (i) => i.instanceId === instanceId
      );
      this.manager.selectedInstanceInfo = instance || null;
    } else {
      this.manager.selectedInstanceInfo = null;
    }

    this.updateInstanceStatus();
    this.updateInstanceWarning();
    this.updateDisparoInstanceInfo();

    // Atualiza requisitos do disparo
    if (this.manager.dispatch) {
      this.manager.dispatch.checkRequirements();
    }

    console.log(
      "Instância selecionada:",
      this.manager.selectedInstanceId,
      this.manager.selectedInstanceInfo
    );
  }

  /**
   * Atualiza o indicador de status da instância na sidebar
   */
  updateInstanceStatus() {
    const statusEl = this.manager.instanceStatus;
    if (!statusEl) return;

    if (this.manager.selectedInstanceInfo) {
      statusEl.innerHTML = `
        <span class="status-dot">🟢</span>
        <span class="status-text">${
          this.manager.selectedInstanceInfo.phoneFormatted || "Conectado"
        }</span>
      `;
      statusEl.className = "instance-status connected";
    } else if (this.manager.connectedInstances.length === 0) {
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

  /**
   * Mostra/esconde aviso de instância não selecionada
   */
  updateInstanceWarning() {
    const warning = this.manager.noInstanceWarning;
    if (!warning) return;

    if (!this.manager.selectedInstanceId) {
      warning.classList.add("visible");
    } else {
      warning.classList.remove("visible");
    }
  }

  /**
   * Atualiza informação da instância na seção de disparo
   */
  updateDisparoInstanceInfo() {
    const badge =
      this.manager.disparoInstanceInfo?.querySelector(".instance-badge");
    const nameEl = this.manager.disparoInstanceName;
    const phoneEl = this.manager.disparoInstancePhone;

    if (!badge || !nameEl || !phoneEl) return;

    if (this.manager.selectedInstanceInfo) {
      nameEl.textContent = this.manager.selectedInstanceInfo.name;
      phoneEl.textContent =
        this.manager.selectedInstanceInfo.phoneFormatted || "";
      badge.className = "instance-badge connected";
    } else {
      nameEl.textContent = "Nenhuma instância selecionada";
      phoneEl.textContent = "";
      badge.className = "instance-badge no-instance";
    }
  }

  /**
   * Carrega status de todas as instâncias (para seção Status)
   */
  async loadAllInstancesStatus() {
    try {
      const listEl = this.manager.instancesStatusList;
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
      if (this.manager.instancesStatusList) {
        this.manager.instancesStatusList.innerHTML =
          '<div class="no-instances">Erro ao carregar instâncias</div>';
      }
    }
  }

  /**
   * Renderiza cards de status das instâncias
   * @param {Array} instances - Lista de instâncias com status
   */
  renderInstancesStatus(instances) {
    const listEl = this.manager.instancesStatusList;
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
              <div class="instance-name">${this.manager.utility.escapeHtml(
                instance.name
              )}</div>
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

  /**
   * Retorna a instância atualmente selecionada
   * @returns {Object|null} - Dados da instância ou null
   */
  getSelectedInstance() {
    return this.manager.selectedInstanceInfo;
  }

  /**
   * Retorna o ID da instância selecionada
   * @returns {string|null} - ID da instância ou null
   */
  getSelectedInstanceId() {
    return this.manager.selectedInstanceId;
  }

  /**
   * Verifica se há uma instância selecionada e conectada
   * @returns {boolean}
   */
  isInstanceReady() {
    return !!(
      this.manager.selectedInstanceId && this.manager.selectedInstanceInfo
    );
  }
}
