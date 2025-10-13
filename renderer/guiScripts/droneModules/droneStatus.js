// renderer/guiScripts/droneModules/droneStatus.js

export default class DroneStatus {
  constructor(manager) {
    this.manager = manager;
  }

  async refreshStatus() {
    try {
      const statusResult = await window.droneAPI.obterStatusCliente();

      const indicator =
        this.manager.whatsappStatus.querySelector(".indicator-dot");
      const text = this.manager.whatsappStatus.querySelector(".indicator-text");

      if (statusResult.conectado) {
        indicator.textContent = "🟢";
        text.textContent = statusResult.statusTexto || "Conectado";
      } else {
        indicator.textContent = "🔴";
        text.textContent = statusResult.statusTexto || "Desconectado";
      }

      await this.manager.numbers.loadStatistics();
      await this.manager.dispatch.loadMessagesForSelect();

      this.manager.utility.showStatus("Status atualizado", "success");
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      this.manager.utility.showStatus("Erro ao atualizar status", "error");
    }
  }
}
