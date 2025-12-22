// renderer/preload/dronePreload.js
const { contextBridge, ipcRenderer } = require("electron");

// Expõe APIs do Drone para o renderer
contextBridge.exposeInMainWorld("droneAPI", {
  // ==================== MENSAGENS ====================

  // Listar mensagens disponíveis
  listarMensagens: async () => {
    try {
      return await ipcRenderer.invoke("drone-listar-mensagens");
    } catch (error) {
      console.error("Erro ao listar mensagens:", error);
      return { success: false, error: error.message };
    }
  },

  // ==================== NÚMEROS ====================

  // Listar números atuais de uma instância com filtro opcional
  listarNumerosAtuais: async (instanceId, filtroStatus = "all") => {
    try {
      return await ipcRenderer.invoke(
        "drone-listar-numeros-atuais",
        instanceId,
        filtroStatus
      );
    } catch (error) {
      console.error(`[${instanceId}] Erro ao listar números:`, error);
      return { success: false, error: error.message, instanceId };
    }
  },

  // Remover número específico de uma instância
  removerNumero: async (instanceId, identificador) => {
    try {
      return await ipcRenderer.invoke(
        "drone-remover-numero",
        instanceId,
        identificador
      );
    } catch (error) {
      console.error(`[${instanceId}] Erro ao remover número:`, error);
      return { success: false, error: error.message, instanceId };
    }
  },

  // Limpar lista completa de uma instância
  limparListaCompleta: async (instanceId) => {
    try {
      return await ipcRenderer.invoke(
        "drone-limpar-lista-completa",
        instanceId
      );
    } catch (error) {
      console.error(`[${instanceId}] Erro ao limpar lista:`, error);
      return { success: false, error: error.message, instanceId };
    }
  },

  // Limpar apenas números enviados (status 'sent') de uma instância
  limparEnviados: async (instanceId) => {
    try {
      return await ipcRenderer.invoke("drone-limpar-enviados", instanceId);
    } catch (error) {
      console.error(`[${instanceId}] Erro ao limpar enviados:`, error);
      return { success: false, error: error.message, instanceId };
    }
  },

  // Limpar apenas números com falha (status 'failed') de uma instância
  limparFalhas: async (instanceId) => {
    try {
      return await ipcRenderer.invoke("drone-limpar-falhas", instanceId);
    } catch (error) {
      console.error(`[${instanceId}] Erro ao limpar falhas:`, error);
      return { success: false, error: error.message, instanceId };
    }
  },

  // Obter estatísticas dos números de uma instância
  obterEstatisticasNumeros: async (instanceId) => {
    try {
      return await ipcRenderer.invoke(
        "drone-obter-estatisticas-numeros",
        instanceId
      );
    } catch (error) {
      console.error(`[${instanceId}] Erro ao obter estatísticas:`, error);
      return { success: false, error: error.message, instanceId };
    }
  },

  // ==================== STATUS DO CLIENTE ====================

  // Obter status do cliente WhatsApp de uma instância
  obterStatusCliente: async (instanceId = null) => {
    try {
      return await ipcRenderer.invoke("drone-obter-status-cliente", instanceId);
    } catch (error) {
      console.error("Erro ao obter status:", error);
      return { success: false, error: error.message };
    }
  },

  // ==================== INSTÂNCIAS ====================

  // Obter status de todas as instâncias
  obterStatusTodasInstancias: async () => {
    try {
      return await ipcRenderer.invoke("drone-obter-status-todas-instancias");
    } catch (error) {
      console.error("Erro ao obter status das instâncias:", error);
      return {
        success: false,
        error: error.message,
        instances: [],
        total: 0,
        connected: 0,
      };
    }
  },

  // Listar apenas instâncias conectadas (para dropdown)
  listarInstanciasConectadas: async () => {
    try {
      return await ipcRenderer.invoke("drone-listar-instancias-conectadas");
    } catch (error) {
      console.error("Erro ao listar instâncias conectadas:", error);
      return { success: false, error: error.message, instances: [], total: 0 };
    }
  },

  // ==================== DISPARO ====================

  // Executar disparo com instância selecionada
  executarDisparoDrone: async (instanceId, mensagemIndex, batchSize = 200) => {
    try {
      return await ipcRenderer.invoke(
        "drone-executar-disparo-drone",
        instanceId,
        mensagemIndex,
        batchSize
      );
    } catch (error) {
      console.error(`[${instanceId}] Erro ao executar disparo:`, error);
      return { success: false, error: error.message, instanceId };
    }
  },

  // ==================== CSV ====================

  // Processar arquivo CSV com opções de transformação para uma instância
  processarArquivoCSV: async (instanceId, csvContent, opcoes = {}) => {
    try {
      return await ipcRenderer.invoke(
        "drone-processar-arquivo-csv",
        instanceId,
        csvContent,
        opcoes
      );
    } catch (error) {
      console.error(`[${instanceId}] Erro ao processar CSV:`, error);
      return { success: false, error: error.message, instanceId };
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

  // ==================== RELATÓRIOS ====================

  // Gerar relatório de nomes personalizados de uma instância
  gerarRelatorioNomes: async (instanceId) => {
    try {
      return await ipcRenderer.invoke(
        "drone-gerar-relatorio-nomes",
        instanceId
      );
    } catch (error) {
      console.error(`[${instanceId}] Erro ao gerar relatório:`, error);
      return { success: false, error: error.message, instanceId };
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

console.log("🚁 DronePreload carregado com suporte a múltiplas instâncias!");
