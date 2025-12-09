// renderer/guiScripts/droneModules/droneDispatch.js

export default class DroneDispatch {
  constructor(manager) {
    this.manager = manager;
  }

  /**
   * Verifica todos os requisitos para disparo
   */
  async checkRequirements() {
    try {
      // Check Instance (NOVO)
      const hasInstance = this.manager.instances?.isInstanceReady() || false;
      this.updateRequirement(
        this.manager.reqInstance,
        hasInstance,
        hasInstance ? "Instância selecionada" : "Selecione uma instância"
      );

      // Check WhatsApp (agora baseado na instância)
      let whatsappConnected = false;
      let whatsappText = "Verificando...";

      if (hasInstance) {
        // Se tem instância selecionada, considera conectado
        whatsappConnected = true;
        whatsappText = "WhatsApp conectado";
      } else {
        // Fallback: verifica status geral
        const statusResult = await window.droneAPI.obterStatusCliente(
          this.manager.selectedInstanceId
        );
        whatsappConnected = statusResult.conectado;
        whatsappText = statusResult.statusTexto || "Verificando...";
      }

      this.updateRequirement(
        this.manager.reqWhatsapp,
        whatsappConnected,
        whatsappText
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
      const canExecute =
        hasInstance && whatsappConnected && hasMessage && hasNumbers;
      if (this.manager.btnExecuteDisparo) {
        this.manager.btnExecuteDisparo.disabled = !canExecute;
      }
    } catch (error) {
      console.error("Erro ao verificar requisitos:", error);
    }
  }

  /**
   * Atualiza visual de um requisito
   * @param {HTMLElement} element - Elemento do requisito
   * @param {boolean} isValid - Se está válido
   * @param {string} text - Texto a exibir
   */
  updateRequirement(element, isValid, text) {
    if (!element) return;

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

    if (textEl) {
      textEl.textContent = text;
    }
  }

  /**
   * Carrega mensagens para o select de disparo
   */
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

  /**
   * Seleciona mensagem a partir do dropdown de disparo
   */
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

  /**
   * Atualiza resumo do disparo (NOVO)
   */
  updateDisparoSummary() {
    // Atualiza informações da instância selecionada
    if (this.manager.instances) {
      this.manager.instances.updateDisparoInstanceInfo();
    }
  }

  /**
   * Executa o disparo de mensagens
   */
  async executeDisparo() {
    if (this.manager.isDisparoRunning) {
      this.manager.utility.showStatus("Disparo já em andamento", "error");
      return;
    }

    // Verifica instância selecionada (NOVO)
    const instanceId = this.manager.selectedInstanceId;
    if (!instanceId) {
      this.manager.utility.showStatus(
        "Selecione uma instância antes de disparar",
        "error"
      );
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
    let numbersToSend = this.manager.currentNumbers?.length || 0;

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

    // Monta mensagem de confirmação com info da instância (NOVO)
    const instanceName = this.manager.selectedInstanceInfo?.name || instanceId;
    const instancePhone =
      this.manager.selectedInstanceInfo?.phoneFormatted || "";

    let confirmMsg = `Confirma o disparo?\n\n`;
    confirmMsg += `📱 Instância: ${instanceName}`;
    if (instancePhone) {
      confirmMsg += ` (${instancePhone})`;
    }
    confirmMsg += `\n📨 Mensagem: #${selectedIndex}`;
    confirmMsg += `\n📦 Batch: ${batchSize} números por lote`;
    confirmMsg += `\n📊 Total a enviar: ${numbersToSend} números (Pendentes + Falhas)`;

    if (!confirm(confirmMsg)) {
      return;
    }

    this.manager.isDisparoRunning = true;
    this.manager.btnExecuteDisparo.disabled = true;
    this.manager.btnExecuteDisparo.textContent = "🚀 Disparando...";

    try {
      // Passa instanceId como primeiro parâmetro (NOVO)
      const result = await window.droneAPI.executarDisparoDrone(
        instanceId,
        selectedIndex,
        batchSize
      );

      this.manager.isDisparoRunning = false;
      this.manager.btnExecuteDisparo.disabled = false;
      this.manager.btnExecuteDisparo.textContent = "🚀 Executar Disparo";

      if (result.success) {
        this.manager.utility.showStatus(
          `✅ Disparo concluído: ${
            result.detalhes?.totalEnviados || 0
          } enviados, ${result.detalhes?.totalFalhas || 0} falhas`,
          "success"
        );

        // Atualiza lista e estatísticas após disparo
        await this.manager.numbers.loadNumbers(
          this.manager.currentStatusFilter
        );
        await this.manager.status.updateStatusBreakdown();
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
      this.manager.btnExecuteDisparo.textContent = "🚀 Executar Disparo";
    }
  }
}
