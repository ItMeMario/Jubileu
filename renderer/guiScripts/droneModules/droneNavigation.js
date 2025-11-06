// renderer/guiScripts/droneModules/droneNavigation.js

export default class DroneNavigation {
  constructor(manager) {
    this.manager = manager;
  }

  switchSection(sectionName) {
    this.manager.menuItems.forEach((item) => item.classList.remove("active"));
    document
      .querySelector(`[data-section="${sectionName}"]`)
      .classList.add("active");

    this.manager.sections.forEach((section) =>
      section.classList.remove("active")
    );
    document.getElementById(`${sectionName}-section`).classList.add("active");

    // Carrega dados específicos da seção
    if (sectionName === "mensagens") {
      this.manager.messages.loadMessages();
    } else if (sectionName === "numeros") {
      this.manager.numbers.loadNumbers();
      this.manager.numbers.loadStatistics();
    } else if (sectionName === "disparo") {
      this.manager.dispatch.checkRequirements();
      this.manager.dispatch.loadMessagesForSelect();
      this.manager.dispatch.updateDisparoSummary();
    } else if (sectionName === "status") {
      this.manager.status.refreshStatus();
    }
  }

  switchTab(tabName) {
    this.manager.tabBtns.forEach((btn) => btn.classList.remove("active"));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add("active");

    this.manager.tabContents.forEach((content) =>
      content.classList.remove("active")
    );
    document.getElementById(`${tabName}-tab`).classList.add("active");
  }
}
