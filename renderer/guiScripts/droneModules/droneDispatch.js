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

      // Atualiza os requisitos
      this.checkRequirements();
    } else {
      console.error("Mensagem não encontrada:", selectedIndex);
      this.manager.utility.showStatus("Erro ao selecionar mensagem", "error");
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
    let numbersToSend = this.manager.currentNumbers.length;

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

    try {
      const result = await window.droneAPI.executarDisparoDrone(
        selectedIndex,
        batchSize
      );

      this.manager.isDisparoRunning = false;
      this.manager.btnExecuteDisparo.disabled = false;

      if (result.success) {
        this.manager.utility.showStatus(
          `Disparo concluído: ${
            result.detalhes?.totalEnviados || 0
          } enviados, ${result.detalhes?.totalFalhas || 0} falhas`,
          "success"
        );

        // Atualiza lista e estatísticas após disparo
        await this.manager.numbers.loadNumbers(
          this.manager.currentStatusFilter
        );
        await this.manager.numbers.loadStatistics();
        await this.manager.status.updateStatusBreakdown(); // ATUALIZA O BREAKDOWN
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
    }
  }
}
