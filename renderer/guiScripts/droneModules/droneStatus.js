// renderer/guiScripts/droneModules/droneStatus.js

export default class DroneStatus {
  constructor(manager) {
    this.manager = manager;
    this.autoRefreshInterval = null;
    this.setupAutoRefresh();
  }

  /**
   * NOVO: Configura atualização automática a cada 30 segundos
   */
  setupAutoRefresh() {
    // Atualiza automaticamente quando estiver na seção Status
    this.autoRefreshInterval = setInterval(() => {
      const statusSection = document.getElementById("status-section");
      if (statusSection && statusSection.classList.contains("active")) {
        console.log("🔄 Auto-refresh do status (30s)");
        this.refreshStatus();
      }
    }, 10000); // 30 segundos
  }

  /**
   * NOVO: Limpa o intervalo quando necessário
   */
  destroy() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
      console.log("🛑 Auto-refresh do status desativado");
    }
  }

  async refreshStatus() {
    try {
      // Atualiza status do WhatsApp
      await this.updateWhatsAppStatus();

      // Atualiza estatísticas gerais
      if (this.manager.numbers) {
        await this.manager.numbers.loadStatistics();
      }

      // Atualiza mensagens disponíveis
      if (this.manager.dispatch) {
        await this.manager.dispatch.loadMessagesForSelect();
      }

      // Atualiza breakdown de status
      await this.updateStatusBreakdown();

      this.manager.utility.showStatus("Status atualizado", "success");
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      this.manager.utility.showStatus("Erro ao atualizar status", "error");
    }
  }

  /**
   * NOVO: Atualiza apenas o status do WhatsApp
   */
  async updateWhatsAppStatus() {
    try {
      const statusResult = await window.droneAPI.obterStatusCliente();

      const indicator =
        this.manager.whatsappStatus?.querySelector(".indicator-dot");
      const text =
        this.manager.whatsappStatus?.querySelector(".indicator-text");

      if (!indicator || !text) return;

      if (statusResult.conectado) {
        indicator.textContent = "🟢";
        text.textContent = statusResult.statusTexto || "Conectado";
        this.manager.whatsappStatus.classList.remove("disconnected");
        this.manager.whatsappStatus.classList.add("connected");
      } else {
        indicator.textContent = "🔴";
        text.textContent = statusResult.statusTexto || "Desconectado";
        this.manager.whatsappStatus.classList.remove("connected");
        this.manager.whatsappStatus.classList.add("disconnected");
      }
    } catch (error) {
      console.error("Erro ao atualizar status WhatsApp:", error);
    }
  }

  /**
   * Atualiza o breakdown de status na seção de Status
   */
  async updateStatusBreakdown() {
    try {
      const result = await window.droneAPI.obterEstatisticasNumeros();

      if (!result.success || !result.estatisticas) {
        console.warn("Não foi possível obter estatísticas para breakdown");
        return;
      }

      const stats = result.estatisticas;

      // Atualiza total geral
      const statusTotal = document.getElementById("status-total");
      if (statusTotal) {
        statusTotal.textContent = stats.total || 0;
      }

      // Atualiza valores do breakdown
      const breakdownPending = document.getElementById("breakdown-pending");
      const breakdownSent = document.getElementById("breakdown-sent");
      const breakdownFailed = document.getElementById("breakdown-failed");

      if (breakdownPending) {
        breakdownPending.textContent = stats.porStatus?.pending || 0;
      }
      if (breakdownSent) {
        breakdownSent.textContent = stats.porStatus?.sent || 0;
      }
      if (breakdownFailed) {
        breakdownFailed.textContent = stats.porStatus?.failed || 0;
      }

      // Atualiza percentuais do breakdown
      const breakdownPendingPercent = document.getElementById(
        "breakdown-pending-percent"
      );
      const breakdownSentPercent = document.getElementById(
        "breakdown-sent-percent"
      );
      const breakdownFailedPercent = document.getElementById(
        "breakdown-failed-percent"
      );

      if (breakdownPendingPercent) {
        breakdownPendingPercent.textContent = `(${
          stats.percentuais?.pending || 0
        }%)`;
      }
      if (breakdownSentPercent) {
        breakdownSentPercent.textContent = `(${stats.percentuais?.sent || 0}%)`;
      }
      if (breakdownFailedPercent) {
        breakdownFailedPercent.textContent = `(${
          stats.percentuais?.failed || 0
        }%)`;
      }

      console.log("✅ Breakdown atualizado:", {
        total: stats.total,
        pending: stats.porStatus?.pending || 0,
        sent: stats.porStatus?.sent || 0,
        failed: stats.porStatus?.failed || 0,
        percentuais: stats.percentuais,
      });
    } catch (error) {
      console.error("Erro ao atualizar breakdown:", error);
    }
  }

  /**
   * NOVO: Atualiza contagem de mensagens
   */
  async updateMessagesCount() {
    try {
      const result = await window.droneAPI.listarMensagens();

      const statusMessages = document.getElementById("status-messages");
      if (statusMessages && result.success) {
        statusMessages.textContent = result.total || 0;
      }
    } catch (error) {
      console.error("Erro ao atualizar contagem de mensagens:", error);
    }
  }
}
