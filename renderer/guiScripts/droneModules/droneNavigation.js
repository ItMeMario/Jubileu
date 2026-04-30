// renderer/guiScripts/droneModules/droneNavigation.js

export default class DroneNavigation {
  constructor(manager) {
    this.manager = manager;
  }

  /**
   * Troca a seção ativa
   * @param {string} sectionName - Nome da seção (mensagens, numeros, disparo, status)
   */
  switchSection(sectionName) {
    // Atualiza menu items
    this.manager.menuItems.forEach((item) => item.classList.remove("active"));
    const activeMenuItem = document.querySelector(
      `[data-section="${sectionName}"]`
    );
    if (activeMenuItem) {
      activeMenuItem.classList.add("active");
    }

    // Atualiza seções
    this.manager.sections.forEach((section) =>
      section.classList.remove("active")
    );
    const activeSection = document.getElementById(`${sectionName}-section`);
    if (activeSection) {
      activeSection.classList.add("active");
    }

    // Carrega dados específicos da seção
    this.loadSectionData(sectionName);
  }

  /**
   * Carrega dados específicos de cada seção
   * @param {string} sectionName - Nome da seção
   */
  async loadSectionData(sectionName) {
    switch (sectionName) {
      case "mensagens":
        await this.loadMensagensSection();
        break;

      case "numeros":
        await this.loadNumerosSection();
        break;

      case "disparo":
        await this.loadDisparoSection();
        break;

      case "status":
        await this.loadStatusSection();
        break;

      default:
        console.warn("Seção desconhecida:", sectionName);
    }
  }

  /**
   * Carrega dados da seção Mensagens
   */
  async loadMensagensSection() {
    if (this.manager.messages) {
      await this.manager.messages.loadMessages();
    }
  }

  /**
   * Carrega dados da seção Números
   */
  async loadNumerosSection() {
    if (this.manager.numbers) {
      await this.manager.numbers.loadNumbers(this.manager.currentStatusFilter);
    }
  }

  /**
   * Carrega dados da seção Disparo
   */
  async loadDisparoSection() {
    // Verifica requisitos
    if (this.manager.dispatch) {
      await this.manager.dispatch.checkRequirements();
      await this.manager.dispatch.loadMessagesForSelect();
      this.manager.dispatch.updateDisparoSummary();
    }
  }

  /**
   * Carrega dados da seção Status
   */
  async loadStatusSection() {
    // Atualiza status das instâncias (NOVO)
    if (this.manager.instances) {
      await this.manager.instances.loadAllInstancesStatus();
    }

    // Atualiza status geral
    if (this.manager.status) {
      await this.manager.status.refreshStatus();
    }
  }

  /**
   * Troca a tab ativa (se houver tabs na seção)
   * @param {string} tabName - Nome da tab
   */
  switchTab(tabName) {
    // Remove active de todas as tabs
    this.manager.tabBtns?.forEach((btn) => btn.classList.remove("active"));

    // Adiciona active na tab selecionada
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeTab) {
      activeTab.classList.add("active");
    }

    // Atualiza conteúdo das tabs
    this.manager.tabContents?.forEach((content) =>
      content.classList.remove("active")
    );

    const activeContent = document.getElementById(`${tabName}-tab`);
    if (activeContent) {
      activeContent.classList.add("active");
    }
  }

  /**
   * Retorna a seção atualmente ativa
   * @returns {string|null} - Nome da seção ativa
   */
  getCurrentSection() {
    const activeSection = document.querySelector(".section.active");
    if (activeSection) {
      return activeSection.id.replace("-section", "");
    }
    return null;
  }

  /**
   * Navega para uma seção específica e opcionalmente executa uma ação
   * @param {string} sectionName - Nome da seção
   * @param {Function} callback - Callback a executar após navegação
   */
  async navigateTo(sectionName, callback = null) {
    this.switchSection(sectionName);

    if (callback && typeof callback === "function") {
      // Aguarda um tick para garantir que a seção foi carregada
      await new Promise((resolve) => setTimeout(resolve, 100));
      await callback();
    }
  }

  /**
   * Recarrega a seção atual
   */
  async reloadCurrentSection() {
    const currentSection = this.getCurrentSection();
    if (currentSection) {
      await this.loadSectionData(currentSection);
    }
  }
}
