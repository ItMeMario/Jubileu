// renderer/guiScripts/droneModules/droneStatus.js

export default class DroneStatus {
  constructor(manager) {
    this.manager = manager;
  }

  /**
   * Retorna 'drone_global' como identificador
   */
  getSelectedInstanceId() {
    return "drone_global";
  }

  /**
   * Atualiza todo o status do sistema
   */
  async refreshStatus() {
    try {
      // Atualiza instâncias conectadas
      if (this.manager.instances) {
        await this.manager.instances.loadInstances();
      }

      // Atualiza status do WhatsApp da instância selecionada
      await this.updateWhatsAppStatus();

      // Atualiza total de números e mensagens
      await this.updateGeneralStats();

      // Atualiza mensagens disponíveis
      await this.manager.dispatch.loadMessagesForSelect();

      // Atualiza breakdown de status
      await this.updateStatusBreakdown();

      this.manager.utility.showStatus("Status atualizado", "success");
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      this.manager.utility.showStatus("Erro ao atualizar status", "error");
    }
  }

  /**
   * Atualiza status do WhatsApp (baseado em qualquer instância conectada)
   */
  async updateWhatsAppStatus() {
    try {
      const indicator =
        this.manager.whatsappStatus?.querySelector(".indicator-dot");
      const text =
        this.manager.whatsappStatus?.querySelector(".indicator-text");

      if (!indicator || !text) return;

      // Verifica se há instância pronta
      if (this.manager.instances?.isInstanceReady()) {
        indicator.textContent = "🟢";
        text.textContent = "Conectado (Global)";
      } else {
        indicator.textContent = "🔴";
        text.textContent = "Desconectado";
      }
    } catch (error) {
      console.error("Erro ao atualizar status do WhatsApp:", error);
    }
  }

  /**
   * Atualiza estatísticas gerais (Total de números e Mensagens)
   */
  async updateGeneralStats() {
    try {
      const instanceId = this.getSelectedInstanceId();

      const result = await window.droneAPI.obterEstatisticasNumeros(instanceId);

      if (result.success && result.estatisticas) {
        const stats = result.estatisticas;

        // Atualiza total de números
        if (this.manager.statusTotal) {
          this.manager.statusTotal.textContent = stats.total || 0;
        }

        console.log(`[${instanceId}] Estatísticas gerais atualizadas:`, {
          total: stats.total,
        });
      }
    } catch (error) {
      console.error("Erro ao atualizar estatísticas gerais:", error);
    }
  }

  /**
   * Atualiza o breakdown de status na seção de Status
   */
  async updateStatusBreakdown() {
    try {
      const instanceId = this.getSelectedInstanceId();

      const result = await window.droneAPI.obterEstatisticasNumeros(instanceId);

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

        console.log(`[${instanceId}] Breakdown de status atualizado:`, {
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

  /**
   * Limpa o breakdown quando não há instância selecionada
   */
  clearBreakdown() {
    if (this.manager.breakdownPending) {
      this.manager.breakdownPending.textContent = "0";
    }
    if (this.manager.breakdownSent) {
      this.manager.breakdownSent.textContent = "0";
    }
    if (this.manager.breakdownFailed) {
      this.manager.breakdownFailed.textContent = "0";
    }
    if (this.manager.breakdownPendingPercent) {
      this.manager.breakdownPendingPercent.textContent = "(0%)";
    }
    if (this.manager.breakdownSentPercent) {
      this.manager.breakdownSentPercent.textContent = "(0%)";
    }
    if (this.manager.breakdownFailedPercent) {
      this.manager.breakdownFailedPercent.textContent = "(0%)";
    }

    console.log("Breakdown zerado: nenhuma instância selecionada");
  }

  /**
   * Atualiza contadores de instâncias na seção de status
   */
  async updateInstancesCount() {
    try {
      const result = await window.droneAPI.obterStatusTodasInstancias();

      if (result.success) {
        // Atualiza contador de instâncias conectadas se existir elemento
        if (this.manager.instancesConnectedCount) {
          this.manager.instancesConnectedCount.textContent =
            result.connected || 0;
        }

        // Atualiza contador total de instâncias se existir elemento
        if (this.manager.instancesTotalCount) {
          this.manager.instancesTotalCount.textContent = result.total || 0;
        }

        console.log("Contadores de instâncias atualizados:", {
          connected: result.connected,
          total: result.total,
        });
      }
    } catch (error) {
      console.error("Erro ao atualizar contadores de instâncias:", error);
    }
  }

  /**
   * Retorna resumo do status atual do sistema
   * @returns {Object} - Resumo do status
   */
  async getStatusSummary() {
    try {
      const instanceId = this.getSelectedInstanceId();

      const [statsResult, instancesResult] = await Promise.all([
        window.droneAPI.obterEstatisticasNumeros(instanceId),
        window.droneAPI.obterStatusTodasInstancias(),
      ]);

      return {
        numbers: {
          total: statsResult.estatisticas?.total || 0,
          pending: statsResult.estatisticas?.porStatus?.pending || 0,
          sent: statsResult.estatisticas?.porStatus?.sent || 0,
          failed: statsResult.estatisticas?.porStatus?.failed || 0,
        },
        instances: {
          total: instancesResult.total || 0,
          connected: instancesResult.connected || 0,
        },
        messages: this.manager.allMessages?.length || 0,
        selectedInstance: instanceId,
        selectedMessage: this.manager.selectedMessageIndex || null,
      };
    } catch (error) {
      console.error("Erro ao obter resumo do status:", error);
      return null;
    }
  }
}
