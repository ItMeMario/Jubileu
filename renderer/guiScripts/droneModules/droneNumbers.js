// renderer/guiScripts/droneModules/droneNumbers.js

class DroneNumbers {
  constructor(manager) {
    this.manager = manager;
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Listener para filtro de status
    const statusFilter = document.getElementById("status-filter");
    if (statusFilter) {
      statusFilter.addEventListener("change", (e) => {
        this.loadNumbers(e.target.value);
      });
    }

    // Listeners para botões de limpeza
    const btnClearSent = document.getElementById("btn-clear-sent");
    const btnClearFailed = document.getElementById("btn-clear-failed");

    if (btnClearSent) {
      btnClearSent.addEventListener("click", () => this.clearSentNumbers());
    }

    if (btnClearFailed) {
      btnClearFailed.addEventListener("click", () => this.clearFailedNumbers());
    }

    // Listeners para checkboxes de opções
    const checkboxDDD = document.getElementById("checkbox-ddd");
    const checkboxPrefixo = document.getElementById("checkbox-prefixo");

    if (checkboxDDD) {
      checkboxDDD.addEventListener("change", (e) => {
        const wrapper = document.getElementById("ddd-input-wrapper");
        if (wrapper) {
          wrapper.style.display = e.target.checked ? "block" : "none";
        }
      });
    }

    if (checkboxPrefixo) {
      checkboxPrefixo.addEventListener("change", (e) => {
        const wrapper = document.getElementById("prefixo-input-wrapper");
        if (wrapper) {
          wrapper.style.display = e.target.checked ? "block" : "none";
        }
      });
    }
  }

  async handleFileSelect(file) {
    try {
      if (!file.name.endsWith(".csv")) {
        this.manager.utility.showStatus(
          "Apenas arquivos CSV são permitidos",
          "error"
        );
        return;
      }

      const result = await window.fileAPI.readFile(file);

      if (!result.success) {
        this.manager.utility.showStatus(
          "Erro ao ler arquivo: " + result.error,
          "error"
        );
        return;
      }

      this.manager.currentFile = {
        name: file.name,
        content: result.content,
        size: result.size,
      };

      // Gera preview
      const preview = await window.droneAPI.previewCSV(result.content, 5);

      if (preview.success) {
        this.showFileInfo(file.name, preview.totalLinhas);
        this.manager.utility.showStatus(
          `Arquivo carregado: ${preview.totalLinhas} linha(s) detectada(s)`,
          "success"
        );
      } else {
        this.manager.utility.showStatus(
          "Erro ao processar preview: " + preview.error,
          "error"
        );
      }
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      this.manager.utility.showStatus("Erro ao processar arquivo", "error");
    }
  }

  showFileInfo(fileName, count) {
    const fileInfo = this.manager.fileInfo;
    const fileNameEl = this.manager.fileName;
    const fileCountEl = this.manager.fileCount;
    const processingOptions = this.manager.processingOptions;
    const btnImport = this.manager.btnImportFile;

    if (fileInfo && fileNameEl && fileCountEl) {
      fileNameEl.textContent = fileName;
      fileCountEl.textContent = `${count} linha(s) detectada(s)`;
      fileInfo.style.display = "block";

      if (processingOptions) {
        processingOptions.style.display = "block";
      }

      if (btnImport) {
        btnImport.disabled = false;
      }
    }
  }

  removeFile() {
    this.manager.currentFile = null;

    const fileInfo = this.manager.fileInfo;
    const processingOptions = this.manager.processingOptions;
    const btnImport = this.manager.btnImportFile;
    const fileInput = this.manager.fileInput;

    if (fileInfo) fileInfo.style.display = "none";
    if (processingOptions) processingOptions.style.display = "none";
    if (btnImport) btnImport.disabled = true;
    if (fileInput) fileInput.value = "";

    this.manager.utility.showStatus("Arquivo removido", "info");
  }

  async importFile() {
    if (!this.manager.currentFile) {
      this.manager.utility.showStatus("Nenhum arquivo selecionado", "error");
      return;
    }

    try {
      // Coleta opções
      const opcoes = this.getProcessingOptions();

      // Valida opções
      const validacao = await window.droneAPI.validarOpcoes(opcoes);

      if (!validacao.valido) {
        this.manager.utility.showStatus(
          "Opções inválidas: " + validacao.erros.join(", "),
          "error"
        );
        return;
      }

      if (validacao.avisos.length > 0) {
        console.warn("Avisos:", validacao.avisos);
      }

      // Processa arquivo
      this.manager.utility.showStatus("Processando arquivo...", "info");

      const resultado = await window.droneAPI.processarArquivoCSV(
        this.manager.currentFile.content,
        opcoes
      );

      if (resultado.success) {
        const msg =
          `✅ Importação concluída!\n` +
          `Adicionados: ${resultado.resumo.totalAdicionados}\n` +
          `Já existiam: ${resultado.resumo.totalJaExistiam}\n` +
          `Erros: ${resultado.resumo.totalErros}`;

        this.manager.utility.showStatus(msg, "success");

        // ATUALIZA TUDO
        await this.refreshAllData();

        // Limpa arquivo
        this.removeFile();
      } else {
        this.manager.utility.showStatus(
          "Erro ao importar: " + resultado.error,
          "error"
        );
      }
    } catch (error) {
      console.error("Erro ao importar arquivo:", error);
      this.manager.utility.showStatus("Erro ao importar arquivo", "error");
    }
  }

  getProcessingOptions() {
    const checkboxDDD = document.getElementById("checkbox-ddd");
    const checkboxPrefixo = document.getElementById("checkbox-prefixo");
    const dddInput = document.getElementById("ddd");
    const prefixoInput = document.getElementById("prefixo-pais");
    const adicionar9 = document.getElementById("adicionar-9-digito");
    const usarNomes = document.getElementById("usar-nomes-csv");

    return {
      prefixoPais:
        checkboxPrefixo?.checked && prefixoInput?.value
          ? prefixoInput.value.trim()
          : "",
      ddd: checkboxDDD?.checked && dddInput?.value ? dddInput.value.trim() : "",
      adicionar9Digito: adicionar9?.checked || false,
      usarNomesCSV: usarNomes?.checked || false,
    };
  }

  async loadNumbers(filtro = "all") {
    try {
      const resultado = await window.droneAPI.listarNumerosAtuais(
        filtro || "all"
      );

      if (!resultado.success) {
        this.manager.utility.showStatus(
          "Erro ao carregar números: " + resultado.error,
          "error"
        );
        return;
      }

      this.manager.currentNumbers = resultado.numeros || [];
      this.renderNumbersList(resultado.numeros || []);
    } catch (error) {
      console.error("Erro ao carregar números:", error);
      this.manager.utility.showStatus("Erro ao carregar números", "error");
    }
  }

  renderNumbersList(numeros) {
    const list = this.manager.numbersList;
    if (!list) return;

    if (numeros.length === 0) {
      list.innerHTML =
        '<div class="empty-state">Nenhum número cadastrado</div>';
      return;
    }

    list.innerHTML = numeros
      .map(
        (num) => `
      <div class="number-item ${num.statusClass}">
        <div class="number-info">
          <div class="number-value">${num.numeroWhatsapp}</div>
          <div class="number-name">${num.nome}</div>
        </div>
        <div class="number-status">
          <span class="status-badge ${num.statusClass}">
            ${num.statusIcon} ${num.statusTexto}
          </span>
          <button class="btn-remove" onclick="window.droneManager.numbers.removeNumber(${num.id})">
            🗑️
          </button>
        </div>
      </div>
    `
      )
      .join("");
  }

  async removeNumber(id) {
    if (!confirm("Deseja remover este número?")) return;

    try {
      const resultado = await window.droneAPI.removerNumero(id);

      if (resultado.success) {
        this.manager.utility.showStatus(
          "Número removido com sucesso",
          "success"
        );
        await this.refreshAllData();
      } else {
        this.manager.utility.showStatus(
          "Erro ao remover: " + resultado.error,
          "error"
        );
      }
    } catch (error) {
      console.error("Erro ao remover número:", error);
      this.manager.utility.showStatus("Erro ao remover número", "error");
    }
  }

  async clearAllNumbers() {
    if (
      !confirm(
        "Deseja limpar TODOS os números? Esta ação não pode ser desfeita!"
      )
    )
      return;

    try {
      const resultado = await window.droneAPI.limparListaCompleta();

      if (resultado.success) {
        this.manager.utility.showStatus(
          `${resultado.totalRemovidos} número(s) removido(s)`,
          "success"
        );
        await this.refreshAllData();
      } else {
        this.manager.utility.showStatus(
          "Erro ao limpar: " + resultado.error,
          "error"
        );
      }
    } catch (error) {
      console.error("Erro ao limpar números:", error);
      this.manager.utility.showStatus("Erro ao limpar números", "error");
    }
  }

  async clearSentNumbers() {
    if (!confirm("Deseja limpar todos os números ENVIADOS?")) return;

    try {
      const resultado = await window.droneAPI.limparEnviados();

      if (resultado.success) {
        this.manager.utility.showStatus(resultado.message, "success");
        await this.refreshAllData();
      } else {
        this.manager.utility.showStatus(
          "Erro ao limpar: " + resultado.error,
          "error"
        );
      }
    } catch (error) {
      console.error("Erro ao limpar enviados:", error);
      this.manager.utility.showStatus("Erro ao limpar enviados", "error");
    }
  }

  async clearFailedNumbers() {
    if (!confirm("Deseja limpar todos os números com FALHA?")) return;

    try {
      const resultado = await window.droneAPI.limparFalhas();

      if (resultado.success) {
        this.manager.utility.showStatus(resultado.message, "success");
        await this.refreshAllData();
      } else {
        this.manager.utility.showStatus(
          "Erro ao limpar: " + resultado.error,
          "error"
        );
      }
    } catch (error) {
      console.error("Erro ao limpar falhas:", error);
      this.manager.utility.showStatus("Erro ao limpar falhas", "error");
    }
  }

  async loadStatistics() {
    try {
      const resultado = await window.droneAPI.obterEstatisticasNumeros();

      if (!resultado.success) {
        console.error("Erro ao carregar estatísticas:", resultado.error);
        return;
      }

      const stats = resultado.estatisticas;
      this.updateStatisticsUI(stats);
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  }

  updateStatisticsUI(stats) {
    // Total
    const statTotal = document.getElementById("stat-total");
    if (statTotal) statTotal.textContent = stats.total;

    // BR e Internacional (calculado)
    const statBr = document.getElementById("stat-br");
    const statInt = document.getElementById("stat-int");
    if (statBr) statBr.textContent = stats.porStatus.pending || 0;
    if (statInt)
      statInt.textContent = stats.total - (stats.porStatus.pending || 0);

    // Status cards
    const statPending = document.getElementById("stat-pending");
    const statSent = document.getElementById("stat-sent");
    const statFailed = document.getElementById("stat-failed");

    if (statPending) statPending.textContent = stats.porStatus.pending;
    if (statSent) statSent.textContent = stats.porStatus.sent;
    if (statFailed) statFailed.textContent = stats.porStatus.failed;

    // Percentuais
    const statPendingPercent = document.getElementById("stat-pending-percent");
    const statSentPercent = document.getElementById("stat-sent-percent");
    const statFailedPercent = document.getElementById("stat-failed-percent");

    if (statPendingPercent)
      statPendingPercent.textContent = stats.percentuais.pending + "%";
    if (statSentPercent)
      statSentPercent.textContent = stats.percentuais.sent + "%";
    if (statFailedPercent)
      statFailedPercent.textContent = stats.percentuais.failed + "%";

    // Atualiza também na seção de Status
    const statusTotal = document.getElementById("status-total");
    if (statusTotal) statusTotal.textContent = stats.total;

    // Breakdown na seção Status
    const breakdownPending = document.getElementById("breakdown-pending");
    const breakdownSent = document.getElementById("breakdown-sent");
    const breakdownFailed = document.getElementById("breakdown-failed");

    if (breakdownPending)
      breakdownPending.textContent = stats.porStatus.pending;
    if (breakdownSent) breakdownSent.textContent = stats.porStatus.sent;
    if (breakdownFailed) breakdownFailed.textContent = stats.porStatus.failed;

    const breakdownPendingPercent = document.getElementById(
      "breakdown-pending-percent"
    );
    const breakdownSentPercent = document.getElementById(
      "breakdown-sent-percent"
    );
    const breakdownFailedPercent = document.getElementById(
      "breakdown-failed-percent"
    );

    if (breakdownPendingPercent)
      breakdownPendingPercent.textContent = `(${stats.percentuais.pending}%)`;
    if (breakdownSentPercent)
      breakdownSentPercent.textContent = `(${stats.percentuais.sent}%)`;
    if (breakdownFailedPercent)
      breakdownFailedPercent.textContent = `(${stats.percentuais.failed}%)`;
  }

  // MÉTODO CRÍTICO: Atualiza todos os dados
  async refreshAllData() {
    try {
      // Atualiza estatísticas
      await this.loadStatistics();

      // Recarrega lista de números
      const currentFilter =
        document.getElementById("status-filter")?.value || "all";
      await this.loadNumbers(currentFilter);

      // Atualiza requisitos do disparo
      if (this.manager.dispatch) {
        await this.manager.dispatch.checkRequirements();
        await this.manager.dispatch.updateDisparoSummary();
      }

      // Atualiza status geral
      if (this.manager.status) {
        await this.manager.status.refreshStatus();
      }
    } catch (error) {
      console.error("Erro ao atualizar dados:", error);
    }
  }
}

export default DroneNumbers;
