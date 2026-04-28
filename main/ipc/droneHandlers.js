// main/ipc/droneHandlers.js
const droneControllerGui = require("../../controllers/droneControllerGui");
const { droneInstanceManager } = require("../../services/droneServiceModules/droneInstanceManagerDSM");

class DroneHandlers {
  constructor(windowManager) {
    this.windowManager = windowManager;
    this.setupInstanceEvents();
    console.log("DroneHandlers inicializado");
  }

  setupInstanceEvents() {
    droneInstanceManager.on("qr", (instanceId, qr) => {
      this.windowManager.getDroneWindow()?.webContents.send("drone-instance-qr", { instanceId, qrImage: qr });
    });
    droneInstanceManager.on("authenticated", (instanceId) => {
      this.windowManager.getDroneWindow()?.webContents.send("drone-instance-authenticated", { instanceId });
    });
    droneInstanceManager.on("ready", (instanceId, info) => {
      this.windowManager.getDroneWindow()?.webContents.send("drone-instance-ready", { instanceId, info });
    });
    droneInstanceManager.on("auth_failure", (instanceId, message) => {
      this.windowManager.getDroneWindow()?.webContents.send("drone-instance-auth-failure", { instanceId, message });
    });
    droneInstanceManager.on("disconnected", (instanceId, reason) => {
      this.windowManager.getDroneWindow()?.webContents.send("drone-instance-disconnected", { instanceId, reason });
    });
    droneInstanceManager.on("loading", (instanceId, data) => {
      this.windowManager.getDroneWindow()?.webContents.send("drone-instance-loading", { instanceId, ...data });
    });
    droneInstanceManager.on("state_change", (instanceId, state) => {
      this.windowManager.getDroneWindow()?.webContents.send("drone-instance-state-change", { instanceId, state });
    });
  }

  register(ipcMain) {
    ipcMain.handle("open-drone", this.openDrone.bind(this));
    ipcMain.handle("drone-listar-mensagens", this.listarMensagens.bind(this));
    ipcMain.handle("drone-listar-numeros-atuais", this.listarNumerosAtuais.bind(this));
    ipcMain.handle("drone-remover-numero", this.removerNumero.bind(this));
    ipcMain.handle("drone-limpar-lista-completa", this.limparListaCompleta.bind(this));
    ipcMain.handle("drone-limpar-enviados", this.limparEnviados.bind(this));
    ipcMain.handle("drone-limpar-falhas", this.limparFalhas.bind(this));
    ipcMain.handle("drone-obter-estatisticas-numeros", this.obterEstatisticasNumeros.bind(this));
    ipcMain.handle("drone-obter-status-cliente", this.obterStatusCliente.bind(this));
    ipcMain.handle("drone-executar-disparo-drone", this.executarDisparoDrone.bind(this));
    ipcMain.handle("drone-processar-arquivo-csv", this.processarArquivoCSV.bind(this));
    ipcMain.handle("drone-preview-csv", this.previewCSV.bind(this));
    ipcMain.handle("drone-validar-opcoes", this.validarOpcoes.bind(this));
    ipcMain.handle("drone-gerar-relatorio-nomes", this.gerarRelatorioNomes.bind(this));
    ipcMain.handle("drone-obter-status-todas-instancias", this.obterStatusTodasInstancias.bind(this));
    ipcMain.handle("drone-listar-instancias-conectadas", this.listarInstanciasConectadas.bind(this));
    ipcMain.handle("drone-instance-create", this.createInstance.bind(this));
    ipcMain.handle("drone-instance-remove", this.removeInstance.bind(this));
    ipcMain.handle("drone-instance-rename", this.renameInstance.bind(this));
    ipcMain.handle("drone-instance-start", this.startInstance.bind(this));
    ipcMain.handle("drone-instance-stop", this.stopInstance.bind(this));
    ipcMain.handle("drone-instance-reconnect", this.reconnectInstance.bind(this));
    ipcMain.handle("drone-instance-list", this.listInstances.bind(this));
  }

  unregister(ipcMain) {
    ipcMain.removeHandler("open-drone");
    ipcMain.removeHandler("drone-listar-mensagens");
    ipcMain.removeHandler("drone-listar-numeros-atuais");
    ipcMain.removeHandler("drone-remover-numero");
    ipcMain.removeHandler("drone-limpar-lista-completa");
    ipcMain.removeHandler("drone-limpar-enviados");
    ipcMain.removeHandler("drone-limpar-falhas");
    ipcMain.removeHandler("drone-obter-estatisticas-numeros");
    ipcMain.removeHandler("drone-obter-status-cliente");
    ipcMain.removeHandler("drone-executar-disparo-drone");
    ipcMain.removeHandler("drone-processar-arquivo-csv");
    ipcMain.removeHandler("drone-preview-csv");
    ipcMain.removeHandler("drone-validar-opcoes");
    ipcMain.removeHandler("drone-gerar-relatorio-nomes");
    ipcMain.removeHandler("drone-obter-status-todas-instancias");
    ipcMain.removeHandler("drone-listar-instancias-conectadas");
    ipcMain.removeHandler("drone-instance-create");
    ipcMain.removeHandler("drone-instance-remove");
    ipcMain.removeHandler("drone-instance-rename");
    ipcMain.removeHandler("drone-instance-start");
    ipcMain.removeHandler("drone-instance-stop");
    ipcMain.removeHandler("drone-instance-reconnect");
    ipcMain.removeHandler("drone-instance-list");
  }

  /**
   * Abre a janela do Drone
   */
  async openDrone() {
    try {
      console.log("Abrindo janela Drone...");
      return this.windowManager.openDroneWindow();
    } catch (error) {
      console.error("Erro ao abrir janela Drone:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Lista todas as mensagens disponíveis para disparo
   */
  async listarMensagens() {
    try {
      console.log("Listando mensagens disponíveis...");
      return await droneControllerGui.listarMensagens();
    } catch (error) {
      console.error("Erro ao listar mensagens:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Processa arquivo CSV com opções de transformação
   * @param {Object} event - Evento IPC
   * @param {string} instanceId - ID da instância
   * @param {string} csvContent - Conteúdo do arquivo CSV
   * @param {Object} opcoes - Opções de processamento
   */
  async processarArquivoCSV(event, instanceId, csvContent, opcoes = {}) {
    try {
      console.log(`[${instanceId}] Processando arquivo CSV...`);
      return await droneControllerGui.processarArquivoCSV(
        instanceId,
        csvContent,
        opcoes
      );
    } catch (error) {
      console.error(`[${instanceId}] Erro ao processar CSV:`, error);
      return { success: false, error: error.message, instanceId };
    }
  }

  /**
   * Preview do CSV antes de processar
   * @param {Object} event - Evento IPC
   * @param {string} csvContent - Conteúdo do CSV
   * @param {number} linhas - Quantidade de linhas para preview
   */
  async previewCSV(event, csvContent, linhas = 5) {
    try {
      console.log("Gerando preview do CSV...");
      return droneControllerGui.previewCSV(csvContent, linhas);
    } catch (error) {
      console.error("Erro ao gerar preview:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Valida opções antes do processamento
   * @param {Object} event - Evento IPC
   * @param {Object} opcoes - Opções a validar
   */
  async validarOpcoes(event, opcoes) {
    try {
      console.log("Validando opções...");
      return droneControllerGui.validarOpcoes(opcoes);
    } catch (error) {
      console.error("Erro ao validar opções:", error);
      return { valido: false, erros: [error.message], avisos: [] };
    }
  }

  /**
   * Lista os números atualmente no banco de uma instância
   * @param {Object} event - Evento IPC
   * @param {string} instanceId - ID da instância
   * @param {string} filtroStatus - Filtro de status (pending/sent/failed/all)
   */
  async listarNumerosAtuais(event, instanceId, filtroStatus = "all") {
    try {
      console.log(
        `[${instanceId}] Listando números com filtro: ${filtroStatus}`
      );
      return await droneControllerGui.listarNumerosAtuais(
        instanceId,
        filtroStatus
      );
    } catch (error) {
      console.error(`[${instanceId}] Erro ao listar números:`, error);
      return { success: false, error: error.message, instanceId };
    }
  }

  /**
   * Remove um número específico da lista de uma instância
   * @param {Object} event - Evento IPC
   * @param {string} instanceId - ID da instância
   * @param {number|string} identificador - ID do número ou índice da lista
   */
  async removerNumero(event, instanceId, identificador) {
    try {
      console.log(`[${instanceId}] Removendo número: ${identificador}`);
      return await droneControllerGui.removerNumero(instanceId, identificador);
    } catch (error) {
      console.error(`[${instanceId}] Erro ao remover número:`, error);
      return { success: false, error: error.message, instanceId };
    }
  }

  /**
   * Limpa toda a lista de números de uma instância
   * @param {Object} event - Evento IPC
   * @param {string} instanceId - ID da instância
   */
  async limparListaCompleta(event, instanceId) {
    try {
      console.log(`[${instanceId}] Limpando lista completa...`);
      return await droneControllerGui.limparListaCompleta(instanceId);
    } catch (error) {
      console.error(`[${instanceId}] Erro ao limpar lista:`, error);
      return { success: false, error: error.message, instanceId };
    }
  }

  /**
   * Limpa apenas números com status 'sent' de uma instância
   * @param {Object} event - Evento IPC
   * @param {string} instanceId - ID da instância
   */
  async limparEnviados(event, instanceId) {
    try {
      console.log(`[${instanceId}] Limpando números enviados...`);
      return await droneControllerGui.limparEnviados(instanceId);
    } catch (error) {
      console.error(`[${instanceId}] Erro ao limpar enviados:`, error);
      return { success: false, error: error.message, instanceId };
    }
  }

  /**
   * Limpa apenas números com status 'failed' de uma instância
   * @param {Object} event - Evento IPC
   * @param {string} instanceId - ID da instância
   */
  async limparFalhas(event, instanceId) {
    try {
      console.log(`[${instanceId}] Limpando números com falha...`);
      return await droneControllerGui.limparFalhas(instanceId);
    } catch (error) {
      console.error(`[${instanceId}] Erro ao limpar falhas:`, error);
      return { success: false, error: error.message, instanceId };
    }
  }

  /**
   * Obtém estatísticas dos números cadastrados de uma instância
   * @param {Object} event - Evento IPC
   * @param {string} instanceId - ID da instância
   */
  async obterEstatisticasNumeros(event, instanceId) {
    try {
      console.log(`[${instanceId}] Obtendo estatísticas dos números...`);
      return await droneControllerGui.obterEstatisticasNumeros(instanceId);
    } catch (error) {
      console.error(`[${instanceId}] Erro ao obter estatísticas:`, error);
      return { success: false, error: error.message, instanceId };
    }
  }

  /**
   * Obtém status de conexão do WhatsApp de uma instância
   * @param {Object} event - Evento IPC
   * @param {string} instanceId - ID da instância (opcional)
   */
  async obterStatusCliente(event, instanceId = null) {
    try {
      console.log(
        `Obtendo status do cliente WhatsApp${
          instanceId ? ` (${instanceId})` : ""
        }...`
      );
      return await droneControllerGui.obterStatusCliente(instanceId);
    } catch (error) {
      console.error("Erro ao obter status do cliente:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtém status de todas as instâncias
   */
  async obterStatusTodasInstancias() {
    try {
      console.log("Obtendo status de todas as instâncias...");
      return await droneControllerGui.obterStatusTodasInstancias();
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
  }

  /**
   * Lista apenas instâncias conectadas
   */
  async listarInstanciasConectadas() {
    try {
      console.log("Listando instâncias conectadas...");
      return await droneControllerGui.listarInstanciasConectadas();
    } catch (error) {
      console.error("Erro ao listar instâncias conectadas:", error);
      return { success: false, error: error.message, instances: [], total: 0 };
    }
  }

  /**
   * Executa disparo de drone com mensagem selecionada
   * @param {Object} event - Evento IPC
   * @param {string} instanceId - ID da instância a ser usada
   * @param {number} mensagemIndex - Índice da mensagem (baseado em 1)
   * @param {number} batchSize - Tamanho do batch (padrão: 200)
   */
  async executarDisparoDrone(
    event,
    instanceId,
    mensagemIndex,
    batchSize = 200
  ) {
    try {
      console.log(
        `[${instanceId}] Executando disparo - Mensagem: ${mensagemIndex}, Batch: ${batchSize}`
      );
      return await droneControllerGui.executarDisparoDrone(
        instanceId,
        mensagemIndex,
        batchSize
      );
    } catch (error) {
      console.error(`[${instanceId}] Erro ao executar disparo:`, error);
      return { success: false, error: error.message, instanceId };
    }
  }

  /**
   * Gera relatório de nomes personalizados de uma instância
   * @param {Object} event - Evento IPC
   * @param {string} instanceId - ID da instância
   */
  async gerarRelatorioNomes(event, instanceId) {
    try {
      console.log(`[${instanceId}] Gerando relatório de nomes...`);
      return await droneControllerGui.gerarRelatorioNomes(instanceId);
    } catch (error) {
      console.error(`[${instanceId}] Erro ao gerar relatório:`, error);
      return { success: false, error: error.message, instanceId };
    }
  }

  // ==================== NOVOS HANDLERS DE INSTÂNCIA ====================

  async createInstance(event, data) {
    try {
      const instance = await droneInstanceManager.addInstance(data.name);
      this.windowManager.getDroneWindow()?.webContents.send("drone-instance-created", { instance });
      return { success: true, data: instance };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async removeInstance(event, data) {
    try {
      const result = await droneInstanceManager.removeInstance(data.instanceId);
      this.windowManager.getDroneWindow()?.webContents.send("drone-instance-removed", { instanceId: data.instanceId });
      return result;
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async renameInstance(event, data) {
    try {
      const result = await droneInstanceManager.renameInstance(data.instanceId, data.name);
      this.windowManager.getDroneWindow()?.webContents.send("drone-instance-renamed", { instanceId: data.instanceId, name: data.name });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async startInstance(event, data) {
    try {
      return await droneInstanceManager.startInstance(data.instanceId);
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async stopInstance(event, data) {
    try {
      const result = await droneInstanceManager.stopInstance(data.instanceId);
      this.windowManager.getDroneWindow()?.webContents.send("drone-instance-stopped", { instanceId: data.instanceId });
      return result;
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async reconnectInstance(event, data) {
    try {
      this.windowManager.getDroneWindow()?.webContents.send("drone-instance-reconnecting", { instanceId: data.instanceId });
      return await droneInstanceManager.reconnectInstance(data.instanceId);
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async listInstances() {
    try {
      const instances = await droneInstanceManager.listInstances();
      return { success: true, data: instances };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = DroneHandlers;
