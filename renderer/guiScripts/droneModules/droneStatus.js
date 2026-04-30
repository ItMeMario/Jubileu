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

      // Renderiza as instâncias na lista de status
      this.renderInstancesStatus();

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
   * Renderiza a lista de instâncias na aba de Status
   */
  renderInstancesStatus() {
    const listDiv = this.manager.instancesStatusList;
    if (!listDiv) return;

    if (!this.manager.instances || !this.manager.instances.instances) {
      listDiv.innerHTML = '<div class="loading-instances">Carregando instâncias...</div>';
      return;
    }

    const instances = this.manager.instances.instances;

    if (instances.length === 0) {
      listDiv.innerHTML = '<div class="no-instances" style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 20px;">Nenhuma instância cadastrada</div>';
      return;
    }

    listDiv.innerHTML = '';
    
    instances.forEach(inst => {
      const item = document.createElement('div');
      
      let stateClass = 'disconnected';
      let stateText = 'Desconectado';
      let icon = '📱';
      
      switch(inst.status) {
        case 'connected':
          stateClass = 'connected';
          stateText = 'Conectado';
          icon = '🟢';
          break;
        case 'connecting':
          stateClass = 'connecting';
          stateText = 'Conectando';
          icon = '🟡';
          break;
        case 'qr_pending':
          stateClass = 'connecting';
          stateText = 'Aguardando QR';
          icon = '🟠';
          break;
        case 'auth_failure':
          stateClass = 'disconnected';
          stateText = 'Falha Auth';
          icon = '🔴';
          break;
        default:
          stateClass = 'disconnected';
          stateText = 'Desconectado';
          icon = '⚪';
      }
      
      item.className = `instance-status-item ${stateClass}`;
      
      let phoneStr = inst.phone_number || 'Sem número';
      if (inst.phone_number && this.manager.instances.formatPhoneNumber) {
        phoneStr = this.manager.instances.formatPhoneNumber(inst.phone_number);
      }

      item.innerHTML = `
        <div class="instance-icon">${icon}</div>
        <div class="instance-info">
            <div class="instance-name" title="${inst.name}">${inst.name}</div>
            <div class="instance-phone">${phoneStr}</div>
        </div>
        <div class="instance-state ${stateClass}">${stateText}</div>
      `;
      
      listDiv.appendChild(item);
    });
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
