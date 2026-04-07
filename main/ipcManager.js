const { ipcMain } = require("electron");
const WhatsAppHandlers = require("./ipc/whatsAppHandlers");
const ConfigHandlers = require("./ipc/configHandlers");
const MessageHandlers = require("./ipc/messageHandlers");
const CityHandlers = require("./ipc/cityHandlers");
const IndicadoresHandlers = require("./ipc/indicadoresHandlers");
const ModoDevHandlers = require("./ipc/modoDevHandlers");
const DataBaseHandlers = require("./ipc/dataBaseHandlers");
const DroneHandlers = require("./ipc/droneHandlers");
const InstanceHandlers = require("./ipc/instanceHandlers");
const CacheHandlers = require("./ipc/cacheHandlers");
const DeeJayHandlers = require("./ipc/deeJayHandlers");
const UpdateHandlers = require("./ipc/updateHandlers");
const CRMHandlers = require("./ipc/crmHandlers");
const GoatHandlers = require("./ipc/goatHandlers");
const SentinelaHandlers = require("./ipc/sentinelaHandlers");


class IPCManager {
  constructor() {
    this.handlers = {
      whatsapp: null,
      config: null,
      message: null,
      city: null,
      indicadores: null,
      modoDev: null,
      dataBase: null,
      drone: null,
      instance: null,
      cache: null,
      update: null,
      crm: null,
      goat: null,
      sentinela: null,
    };
  }

  registerAllHandlers(modules) {
    try {
      // Cria instâncias dos handlers com os módulos necessários
      this.handlers.whatsapp = new WhatsAppHandlers(modules);
      this.handlers.config = new ConfigHandlers();
      this.handlers.message = new MessageHandlers();
      this.handlers.city = new CityHandlers();
      this.handlers.indicadores = new IndicadoresHandlers();
      this.handlers.modoDev = new ModoDevHandlers();
      this.handlers.dataBase = new DataBaseHandlers();
      this.handlers.drone = new DroneHandlers(modules.windowManager);
      this.handlers.instance = new InstanceHandlers(modules);
      this.handlers.cache = new CacheHandlers();
      this.handlers.deeJay = new DeeJayHandlers(modules.windowManager);
      this.handlers.update = new UpdateHandlers();
      this.handlers.crm = new CRMHandlers(modules.windowManager);
      this.handlers.goat = new GoatHandlers(modules.windowManager);
      this.handlers.sentinela = new SentinelaHandlers(modules.windowManager);

      // Registra handlers do WhatsApp
      this.registerWhatsAppHandlers();

      // Registra handlers de configuração
      this.registerConfigHandlers();

      // Registra handlers de mensagens
      this.registerMessageHandlers();

      // Registra handlers de cidades
      this.registerCityHandlers();

      // Registra handlers de indicadores
      this.registerIndicadoresHandlers();

      // Registra handlers de modo dev
      this.registerModoDevHandlers();

      // Registra handlers de banco de dados
      this.registerDataBaseHandlers();

      // Registra handlers de drone
      this.registerDroneHandlers();

      // Registra handlers de instâncias
      this.registerInstanceHandlers();

      // Registra handlers de cache
      this.registerCacheHandlers();

      // Registra handlers de Dee Jay
      this.registerDeeJayHandlers();

      // Registra handlers de Update
      this.registerUpdateHandlers();

      // Registra handlers de CRM
      this.registerCRMHandlers();

      // Registra handlers de Goat
      this.registerGoatHandlers();

      // Registra handlers de Sentinela
      this.registerSentinelaHandlers();

      console.log("Todos os handlers IPC registrados");
    } catch (error) {
      console.error("Erro ao registrar handlers IPC:", error);
      throw error;
    }
  }

  registerWhatsAppHandlers() {
    ipcMain.handle(
      "start-whatsapp",
      this.handlers.whatsapp.startWhatsApp.bind(this.handlers.whatsapp)
    );
    ipcMain.handle(
      "stop-whatsapp",
      this.handlers.whatsapp.stopWhatsApp.bind(this.handlers.whatsapp)
    );
  }

  registerConfigHandlers() {
    ipcMain.handle(
      "open-config",
      this.handlers.config.openConfig.bind(this.handlers.config)
    );
    ipcMain.handle(
      "config-close-window",
      this.handlers.config.closeWindow.bind(this.handlers.config)
    );

    this.registerConfigMethodIfExists(
      "getSystemConfig",
      "config-get-system-config"
    );
    this.registerConfigMethodIfExists(
      "updateSystemConfig",
      "config-update-system-config"
    );
    this.registerConfigMethodIfExists(
      "getAvailableOptions",
      "config-get-available-options"
    );
    this.registerConfigMethodIfExists(
      "getThemeSettings",
      "config-get-theme-settings"
    );
    this.registerConfigMethodIfExists(
      "updateThemeSettings",
      "config-update-theme-settings"
    );
    this.registerConfigMethodIfExists(
      "exportSettings",
      "config-export-settings"
    );
    this.registerConfigMethodIfExists(
      "importSettings",
      "config-import-settings"
    );
  }

  registerConfigMethodIfExists(methodName, ipcChannel) {
    if (typeof this.handlers.config[methodName] === "function") {
      ipcMain.handle(
        ipcChannel,
        this.handlers.config[methodName].bind(this.handlers.config)
      );
      console.log(`Registrado: ${ipcChannel}`);
    } else {
      console.warn(`Método ${methodName} não encontrado em ConfigHandlers`);
    }
  }

  registerMessageHandlers() {
    ipcMain.handle(
      "message-get-messages",
      this.handlers.message.getMessages.bind(this.handlers.message)
    );
    ipcMain.handle(
      "message-add-message",
      this.handlers.message.addMessage.bind(this.handlers.message)
    );
    ipcMain.handle(
      "message-update-message",
      this.handlers.message.updateMessage.bind(this.handlers.message)
    );
    ipcMain.handle(
      "message-delete-message",
      this.handlers.message.deleteMessage.bind(this.handlers.message)
    );
    ipcMain.handle(
      "message-get-last-message",
      this.handlers.message.getLastMessage.bind(this.handlers.message)
    );

    ipcMain.handle(
      "message-add-message-with-audio",
      this.handlers.message.addMessageWithAudio.bind(this.handlers.message)
    );
    ipcMain.handle(
      "message-update-message-with-audio",
      this.handlers.message.updateMessageWithAudio.bind(this.handlers.message)
    );
    ipcMain.handle(
      "message-get-audio-files",
      this.handlers.message.getExistingAudioFiles.bind(this.handlers.message)
    );
    ipcMain.handle(
      "message-validate-audio-file",
      this.handlers.message.validateAudioFile.bind(this.handlers.message)
    );

    this.registerMessageMethodIfExists("getMessageTypes", "message-get-types");
    this.registerMessageMethodIfExists(
      "getMessageLocales",
      "message-get-locales"
    );
    this.registerMessageMethodIfExists(
      "checkMessageCompleteness",
      "message-check-completeness"
    );
    this.registerMessageMethodIfExists(
      "getAvailableOptions",
      "message-get-available-options"
    );
  }

  registerMessageMethodIfExists(methodName, ipcChannel) {
    if (typeof this.handlers.message[methodName] === "function") {
      ipcMain.handle(
        ipcChannel,
        this.handlers.message[methodName].bind(this.handlers.message)
      );
      console.log(`Registrado: ${ipcChannel}`);
    } else {
      console.warn(`Método ${methodName} não encontrado em MessageHandlers`);
    }
  }

  registerCityHandlers() {
    ipcMain.handle(
      "city-get-cities",
      this.handlers.city.getCities.bind(this.handlers.city)
    );
    ipcMain.handle(
      "city-add-city",
      this.handlers.city.addCity.bind(this.handlers.city)
    );
    ipcMain.handle(
      "city-update-city",
      this.handlers.city.updateCity.bind(this.handlers.city)
    );
    ipcMain.handle(
      "city-delete-city",
      this.handlers.city.deleteCity.bind(this.handlers.city)
    );
    ipcMain.handle(
      "city-get-by-id",
      this.handlers.city.getCityById.bind(this.handlers.city)
    );

    console.log("Handlers de cidade registrados");
  }

  registerIndicadoresHandlers() {
    ipcMain.handle(
      "indicadores-get-statistics",
      this.handlers.indicadores.getStatistics.bind(this.handlers.indicadores)
    );
    ipcMain.handle(
      "indicadores-get-hourly-statistics",
      this.handlers.indicadores.getHourlyStatistics.bind(
        this.handlers.indicadores
      )
    );
    ipcMain.handle(
      "indicadores-get-summary-statistics",
      this.handlers.indicadores.getSummaryStatistics.bind(
        this.handlers.indicadores
      )
    );
    ipcMain.handle(
      "indicadores-clear-statistics",
      this.handlers.indicadores.clearStatistics.bind(this.handlers.indicadores)
    );
    ipcMain.handle(
      "indicadores-export-to-txt",
      this.handlers.indicadores.exportToTxt.bind(this.handlers.indicadores)
    );

    console.log("Handlers de indicadores registrados");
  }

  registerModoDevHandlers() {
    ipcMain.handle(
      "modo-dev-toggle-dev-mode",
      this.handlers.modoDev.toggleDevMode.bind(this.handlers.modoDev)
    );
    ipcMain.handle(
      "modo-dev-toggle-debug-mode",
      this.handlers.modoDev.toggleDebugMode.bind(this.handlers.modoDev)
    );
    ipcMain.handle(
      "modo-dev-set-scout-time",
      this.handlers.modoDev.setScoutTime.bind(this.handlers.modoDev)
    );
    ipcMain.handle(
      "modo-dev-get-scout-config",
      this.handlers.modoDev.getScoutConfig.bind(this.handlers.modoDev)
    );

    // ✅ RESTAURADO - Obter modo atual (DEV/PRODUÇÃO)
    ipcMain.handle(
      "modo-dev-get-current-mode",
      this.handlers.modoDev.getCurrentMode.bind(this.handlers.modoDev)
    );

    // ❌ REMOVIDO - Toggle entre SINGLE/MULTI
    // ipcMain.handle("modo-dev-toggle-group-mode", ...)

    ipcMain.handle(
      "modo-dev-get-current-locale",
      this.handlers.modoDev.getCurrentLocale.bind(this.handlers.modoDev)
    );
    ipcMain.handle(
      "modo-dev-get-available-locales",
      this.handlers.modoDev.getAvailableLocales.bind(this.handlers.modoDev)
    );
    ipcMain.handle(
      "modo-dev-set-locale",
      this.handlers.modoDev.setLocale.bind(this.handlers.modoDev)
    );

    console.log("Handlers de modo dev registrados");
  }

  registerDataBaseHandlers() {
    ipcMain.handle(
      "database-get-all-tables",
      this.handlers.dataBase.getAllTables.bind(this.handlers.dataBase)
    );
    ipcMain.handle(
      "database-get-table-info",
      this.handlers.dataBase.getTableInfo.bind(this.handlers.dataBase)
    );
    ipcMain.handle(
      "database-get-table-counts",
      this.handlers.dataBase.getTableCounts.bind(this.handlers.dataBase)
    );
    ipcMain.handle(
      "database-get-database-info",
      this.handlers.dataBase.getDatabaseInfo.bind(this.handlers.dataBase)
    );
    ipcMain.handle(
      "database-get-primary-city",
      this.handlers.dataBase.getPrimaryCity.bind(this.handlers.dataBase)
    );
    ipcMain.handle(
      "database-get-overview",
      this.handlers.dataBase.getDatabaseOverview.bind(this.handlers.dataBase)
    );

    console.log("Handlers de banco de dados registrados");
  }

  registerDroneHandlers() {
    ipcMain.handle(
      "open-drone",
      this.handlers.drone.openDrone.bind(this.handlers.drone)
    );

    ipcMain.handle(
      "drone-listar-mensagens",
      this.handlers.drone.listarMensagens.bind(this.handlers.drone)
    );
    ipcMain.handle(
      "drone-listar-numeros-atuais",
      this.handlers.drone.listarNumerosAtuais.bind(this.handlers.drone)
    );
    ipcMain.handle(
      "drone-remover-numero",
      this.handlers.drone.removerNumero.bind(this.handlers.drone)
    );
    ipcMain.handle(
      "drone-limpar-lista-completa",
      this.handlers.drone.limparListaCompleta.bind(this.handlers.drone)
    );
    ipcMain.handle(
      "drone-limpar-enviados",
      this.handlers.drone.limparEnviados.bind(this.handlers.drone)
    );
    ipcMain.handle(
      "drone-limpar-falhas",
      this.handlers.drone.limparFalhas.bind(this.handlers.drone)
    );
    ipcMain.handle(
      "drone-obter-estatisticas-numeros",
      this.handlers.drone.obterEstatisticasNumeros.bind(this.handlers.drone)
    );
    ipcMain.handle(
      "drone-obter-status-cliente",
      this.handlers.drone.obterStatusCliente.bind(this.handlers.drone)
    );
    ipcMain.handle(
      "drone-executar-disparo-drone",
      this.handlers.drone.executarDisparoDrone.bind(this.handlers.drone)
    );

    ipcMain.handle(
      "drone-processar-arquivo-csv",
      this.handlers.drone.processarArquivoCSV.bind(this.handlers.drone)
    );
    ipcMain.handle(
      "drone-preview-csv",
      this.handlers.drone.previewCSV.bind(this.handlers.drone)
    );
    ipcMain.handle(
      "drone-validar-opcoes",
      this.handlers.drone.validarOpcoes.bind(this.handlers.drone)
    );

    this.registerDroneMethodIfExists(
      "gerarRelatorioNomes",
      "drone-gerar-relatorio-nomes"
    );

    // ========================================
    // NOVO: Handlers de instâncias para o Drone
    // ========================================
    ipcMain.handle(
      "drone-obter-status-todas-instancias",
      this.handlers.drone.obterStatusTodasInstancias.bind(this.handlers.drone)
    );
    ipcMain.handle(
      "drone-listar-instancias-conectadas",
      this.handlers.drone.listarInstanciasConectadas.bind(this.handlers.drone)
    );

    console.log("Handlers de drone registrados");
  }

  registerDroneMethodIfExists(methodName, ipcChannel) {
    if (typeof this.handlers.drone[methodName] === "function") {
      ipcMain.handle(
        ipcChannel,
        this.handlers.drone[methodName].bind(this.handlers.drone)
      );
      console.log(`Registrado: ${ipcChannel}`);
    } else {
      console.warn(`Método ${methodName} não encontrado em DroneHandlers`);
    }
  }

  // ========================================
  // NOVO: Handlers de Instâncias
  // ========================================
  registerInstanceHandlers() {
    // Inicialização
    ipcMain.handle(
      "instance-initialize",
      this.handlers.instance.initialize.bind(this.handlers.instance)
    );

    // CRUD de instâncias
    ipcMain.handle(
      "instance-list",
      this.handlers.instance.listInstances.bind(this.handlers.instance)
    );
    ipcMain.handle(
      "instance-create",
      this.handlers.instance.createInstance.bind(this.handlers.instance)
    );
    ipcMain.handle(
      "instance-remove",
      this.handlers.instance.removeInstance.bind(this.handlers.instance)
    );
    ipcMain.handle(
      "instance-rename",
      this.handlers.instance.renameInstance.bind(this.handlers.instance)
    );

    // Controle de conexão
    ipcMain.handle(
      "instance-start",
      this.handlers.instance.startInstance.bind(this.handlers.instance)
    );
    ipcMain.handle(
      "instance-stop",
      this.handlers.instance.stopInstance.bind(this.handlers.instance)
    );
    ipcMain.handle(
      "instance-reconnect",
      this.handlers.instance.reconnectInstance.bind(this.handlers.instance)
    );
    ipcMain.handle(
      "instance-stop-all",
      this.handlers.instance.stopAllInstances.bind(this.handlers.instance)
    );

    // Status
    ipcMain.handle(
      "instance-status",
      this.handlers.instance.getInstanceStatus.bind(this.handlers.instance)
    );
    ipcMain.handle(
      "instance-status-all",
      this.handlers.instance.getAllInstancesStatus.bind(this.handlers.instance)
    );
    ipcMain.handle(
      "instance-client-info",
      this.handlers.instance.getClientInfo.bind(this.handlers.instance)
    );

    // Mensagens
    ipcMain.handle(
      "instance-send-message",
      this.handlers.instance.sendMessage.bind(this.handlers.instance)
    );

    // Configuração
    ipcMain.handle(
      "instance-get-config",
      this.handlers.instance.getConfig.bind(this.handlers.instance)
    );

    console.log("Handlers de instâncias registrados");
  }

  registerCacheHandlers() {
    ipcMain.handle(
      "clear-cache",
      this.handlers.cache.clearCache.bind(this.handlers.cache)
    );
    console.log("Handlers de cache registrados");
  }

  registerDeeJayHandlers() {
     ipcMain.handle("dee-jay-get-instances", this.handlers.deeJay.getInstances.bind(this.handlers.deeJay));
     ipcMain.handle("dee-jay-create-instance", this.handlers.deeJay.createInstance.bind(this.handlers.deeJay));
     ipcMain.handle("dee-jay-remove-instance", this.handlers.deeJay.removeInstance.bind(this.handlers.deeJay));
     ipcMain.handle("dee-jay-start-instance", this.handlers.deeJay.startInstance.bind(this.handlers.deeJay));
     ipcMain.handle("dee-jay-stop-instance", this.handlers.deeJay.stopInstance.bind(this.handlers.deeJay));
     ipcMain.handle("dee-jay-start-loop", this.handlers.deeJay.startLoop.bind(this.handlers.deeJay));
     ipcMain.handle("dee-jay-stop-loop", this.handlers.deeJay.stopLoop.bind(this.handlers.deeJay));
     ipcMain.handle("dee-jay-get-config", this.handlers.deeJay.getConfig.bind(this.handlers.deeJay));
     ipcMain.handle("dee-jay-set-config", this.handlers.deeJay.setConfig.bind(this.handlers.deeJay));
     ipcMain.handle("open-dee-jay-window", this.handlers.deeJay.openDeeJayWindow.bind(this.handlers.deeJay));
     
     console.log("Handlers de Dee Jay registrados");
  }

  registerUpdateHandlers() {
    ipcMain.handle(
      "check-update",
      this.handlers.update.checkUpdate.bind(this.handlers.update)
    );
    ipcMain.handle(
      "trigger-update",
      this.handlers.update.triggerUpdate.bind(this.handlers.update)
    );
    console.log("Handlers de update registrados");
  }

  registerCRMHandlers() {
    ipcMain.handle(
      "open-crm",
      this.handlers.crm.openCRM.bind(this.handlers.crm)
    );
    ipcMain.handle(
      "crm-create-instance",
      this.handlers.crm.createCRMInstance.bind(this.handlers.crm)
    );
    ipcMain.handle(
      "crm-get-instances",
      this.handlers.crm.getCRMInstances.bind(this.handlers.crm)
    );
    ipcMain.handle(
      "crm-start-instance",
      this.handlers.crm.startInstance.bind(this.handlers.crm)
    );
    ipcMain.handle(
      "crm-stop-instance",
      this.handlers.crm.stopInstance.bind(this.handlers.crm)
    );
    ipcMain.handle(
      "crm-remove-instance",
      this.handlers.crm.removeInstance.bind(this.handlers.crm)
    );
    ipcMain.handle(
      "crm-get-manifests",
      this.handlers.crm.getManifests.bind(this.handlers.crm)
    );
    ipcMain.handle(
      "crm-generate-pdf",
      this.handlers.crm.generatePdf.bind(this.handlers.crm)
    );
    console.log("Handlers de CRM registrados");
  }

  registerGoatHandlers() {
    ipcMain.handle(
      "open-goat",
      this.handlers.goat.openGoat.bind(this.handlers.goat)
    );
    console.log("Handlers de Goat registrados");
  }

  registerSentinelaHandlers() {
    ipcMain.handle(
      "open-sentinela",
      this.handlers.sentinela.openSentinela.bind(this.handlers.sentinela)
    );
    console.log("Handlers de Sentinela registrados");
  }

  // ========================================
  // Getter para InstanceHandlers (útil para inicialização)
  // ========================================
  getInstanceHandler() {
    return this.handlers.instance;
  }

  removeAllHandlers() {
    const events = [
      "start-whatsapp",
      "stop-whatsapp",
      "open-config",
      "config-close-window",
      "config-get-system-config",
      "config-update-system-config",
      "config-get-available-options",
      "config-get-theme-settings",
      "config-update-theme-settings",
      "config-export-settings",
      "config-import-settings",
      "message-get-messages",
      "message-add-message",
      "message-update-message",
      "message-delete-message",
      "message-get-last-message",
      "message-get-types",
      "message-get-locales",
      "message-get-available-options",
      "message-check-completeness",
      "message-add-message-with-audio",
      "message-update-message-with-audio",
      "message-get-audio-files",
      "message-validate-audio-file",
      "city-get-cities",
      "city-add-city",
      "city-update-city",
      "city-delete-city",
      "city-get-by-id",
      "indicadores-get-statistics",
      "indicadores-get-hourly-statistics",
      "indicadores-get-summary-statistics",
      "indicadores-clear-statistics",
      "indicadores-export-to-txt",
      "modo-dev-toggle-dev-mode",
      "modo-dev-toggle-debug-mode",
      "modo-dev-set-scout-time",
      "modo-dev-get-scout-config",
      "modo-dev-get-current-mode",
      "modo-dev-get-current-locale",
      "modo-dev-get-available-locales",
      "modo-dev-set-locale",
      "database-get-all-tables",
      "database-get-table-info",
      "database-get-table-counts",
      "database-get-database-info",
      "database-get-primary-city",
      "database-get-overview",
      "open-drone",
      "drone-listar-mensagens",
      "drone-listar-numeros-atuais",
      "drone-remover-numero",
      "drone-limpar-lista-completa",
      "drone-limpar-enviados",
      "drone-limpar-falhas",
      "drone-obter-estatisticas-numeros",
      "drone-obter-status-cliente",
      "drone-executar-disparo-drone",
      "drone-processar-arquivo-csv",
      "drone-preview-csv",
      "drone-validar-opcoes",
      "drone-gerar-relatorio-nomes",
      "drone-obter-status-todas-instancias",
      "drone-listar-instancias-conectadas",
      // Novos eventos de instâncias
      "instance-initialize",
      "instance-list",
      "instance-create",
      "instance-remove",
      "instance-rename",
      "instance-start",
      "instance-stop",
      "instance-reconnect",
      "instance-stop-all",
      "instance-status",
      "instance-status-all",
      "instance-client-info",
      "instance-send-message",
      "instance-get-config",
      "instance-get-config",
      "instance-get-config",
      "clear-cache",
      "check-update",
      "trigger-update",
      "open-goat",
      "open-sentinela",
      "crm-get-manifests",
      "crm-generate-pdf"
    ];

    events.forEach((event) => {
      ipcMain.removeAllListeners(event);
    });
  }

  getHandler(type) {
    return this.handlers[type];
  }
}

module.exports = IPCManager;
