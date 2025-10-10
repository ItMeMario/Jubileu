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

  async loadNumbers() {
    try {
      const result = await window.droneAPI.listarNumerosAtuais();

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
    } catch (error) {
      console.error("Erro ao carregar números:", error);
      this.manager.utility.showStatus("Erro ao carregar números", "error");
    }
  }

  renderNumbers(numeros) {
    if (!numeros || numeros.length === 0) {
      this.manager.numbersList.innerHTML =
        '<div class="empty-state">Nenhum número cadastrado</div>';
      return;
    }

    this.manager.numbersList.innerHTML = numeros
      .map((num) => {
        const nomeDisplay =
          num.nome && num.nome !== "-"
            ? `<span class="number-name">👤 ${num.nome}</span>`
            : "";

        return `
          <div class="number-item" data-id="${num.id}">
            <div class="number-info">
              <div class="number-value">${num.numeroWhatsapp}</div>
              ${nomeDisplay}
              <div class="number-meta">
                <span class="number-type">${num.tipo}</span>
                <span>${num.dataFormatada}</span>
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
    let msg = "Confirmar importação do CSV?\n\n";
    msg += "Opções aplicadas:\n";
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

      // Processa o CSV com as opções
      const result = await window.droneAPI.processarArquivoCSV(
        fileResult.content,
        opcoes
      );

      if (result.success) {
        // Mostra resumo do processamento
        const resumo = result.resumo;
        let statusMsg = `✅ ${resumo.totalAdicionados} número(s) adicionado(s)`;

        if (resumo.totalErros > 0) {
          statusMsg += `\n⚠️ ${resumo.totalErros} erro(s)`;
        }

        this.manager.utility.showStatus(statusMsg, "success");

        // Mostra detalhes no console
        console.log("Resultado do processamento:", result);

        if (result.erros && result.erros.length > 0) {
          console.warn("Erros encontrados:", result.erros);
        }

        // Limpa o arquivo e atualiza a lista
        this.removeFile();
        await this.loadNumbers();
        await this.loadStatistics();
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
      const result = await window.droneAPI.removerNumero(id);

      if (result.success) {
        this.manager.utility.showStatus("Número removido", "success");
        await this.loadNumbers();
        await this.loadStatistics();
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
    if (!confirm("Tem certeza que deseja remover TODOS os números?")) {
      return;
    }

    try {
      const result = await window.droneAPI.limparListaCompleta();

      if (result.success) {
        this.manager.utility.showStatus(
          `${result.totalRemovidos} número(s) removido(s)`,
          "success"
        );
        await this.loadNumbers();
        await this.loadStatistics();
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

  async loadStatistics() {
    try {
      const result = await window.droneAPI.obterEstatisticasNumeros();

      if (result.success && result.estatisticas) {
        const stats = result.estatisticas;
        this.manager.statTotal.textContent = stats.total || 0;
        this.manager.statBr.textContent = stats.porTipo?.brazilian || 0;
        this.manager.statInt.textContent = stats.porTipo?.international || 0;

        // Atualiza também o contador de nomes personalizados se existir
        if (stats.comNomePersonalizado !== undefined) {
          console.log(
            `Números com nomes: ${stats.comNomePersonalizado}/${stats.total} (${stats.percentualComNome}%)`
          );
        }
      }
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
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
