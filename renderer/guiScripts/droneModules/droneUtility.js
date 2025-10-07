// renderer/guiScripts/droneModules/droneUtility.js

export default class DroneUtility {
  constructor(manager) {
    this.manager = manager;
  }

  showStatus(message, type = "info") {
    this.manager.statusDiv.textContent = message;
    this.manager.statusDiv.className = `status-message ${type} show`;

    setTimeout(() => {
      this.manager.statusDiv.classList.remove("show");
    }, 5000);
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}
