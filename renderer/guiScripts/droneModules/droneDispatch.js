// renderer/guiScripts/droneModules/droneDispatch.js

export default class DroneDispatch {
  constructor(manager) {
    this.manager = manager;
  }

  async checkRequirements() {
    try {
      // Check WhatsApp
      const statusResult = await window.droneAPI.obterStatusCliente();
      this.updateRequirement(
        this.manager.reqWhatsapp,
        statusResult.conectado,
        statusResult.statusTexto || "Verificando..."
      );

      // Check Message
      const hasMessage = this.manager.selectedMessageIndex !== null;
      this.updateRequirement(
        this.manager.reqMessage,
        hasMessage,
        hasMessage ? "Mensagem selecionada" : "Selecione uma mensagem"
      );

      // Check Numbers - CORRIGIDO: usa estatísticas para contar pending + failed
      const statsResult = await window.droneAPI.obterEstatisticasNumeros();
      let hasNumbers = false;
      let numbersText = "Adicione números";

      if (statsResult.success && statsResult.estatisticas) {
        const pending = statsResult.estatisticas.porStatus?.pending || 0;
        const failed = statsResult.estatisticas.porStatus?.failed || 0;
        const toSend = pending + failed;

        hasNumbers = toSend > 0;
        numbersText = hasNumbers
          ? `${toSend} número(s) a enviar (${pending} pendentes, ${failed} falhas)`
          : "Nenhum número pendente ou com falha";
      }

      this.updateRequirement(this.manager.reqNumbers, hasNumbers, numbersText);

      // Enable/disable execute button
      const canExecute = statusResult.conectado && hasMessage && hasNumbers;
      this.manager.btnExecuteDisparo.disabled = !canExecute;

      return canExecute;
    } catch (error) {
      console.error("Erro ao verificar requisitos:", error);
      return false;
    }
  }

  updateRequirement(element, isValid, text) {
    const icon = element.querySelector(".req-icon");
    const textEl = element.querySelector(".req-text");

    if (isValid) {
      icon.textContent = "✅";
      element.classList.add("valid");
      element.classList.remove("invalid");
    } else {
      icon.textContent = "❌";
      element.classList.add("invalid");
      element.classList.remove("valid");
    }

    textEl.textContent = text;
  }

  async loadMessagesForSelect() {
    try {
      const result = await window.droneAPI.listarMensagens();

      if (result.success && result.mensagens) {
        // Armazena as mensagens
        this.manager.allMessages = result.mensagens;

        // Popula o select
        this.manager.messageSelect.innerHTML =
          '<option value="">Selecione uma mensagem...</option>' +
          result.mensagens
            .map(
              (msg) =>
                `<option value="${msg.indice}">#${msg.indice} - (${
                  msg.locale
                }) ${msg.conteudo.substring(0, 50)}...</option>`
            )
            .join("");

        // Se já tinha uma mensagem selecionada, mantém a seleção
        if (this.manager.selectedMessageIndex !== null) {
          this.manager.messageSelect.value = this.manager.selectedMessageIndex;
        }

        if (this.manager.statusMessages) {
          this.manager.statusMessages.textContent = result.mensagens.length;
        }
      }
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
    }
  }

  selectMessageFromDisparo() {
    const selectedIndex = parseInt(this.manager.messageSelect.value);

    if (!selectedIndex || isNaN(selectedIndex)) {
      // Desseleciona se não houver valor válido
      this.manager.selectedMessageIndex = null;
      this.manager.selectedMessageData = null;
      this.checkRequirements();
      this.updateDisparoSummary();
      return;
    }

    // Encontra a mensagem selecionada
    const selectedMessage = this.manager.allMessages.find(
      (m) => m.indice === selectedIndex
    );

    if (selectedMessage) {
      this.manager.selectedMessageIndex = selectedIndex;
      this.manager.selectedMessageData = selectedMessage;

      this.manager.utility.showStatus(
        `Mensagem #${selectedIndex} selecionada`,
        "success"
      );

      // Atualiza os requisitos e resumo
      this.checkRequirements();
      this.updateDisparoSummary();
    } else {
      console.error("Mensagem não encontrada:", selectedIndex);
      this.manager.utility.showStatus("Erro ao selecionar mensagem", "error");
    }
  }

  /**
   * Atualiza resumo com números a enviar (pending + failed)
   */
  async updateDisparoSummary() {
    try {
      const batchSize = parseInt(this.manager.batchSize.value) || 200;

      // Busca estatísticas para calcular pending + failed
      const statsResult = await window.droneAPI.obterEstatisticasNumeros();

      let totalNumbers = 0;
      let numbersToSend = 0;

      if (statsResult.success && statsResult.estatisticas) {
        totalNumbers = statsResult.estatisticas.total || 0;
        const pending = statsResult.estatisticas.porStatus?.pending || 0;
        const failed = statsResult.estatisticas.porStatus?.failed || 0;
        numbersToSend = pending + failed;
      }

      // Atualiza campos
      if (this.manager.summaryTotal) {
        this.manager.summaryTotal.textContent = totalNumbers;
      }

      // Campo de números a enviar
      const summaryToSend = document.getElementById("summary-to-send");
      if (summaryToSend) {
        summaryToSend.textContent = numbersToSend;
      }

      // Calcula batches baseado em números a enviar (não no total)
      const batches =
        numbersToSend > 0 ? Math.ceil(numbersToSend / batchSize) : 0;

      if (this.manager.summaryBatches) {
        this.manager.summaryBatches.textContent = batches;
      }

      console.log("Resumo do disparo atualizado:", {
        total: totalNumbers,
        aEnviar: numbersToSend,
        batches: batches,
        batchSize: batchSize,
      });
    } catch (error) {
      console.error("Erro ao atualizar resumo:", error);
      // Fallback: tenta usar currentNumbers se disponível
      const totalNumbers = this.manager.currentNumbers?.length || 0;
      if (this.manager.summaryTotal) {
        this.manager.summaryTotal.textContent = totalNumbers;
      }
      const summaryToSend = document.getElementById("summary-to-send");
      if (summaryToSend) {
        summaryToSend.textContent = totalNumbers;
      }
      const batchSize = parseInt(this.manager.batchSize.value) || 200;
      if (this.manager.summaryBatches) {
        this.manager.summaryBatches.textContent = Math.ceil(
          totalNumbers / batchSize
        );
      }
    }
  }

  async executeDisparo() {
    if (this.manager.isDisparoRunning) {
      this.manager.utility.showStatus("Disparo já em andamento", "error");
      return;
    }

    const selectedIndex = this.manager.selectedMessageIndex;
    const batchSize = parseInt(this.manager.batchSize.value) || 200;

    if (!selectedIndex) {
      this.manager.utility.showStatus("Selecione uma mensagem", "error");
      return;
    }

    // Busca estatísticas para mostrar confirmação correta
    const statsResult = await window.droneAPI.obterEstatisticasNumeros();
    let numbersToSend = 0;

    if (statsResult.success && statsResult.estatisticas) {
      const pending = statsResult.estatisticas.porStatus?.pending || 0;
      const failed = statsResult.estatisticas.porStatus?.failed || 0;
      numbersToSend = pending + failed;
    }

    if (numbersToSend === 0) {
      this.manager.utility.showStatus(
        "Não há números pendentes ou com falha para enviar",
        "error"
      );
      return;
    }

    if (
      !confirm(
        `Executar disparo para ${numbersToSend} números (Pendentes + Falhas)?`
      )
    ) {
      return;
    }

    this.manager.isDisparoRunning = true;
    this.manager.btnExecuteDisparo.disabled = true;
    this.manager.disparoProgress.style.display = "block";
    this.manager.disparoResults.style.display = "none";

    try {
      const result = await window.droneAPI.executarDisparoDrone(
        selectedIndex,
        batchSize
      );

      if (result.success) {
        this.showDisparoResults(result);
        this.manager.utility.showStatus("Disparo concluído", "success");

        // ATUALIZA TUDO APÓS DISPARO
        await this.refreshAfterDisparo();
      } else {
        this.manager.utility.showStatus(
          result.error || "Erro no disparo",
          "error"
        );
      }
    } catch (error) {
      console.error("Erro ao executar disparo:", error);
      this.manager.utility.showStatus("Erro ao executar disparo", "error");
    } finally {
      this.manager.isDisparoRunning = false;
      this.manager.btnExecuteDisparo.disabled = false;
      this.manager.disparoProgress.style.display = "none";
    }
  }

  showDisparoResults(result) {
    const details = result.detalhes;

    this.manager.resultsContent.innerHTML = `
      <div class="summary-grid">
        <div class="summary-item">
          <span class="summary-label">Total enviados:</span>
          <span class="summary-value">${details.totalEnviados || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Total de falhas:</span>
          <span class="summary-value">${details.totalFalhas || 0}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Batches processados:</span>
          <span class="summary-value">${details.batchesProcessados || 0}/${
      details.totalBatches || 0
    }</span>
        </div>
      </div>
      <p style="margin-top: 15px; color: #666;">${
        result.message || "Disparo finalizado"
      }</p>
    `;

    this.manager.disparoResults.style.display = "block";
  }

  /**
   * NOVO: Atualiza todos os dados após disparo completo
   */
  async refreshAfterDisparo() {
    try {
      console.log("🔄 Atualizando dados após disparo...");

      // 1. Atualiza estatísticas
      if (this.manager.numbers) {
        await this.manager.numbers.loadStatistics();
      }

      // 2. Recarrega lista de números com filtro atual
      if (this.manager.numbers) {
        const currentFilter = this.manager.currentStatusFilter || "all";
        await this.manager.numbers.loadNumbers(currentFilter);
      }

      // 3. Atualiza requisitos
      await this.checkRequirements();

      // 4. Atualiza resumo
      await this.updateDisparoSummary();

      // 5. Atualiza seção Status se existir
      if (this.manager.status) {
        await this.manager.status.updateStatusBreakdown();
      }

      console.log("✅ Dados atualizados após disparo");
    } catch (error) {
      console.error("Erro ao atualizar após disparo:", error);
    }
  }
}
