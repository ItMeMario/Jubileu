// renderer/guiScripts/droneModules/droneNavigation.js

class DroneNavigation {
  constructor(manager) {
    this.manager = manager;
  }

  async switchSection(sectionName) {
    try {
      // Remove active de todos os menus e seções
      this.manager.menuItems.forEach((item) => item.classList.remove("active"));
      this.manager.sections.forEach((section) =>
        section.classList.remove("active")
      );

      // Adiciona active no menu e seção selecionados
      const activeMenuItem = document.querySelector(
        `[data-section="${sectionName}"]`
      );
      const activeSection = document.getElementById(`${sectionName}-section`);

      if (activeMenuItem) activeMenuItem.classList.add("active");
      if (activeSection) activeSection.classList.add("active");

      // Atualiza dados específicos de cada seção
      await this.refreshSectionData(sectionName);
    } catch (error) {
      console.error("Erro ao trocar seção:", error);
    }
  }

  async refreshSectionData(sectionName) {
    try {
      switch (sectionName) {
        case "mensagens":
          // Recarrega mensagens
          if (this.manager.messages) {
            await this.manager.messages.loadMessages();
          }
          break;

        case "numeros":
          // Recarrega estatísticas e lista de números
          if (this.manager.numbers) {
            await this.manager.numbers.loadStatistics();
            const currentFilter =
              document.getElementById("status-filter")?.value || "all";
            await this.manager.numbers.loadNumbers(currentFilter);
          }
          break;

        case "disparo":
          // Atualiza requisitos e resumo
          if (this.manager.dispatch) {
            await this.manager.dispatch.checkRequirements();
            await this.manager.dispatch.updateDisparoSummary();
            await this.manager.dispatch.loadMessagesForSelect();
          }
          break;

        case "status":
          // Atualiza status completo
          if (this.manager.status) {
            await this.manager.status.refreshStatus();
          }
          break;
      }
    } catch (error) {
      console.error(`Erro ao atualizar dados da seção ${sectionName}:`, error);
    }
  }
}

export default DroneNavigation;
