// renderer/guiScripts/droneModules/droneNumbers.js

export default class DroneNumbers {
  constructor(manager) {
    this.manager = manager;
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
      .map(
        (num) => `
      <div class="number-item" data-id="${num.id}">
        <div class="number-info">
          <div class="number-value">${num.numeroWhatsapp}</div>
          <div class="number-meta">
            <span class="number-type">${num.tipo}</span>
            <span>${num.dataFormatada}</span>
          </div>
        </div>
        <button class="btn-remove" data-id="${num.id}">Remover</button>
      </div>
    `
      )
      .join("");

    // Add remove listeners
    document.querySelectorAll(".btn-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        this.removeNumber(id);
      });
    });
  }

  async addNumbersManual() {
    const input = this.manager.numbersInput.value.trim();

    if (!input) {
      this.manager.utility.showStatus("Digite pelo menos um número", "error");
      return;
    }

    try {
      const result = await window.droneAPI.adicionarNumeros(input);

      if (result.success) {
        this.manager.utility.showStatus(
          `${result.adicionados.length} número(s) adicionado(s)`,
          "success"
        );
        this.manager.numbersInput.value = "";
        await this.loadNumbers();
        await this.loadStatistics();
      } else {
        this.manager.utility.showStatus(
          result.error || "Erro ao adicionar números",
          "error"
        );
      }

      // Show errors if any
      if (result.erros && result.erros.length > 0) {
        console.warn("Erros ao adicionar alguns números:", result.erros);
      }
    } catch (error) {
      console.error("Erro ao adicionar números:", error);
      this.manager.utility.showStatus("Erro ao adicionar números", "error");
    }
  }

  handleFileSelect(file) {
    if (!file) return;

    const validTypes = [".txt", ".csv", "text/plain", "text/csv"];
    const ext = "." + file.name.split(".").pop().toLowerCase();

    if (!validTypes.includes(ext) && !validTypes.includes(file.type)) {
      this.manager.utility.showStatus(
        "Arquivo inválido. Use TXT ou CSV",
        "error"
      );
      return;
    }

    this.manager.currentFile = file;
    this.manager.fileName.textContent = file.name;
    this.manager.fileInfo.style.display = "block";
    this.manager.btnImportFile.disabled = false;

    // Read and count numbers
    window.fileAPI.readFile(file).then((result) => {
      if (result.success) {
        const parsed = window.fileAPI.parseNumbers(result.content);
        this.manager.fileCount.textContent = `${parsed.total} números encontrados`;
      }
    });
  }

  removeFile() {
    this.manager.currentFile = null;
    this.manager.fileInfo.style.display = "none";
    this.manager.btnImportFile.disabled = true;
    this.manager.fileInput.value = "";
  }

  async importFile() {
    if (!this.manager.currentFile) return;

    try {
      const fileResult = await window.fileAPI.readFile(
        this.manager.currentFile
      );

      if (!fileResult.success) {
        this.manager.utility.showStatus("Erro ao ler arquivo", "error");
        return;
      }

      const parsed = window.fileAPI.parseNumbers(fileResult.content);

      if (!parsed.success || parsed.numbers.length === 0) {
        this.manager.utility.showStatus(
          "Nenhum número válido encontrado no arquivo",
          "error"
        );
        return;
      }

      const result = await window.droneAPI.adicionarNumeros(parsed.numbers);

      if (result.success) {
        this.manager.utility.showStatus(
          `${result.adicionados.length} número(s) importado(s)`,
          "success"
        );
        this.removeFile();
        await this.loadNumbers();
        await this.loadStatistics();
      } else {
        this.manager.utility.showStatus(
          result.error || "Erro ao importar números",
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
