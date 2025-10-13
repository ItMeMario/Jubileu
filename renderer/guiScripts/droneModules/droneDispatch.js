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

      // Check Numbers
      const numbersResult = await window.droneAPI.listarNumerosAtuais();
      const hasNumbers = numbersResult.success && numbersResult.total > 0;
      this.updateRequirement(
        this.manager.reqNumbers,
        hasNumbers,
        hasNumbers
          ? `${numbersResult.total} número(s) cadastrado(s)`
          : "Adicione números"
      );

      // Enable/disable execute button
      const canExecute = statusResult.conectado && hasMessage && hasNumbers;
      this.manager.btnExecuteDisparo.disabled = !canExecute;
    } catch (error) {
      console.error("Erro ao verificar requisitos:", error);
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

  updateDisparoSummary() {
    const batchSize = parseInt(this.manager.batchSize.value) || 200;
    const totalNumbers = this.manager.currentNumbers.length;

    this.manager.summaryTotal.textContent = totalNumbers;
    this.manager.summaryBatches.textContent = Math.ceil(
      totalNumbers / batchSize
    );
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

    if (
      !confirm(
        `Executar disparo para ${this.manager.currentNumbers.length} números?`
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

      this.manager.isDisparoRunning = false;
      this.manager.btnExecuteDisparo.disabled = false;

      if (result.success) {
        this.showDisparoResults(result);
        this.manager.utility.showStatus("Disparo concluído", "success");
      } else {
        this.manager.utility.showStatus(
          result.error || "Erro no disparo",
          "error"
        );
      }
    } catch (error) {
      console.error("Erro ao executar disparo:", error);
      this.manager.utility.showStatus("Erro ao executar disparo", "error");
      this.manager.isDisparoRunning = false;
      this.manager.btnExecuteDisparo.disabled = false;
    } finally {
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
}
