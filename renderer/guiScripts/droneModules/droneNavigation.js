// renderer/guiScripts/droneModules/droneNavigation.js

export default class DroneNavigation {
  constructor(manager) {
    this.manager = manager;
  }

  /**
   * MELHORADO: Troca de seção com atualização de dados
   */
  async switchSection(sectionName) {
    try {
      // Remove active de todos os menus e seções
      this.manager.menuItems.forEach((item) => item.classList.remove("active"));

      const menuItem = document.querySelector(
        `[data-section="${sectionName}"]`
      );
      if (menuItem) {
        menuItem.classList.add("active");
      }

      this.manager.sections.forEach((section) =>
        section.classList.remove("active")
      );

      const targetSection = document.getElementById(`${sectionName}-section`);
      if (targetSection) {
        targetSection.classList.add("active");
      }

      // NOVO: Atualiza dados específicos da seção ao trocar
      await this.refreshSectionData(sectionName);

      console.log(`📄 Seção ativa: ${sectionName}`);
    } catch (error) {
      console.error("Erro ao trocar seção:", error);
    }
  }

  /**
   * NOVO: Atualiza dados específicos de cada seção
   */
  async refreshSectionData(sectionName) {
    try {
      switch (sectionName) {
        case "mensagens":
          console.log("🔄 Atualizando seção Mensagens...");
          if (this.manager.messages) {
            await this.manager.messages.loadMessages();
          }
          break;

        case "numeros":
          console.log("🔄 Atualizando seção Números...");
          if (this.manager.numbers) {
            // Atualiza estatísticas
            await this.manager.numbers.loadStatistics();

            // Recarrega lista com filtro atual
            const currentFilter = this.manager.currentStatusFilter || "all";
            await this.manager.numbers.loadNumbers(currentFilter);
          }
          break;

        case "disparo":
          console.log("🔄 Atualizando seção Disparo...");
          if (this.manager.dispatch) {
            // Verifica requisitos
            await this.manager.dispatch.checkRequirements();

            // Carrega mensagens para o select
            await this.manager.dispatch.loadMessagesForSelect();

            // Atualiza resumo do disparo
            await this.manager.dispatch.updateDisparoSummary();
          }
          break;

        case "status":
          console.log("🔄 Atualizando seção Status...");
          if (this.manager.status) {
            await this.manager.status.refreshStatus();
          }
          break;

        default:
          console.warn(`Seção desconhecida: ${sectionName}`);
      }

      console.log(`✅ Seção ${sectionName} atualizada`);
    } catch (error) {
      console.error(`Erro ao atualizar seção ${sectionName}:`, error);
    }
  }

  /**
   * Troca de tab (se houver tabs dentro de seções)
   */
  switchTab(tabName) {
    if (!this.manager.tabBtns || !this.manager.tabContents) {
      console.warn("Tabs não disponíveis nesta janela");
      return;
    }

    this.manager.tabBtns.forEach((btn) => btn.classList.remove("active"));

    const tabBtn = document.querySelector(`[data-tab="${tabName}"]`);
    if (tabBtn) {
      tabBtn.classList.add("active");
    }

    this.manager.tabContents.forEach((content) =>
      content.classList.remove("active")
    );

    const tabContent = document.getElementById(`${tabName}-tab`);
    if (tabContent) {
      tabContent.classList.add("active");
    }

    console.log(`📑 Tab ativa: ${tabName}`);
  }
}
