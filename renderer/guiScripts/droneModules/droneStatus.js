// renderer/guiScripts/droneModules/droneStatus.js

export default class DroneStatus {
  constructor(manager) {
    this.manager = manager;
  }

  async refreshStatus() {
    try {
      // Atualiza status do WhatsApp
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

      // Atualiza estatísticas gerais
      await this.manager.numbers.loadStatistics();
      await this.manager.dispatch.loadMessagesForSelect();

      // NOVO: Atualiza breakdown de status
      await this.updateStatusBreakdown();

      this.manager.utility.showStatus("Status atualizado", "success");
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      this.manager.utility.showStatus("Erro ao atualizar status", "error");
    }
  }

  /**
   * NOVO: Atualiza o breakdown de status na seção de Status
   */
  async updateStatusBreakdown() {
    try {
      const result = await window.droneAPI.obterEstatisticasNumeros();

      if (result.success && result.estatisticas) {
        const stats = result.estatisticas;

        // Atualiza valores do breakdown
        if (this.manager.breakdownPending) {
          this.manager.breakdownPending.textContent =
            stats.porStatus?.pending || 0;
        }

        if (this.manager.breakdownSent) {
          this.manager.breakdownSent.textContent = stats.porStatus?.sent || 0;
        }

        if (this.manager.breakdownFailed) {
          this.manager.breakdownFailed.textContent =
            stats.porStatus?.failed || 0;
        }

        // Atualiza percentuais do breakdown
        if (this.manager.breakdownPendingPercent) {
          this.manager.breakdownPendingPercent.textContent = `(${
            stats.percentuais?.pending || 0
          }%)`;
        }

        if (this.manager.breakdownSentPercent) {
          this.manager.breakdownSentPercent.textContent = `(${
            stats.percentuais?.sent || 0
          }%)`;
        }

        if (this.manager.breakdownFailedPercent) {
          this.manager.breakdownFailedPercent.textContent = `(${
            stats.percentuais?.failed || 0
          }%)`;
        }

        console.log("Breakdown atualizado:", {
          pending: stats.porStatus?.pending || 0,
          sent: stats.porStatus?.sent || 0,
          failed: stats.porStatus?.failed || 0,
          percentuais: stats.percentuais,
        });
      }
    } catch (error) {
      console.error("Erro ao atualizar breakdown:", error);
    }
  }
}
