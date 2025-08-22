// renderer/guiConfig/configRenderer.js
class ConfigManager {
  constructor() {
    this.initializeElements();
    this.setupEventListeners();
  }

  initializeElements() {
    // Elementos do menu
    this.menuItems = document.querySelectorAll(".menu-item");
    this.sections = document.querySelectorAll(".section");
  }

  setupEventListeners() {
    // Navegação do menu lateral
    this.menuItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        const section = e.target.dataset.section;
        this.switchSection(section);
      });
    });
  }

  switchSection(sectionName) {
    // Atualiza menu
    this.menuItems.forEach((item) => item.classList.remove("active"));
    document
      .querySelector(`[data-section="${sectionName}"]`)
      .classList.add("active");

    // Atualiza seções
    this.sections.forEach((section) => section.classList.remove("active"));
    document.getElementById(`${sectionName}-section`).classList.add("active");

    // Delega inicialização para cada seção
    if (sectionName === "messages" && window.messagesManager) {
      window.messagesManager.loadMessages();
    }
  }
}

// Inicializa quando o DOM estiver pronto
document.addEventListener("DOMContentLoaded", () => {
  window.configManager = new ConfigManager();
});
