// renderer/preload/dronePreload.js
const { contextBridge, ipcRenderer } = require("electron");

// Expõe APIs do Drone para o renderer
contextBridge.exposeInMainWorld("droneAPI", {
  // Listar mensagens disponíveis
  listarMensagens: async () => {
    try {
      return await ipcRenderer.invoke("drone-listar-mensagens");
    } catch (error) {
      console.error("Erro ao listar mensagens:", error);
      return { success: false, error: error.message };
    }
  },

  // CORRIGIDO: Listar números atuais com filtro opcional
  listarNumerosAtuais: async (filtroStatus = "all") => {
    try {
      return await ipcRenderer.invoke(
        "drone-listar-numeros-atuais",
        filtroStatus
      );
    } catch (error) {
      console.error("Erro ao listar números:", error);
      return { success: false, error: error.message };
    }
  },

  // Remover número específico
  removerNumero: async (identificador) => {
    try {
      return await ipcRenderer.invoke("drone-remover-numero", identificador);
    } catch (error) {
      console.error("Erro ao remover número:", error);
      return { success: false, error: error.message };
    }
  },

  // Limpar lista completa
  limparListaCompleta: async () => {
    try {
      return await ipcRenderer.invoke("drone-limpar-lista-completa");
    } catch (error) {
      console.error("Erro ao limpar lista:", error);
      return { success: false, error: error.message };
    }
  },

  // NOVO: Limpar apenas números enviados (status 'sent')
  limparEnviados: async () => {
    try {
      return await ipcRenderer.invoke("drone-limpar-enviados");
    } catch (error) {
      console.error("Erro ao limpar enviados:", error);
      return { success: false, error: error.message };
    }
  },

  // NOVO: Limpar apenas números com falha (status 'failed')
  limparFalhas: async () => {
    try {
      return await ipcRenderer.invoke("drone-limpar-falhas");
    } catch (error) {
      console.error("Erro ao limpar falhas:", error);
      return { success: false, error: error.message };
    }
  },

  // Obter estatísticas dos números
  obterEstatisticasNumeros: async () => {
    try {
      return await ipcRenderer.invoke("drone-obter-estatisticas-numeros");
    } catch (error) {
      console.error("Erro ao obter estatísticas:", error);
      return { success: false, error: error.message };
    }
  },

  // Obter status do cliente WhatsApp
  obterStatusCliente: async () => {
    try {
      return await ipcRenderer.invoke("drone-obter-status-cliente");
    } catch (error) {
      console.error("Erro ao obter status:", error);
      return { success: false, error: error.message };
    }
  },

  // Executar disparo
  executarDisparoDrone: async (mensagemIndex, batchSize) => {
    try {
      return await ipcRenderer.invoke(
        "drone-executar-disparo-drone",
        mensagemIndex,
        batchSize
      );
    } catch (error) {
      console.error("Erro ao executar disparo:", error);
      return { success: false, error: error.message };
    }
  },

  // Processar arquivo CSV com opções de transformação
  processarArquivoCSV: async (csvContent, opcoes = {}) => {
    try {
      return await ipcRenderer.invoke(
        "drone-processar-arquivo-csv",
        csvContent,
        opcoes
      );
    } catch (error) {
      console.error("Erro ao processar CSV:", error);
      return { success: false, error: error.message };
    }
  },

  // Preview do CSV antes de processar
  previewCSV: async (csvContent, linhas = 5) => {
    try {
      return await ipcRenderer.invoke("drone-preview-csv", csvContent, linhas);
    } catch (error) {
      console.error("Erro ao gerar preview:", error);
      return { success: false, error: error.message };
    }
  },

  // Validar opções antes do processamento
  validarOpcoes: async (opcoes) => {
    try {
      return await ipcRenderer.invoke("drone-validar-opcoes", opcoes);
    } catch (error) {
      console.error("Erro ao validar opções:", error);
      return {
        valido: false,
        erros: [error.message],
        avisos: [],
      };
    }
  },

  // Gerar relatório de nomes personalizados
  gerarRelatorioNomes: async () => {
    try {
      return await ipcRenderer.invoke("drone-gerar-relatorio-nomes");
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      return { success: false, error: error.message };
    }
  },
});

// API para leitura de arquivos (TXT/CSV)
contextBridge.exposeInMainWorld("fileAPI", {
  readFile: async (file) => {
    try {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
          resolve({
            success: true,
            content: e.target.result,
            name: file.name,
            size: file.size,
            type: file.type,
          });
        };

        reader.onerror = (e) => {
          reject({
            success: false,
            error: "Erro ao ler arquivo",
          });
        };

        reader.readAsText(file);
      });
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      return { success: false, error: error.message };
    }
  },

  parseNumbers: (content) => {
    try {
      const numbers = content
        .split(/[,;\n]/)
        .map((n) => n.trim())
        .filter((n) => n.length > 0);

      return {
        success: true,
        numbers: numbers,
        total: numbers.length,
      };
    } catch (error) {
      console.error("Erro ao processar números:", error);
      return { success: false, error: error.message };
    }
  },
});

// Debug helper
contextBridge.exposeInMainWorld("debugAPI", {
  log: (message) => console.log("[DronePreload]", message),
  checkAPIs: () => {
    console.log("APIs disponíveis na janela do Drone:");
    console.log("- window.droneAPI:", typeof window.droneAPI);
    console.log("- window.fileAPI:", typeof window.fileAPI);

    if (window.droneAPI) {
      console.log("Métodos droneAPI:", Object.keys(window.droneAPI));
    }
    if (window.fileAPI) {
      console.log("Métodos fileAPI:", Object.keys(window.fileAPI));
    }
  },
});

console.log("DronePreload carregado com sucesso!");
