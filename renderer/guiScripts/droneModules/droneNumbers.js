// renderer/guiScripts/droneModules/droneNumbers.js

export default class DroneNumbers {
  constructor(manager) {
    this.manager = manager;
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Checkboxes que mostram/escondem campos
    const checkboxDdd = document.getElementById("checkbox-ddd");
    const checkboxPrefixo = document.getElementById("checkbox-prefixo");

    if (checkboxDdd) {
      checkboxDdd.addEventListener("change", () => {
        this.toggleDddInput(checkboxDdd.checked);
      });
    }

    if (checkboxPrefixo) {
      checkboxPrefixo.addEventListener("change", () => {
        this.togglePrefixoInput(checkboxPrefixo.checked);
      });
    }
  }

  toggleDddInput(show) {
    const wrapper = document.getElementById("ddd-input-wrapper");
    if (wrapper) {
      wrapper.style.display = show ? "flex" : "none";
      if (!show) {
        document.getElementById("ddd").value = "";
      }
    }
  }

  togglePrefixoInput(show) {
    const wrapper = document.getElementById("prefixo-input-wrapper");
    if (wrapper) {
      wrapper.style.display = show ? "flex" : "none";
      if (!show) {
        document.getElementById("prefixo-pais").value = "";
      }
    }
  }

  /**
   * Retorna o identificador global para operações de números
   * @returns {string}
   */
  getSelectedInstanceId() {
    return "drone_global";
  }

  /**
   * Carrega números com filtro de status opcional
   * @param {string} filtroStatus - 'all', 'pending', 'sent', 'failed'
   */
  async loadNumbers(filtroStatus = "all") {
    try {
      const instanceId = this.getSelectedInstanceId();

      const result = await window.droneAPI.listarNumerosAtuais(
        instanceId,
        filtroStatus
      );

      if (!result.success) {
        this.manager.utility.showStatus(
          result.error || "Erro ao carregar números",
          "error"
        );
        return;
      }

      this.manager.currentNumbers = result.numeros || [];
      this.renderNumbers(this.manager.currentNumbers);
      this.updateNumbersCount();

      // Atualiza informação de filtro se necessário
      if (filtroStatus !== "all" && result.total !== result.totalGeral) {
        console.log(
          `[${instanceId}] Mostrando ${result.total} de ${result.totalGeral} números (filtro: ${filtroStatus})`
        );
      }
    } catch (error) {
      console.error("Erro ao carregar números:", error);
      this.manager.utility.showStatus("Erro ao carregar números", "error");
    }
  }

  /**
   * Renderiza lista de números com badges de status
   */
  renderNumbers(numeros) {
    if (!numeros || numeros.length === 0) {
      const message = "Nenhum número cadastrado na lista global";

      this.manager.numbersList.innerHTML = `<div class="empty-state">${message}</div>`;
      return;
    }

    this.manager.numbersList.innerHTML = numeros
      .map((num) => {
        const nomeDisplay =
          num.nome && num.nome !== "-"
            ? `<span class="number-name">${num.nome}</span>`
            : "";

        // Badge de status
        const statusBadge = num.statusIcon
          ? `<span class="status-badge ${num.statusClass}">${num.statusIcon} ${num.statusTexto}</span>`
          : "";

        return `
          <div class="number-item" data-id="${num.id}">
            <div class="number-info">
              <div class="number-value">${num.numeroWhatsapp}</div>
              ${nomeDisplay}
              <div class="number-meta">
                ${statusBadge}
              </div>
            </div>
            <button class="btn-remove" data-id="${num.id}">Remover</button>
          </div>
        `;
      })
      .join("");

    // Add remove listeners
    document.querySelectorAll(".btn-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        this.removeNumber(id);
      });
    });
  }

  handleFileSelect(file) {
    if (!file) return;

    // Permite importar números sem instância selecionada, pois a lista é global

    // Aceita apenas CSV
    const ext = "." + file.name.split(".").pop().toLowerCase();

    if (ext !== ".csv") {
      this.manager.utility.showStatus(
        "Apenas arquivos CSV são aceitos",
        "error"
      );
      return;
    }

    this.manager.currentFile = file;
    this.manager.fileName.textContent = file.name;
    this.manager.fileInfo.style.display = "block";
    this.manager.processingOptions.style.display = "block";
    this.manager.btnImportFile.disabled = false;

    // Lê o arquivo e gera preview
    this.previewCSV(file);
  }

  async previewCSV(file) {
    try {
      const fileResult = await window.fileAPI.readFile(file);

      if (!fileResult.success) {
        this.manager.utility.showStatus("Erro ao ler arquivo", "error");
        return;
      }

      // Chama preview do backend
      const previewResult = await window.droneAPI.previewCSV(
        fileResult.content,
        5
      );

      if (previewResult.success) {
        const totalLinhas = previewResult.totalLinhas || 0;
        this.manager.fileCount.textContent = `${totalLinhas} linha(s) encontrada(s)`;

        // Mostra preview das primeiras linhas no console
        if (previewResult.preview && previewResult.preview.length > 0) {
          console.log("Preview do CSV:", previewResult.preview);
        }
      } else {
        this.manager.utility.showStatus(
          "Erro ao gerar preview: " + previewResult.error,
          "error"
        );
      }
    } catch (error) {
      console.error("Erro ao gerar preview:", error);
    }
  }

  removeFile() {
    this.manager.currentFile = null;
    this.manager.fileInfo.style.display = "none";
    this.manager.processingOptions.style.display = "none";
    this.manager.btnImportFile.disabled = true;
    this.manager.fileInput.value = "";
    this.resetProcessingOptions();
  }

  resetProcessingOptions() {
    document.getElementById("checkbox-ddd").checked = false;
    document.getElementById("checkbox-prefixo").checked = false;
    document.getElementById("adicionar-9-digito").checked = false;
    document.getElementById("usar-nomes-csv").checked = true;

    document.getElementById("ddd").value = "";
    document.getElementById("prefixo-pais").value = "";

    this.toggleDddInput(false);
    this.togglePrefixoInput(false);
  }

  /**
   * Captura as opções dos campos do formulário
   */
  getProcessingOptions() {
    // Captura valores dos checkboxes
    const usarDdd = document.getElementById("checkbox-ddd").checked;
    const usarPrefixo = document.getElementById("checkbox-prefixo").checked;
    const adicionar9Digito =
      document.getElementById("adicionar-9-digito").checked;
    const usarNomesCSV = document.getElementById("usar-nomes-csv").checked;

    // Captura valores dos inputs (se os checkboxes estão marcados)
    const ddd = usarDdd ? document.getElementById("ddd").value.trim() : "";
    const prefixoPais = usarPrefixo
      ? document.getElementById("prefixo-pais").value.trim()
      : "";

    return {
      prefixoPais: prefixoPais,
      ddd: ddd,
      adicionar9Digito: adicionar9Digito,
      usarNomesCSV: usarNomesCSV,
    };
  }

  /**
   * Constrói mensagem de confirmação com as opções aplicadas
   */
  buildConfirmationMessage(opcoes) {
    let msg = `Confirmar importação do CSV?\n\n`;
    msg += `📱 Destino: Lista Global de Disparo\n\n`;
    msg += `Opções aplicadas:\n`;
    msg += `• Prefixo país: ${opcoes.prefixoPais || "Nenhum"}\n`;
    msg += `• DDD: ${opcoes.ddd || "Nenhum"}\n`;
    msg += `• Adicionar 9º dígito: ${
      opcoes.adicionar9Digito ? "Sim" : "Não"
    }\n`;
    msg += `• Usar nomes do CSV: ${opcoes.usarNomesCSV ? "Sim" : "Não"}`;

    return msg;
  }

  /**
   * Importa arquivo CSV com opções de transformação
   */
  async importFile() {
    if (!this.manager.currentFile) return;

    const instanceId = this.getSelectedInstanceId();

    try {
      // Lê o conteúdo do arquivo
      const fileResult = await window.fileAPI.readFile(
        this.manager.currentFile
      );

      if (!fileResult.success) {
        this.manager.utility.showStatus("Erro ao ler arquivo", "error");
        return;
      }

      // Captura as opções dos campos do formulário
      const opcoes = this.getProcessingOptions();

      // Valida opções antes de processar
      const validacao = await window.droneAPI.validarOpcoes(opcoes);

      if (!validacao.valido) {
        const errosMsg = validacao.erros.join("\n");
        this.manager.utility.showStatus(
          `Opções inválidas:\n${errosMsg}`,
          "error"
        );
        return;
      }

      // Mostra avisos se houver
      if (validacao.avisos && validacao.avisos.length > 0) {
        console.warn("Avisos:", validacao.avisos);
      }

      // Confirma com usuário antes de processar
      const confirmMsg = this.buildConfirmationMessage(opcoes);
      if (!confirm(confirmMsg)) {
        return;
      }

      // Processa o CSV com as opções (passa instanceId)
      const result = await window.droneAPI.processarArquivoCSV(
        instanceId,
        fileResult.content,
        opcoes
      );

      if (result.success) {
        // Mostra resumo do processamento
        const resumo = result.resumo;
        let statusMsg = `✅ ${resumo.totalAdicionados} número(s) adicionado(s)`;

        if (resumo.totalJaExistiam && resumo.totalJaExistiam > 0) {
          statusMsg += `\n⚠️ ${resumo.totalJaExistiam} já existiam`;
        }

        if (resumo.totalErros > 0) {
          statusMsg += `\n⚠️ ${resumo.totalErros} erro(s)`;
        }

        this.manager.utility.showStatus(statusMsg, "success");

        // Mostra detalhes no console
        console.log(`[${instanceId}] Resultado do processamento:`, result);

        if (result.erros && result.erros.length > 0) {
          console.warn(`[${instanceId}] Erros encontrados:`, result.erros);
        }

        // Limpa o arquivo e atualiza a lista
        this.removeFile();
        await this.loadNumbers(this.manager.currentStatusFilter);
      } else {
        this.manager.utility.showStatus(
          result.error || "Erro ao processar CSV",
          "error"
        );
      }
    } catch (error) {
      console.error("Erro ao importar arquivo:", error);
      this.manager.utility.showStatus("Erro ao importar arquivo", "error");
    }
  }

  async removeNumber(id) {
    try {
      const instanceId = this.getSelectedInstanceId();

      const result = await window.droneAPI.removerNumero(instanceId, id);

      if (result.success) {
        this.manager.utility.showStatus("Número removido", "success");
        await this.loadNumbers(this.manager.currentStatusFilter);
      } else {
        this.manager.utility.showStatus(
          result.error || "Erro ao remover número",
          "error"
        );
      }
    } catch (error) {
      console.error("Erro ao remover número:", error);
      this.manager.utility.showStatus("Erro ao remover número", "error");
    }
  }

  async clearAllNumbers() {
    const instanceId = this.getSelectedInstanceId();

    if (
      !confirm(
        `Tem certeza que deseja remover TODOS os números da lista global?`
      )
    ) {
      return;
    }

    try {
      const result = await window.droneAPI.limparListaCompleta(instanceId);

      if (result.success) {
        this.manager.utility.showStatus(
          `${result.totalRemovidos} número(s) removido(s)`,
          "success"
        );
        await this.loadNumbers(this.manager.currentStatusFilter);
      } else {
        this.manager.utility.showStatus(
          result.error || "Erro ao limpar lista",
          "error"
        );
      }
    } catch (error) {
      console.error("Erro ao limpar lista:", error);
      this.manager.utility.showStatus("Erro ao limpar lista", "error");
    }
  }

  /**
   * Limpa apenas números com status 'sent'
   */
  async clearSentNumbers() {
    const instanceId = this.getSelectedInstanceId();

    if (
      !confirm(
        `Tem certeza que deseja remover todos os números ENVIADOS da lista global?`
      )
    ) {
      return;
    }

    try {
      const result = await window.droneAPI.limparEnviados(instanceId);

      if (result.success) {
        this.manager.utility.showStatus(
          result.message || "Números enviados removidos",
          "success"
        );
        await this.loadNumbers(this.manager.currentStatusFilter);
      } else {
        this.manager.utility.showStatus(
          result.error || "Erro ao limpar enviados",
          "error"
        );
      }
    } catch (error) {
      console.error("Erro ao limpar enviados:", error);
      this.manager.utility.showStatus("Erro ao limpar enviados", "error");
    }
  }

  /**
   * Limpa apenas números com status 'failed'
   */
  async clearFailedNumbers() {
    const instanceId = this.getSelectedInstanceId();

    if (
      !confirm(
        `Tem certeza que deseja remover todos os números que FALHARAM da lista global?`
      )
    ) {
      return;
    }

    try {
      const result = await window.droneAPI.limparFalhas(instanceId);

      if (result.success) {
        this.manager.utility.showStatus(
          result.message || "Números com falha removidos",
          "success"
        );
        await this.loadNumbers(this.manager.currentStatusFilter);
      } else {
        this.manager.utility.showStatus(
          result.error || "Erro ao limpar falhas",
          "error"
        );
      }
    } catch (error) {
      console.error("Erro ao limpar falhas:", error);
      this.manager.utility.showStatus("Erro ao limpar falhas", "error");
    }
  }

  updateNumbersCount() {
    if (this.manager.summaryTotal) {
      this.manager.summaryTotal.textContent =
        this.manager.currentNumbers.length;
    }
    if (this.manager.statusTotal) {
      this.manager.statusTotal.textContent = this.manager.currentNumbers.length;
    }
  }
}
