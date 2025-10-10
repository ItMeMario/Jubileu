const { ipcMain } = require("electron");
const WhatsAppHandlers = require("./ipc/whatsAppHandlers");
const ConfigHandlers = require("./ipc/configHandlers");
const MessageHandlers = require("./ipc/messageHandlers");
const CityHandlers = require("./ipc/cityHandlers");
const IndicadoresHandlers = require("./ipc/indicadoresHandlers");
const ModoDevHandlers = require("./ipc/modoDevHandlers");
const DataBaseHandlers = require("./ipc/dataBaseHandlers");
const DroneHandlers = require("./ipc/droneHandlers");

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
      "city-set-primary",
      this.handlers.city.setPrimaryCity.bind(this.handlers.city)
    );
    ipcMain.handle(
      "city-get-primary",
      this.handlers.city.getPrimaryCity.bind(this.handlers.city)
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
    ipcMain.handle(
      "modo-dev-get-current-mode",
      this.handlers.modoDev.getCurrentMode.bind(this.handlers.modoDev)
    );

    ipcMain.handle(
      "modo-dev-toggle-group-mode",
      this.handlers.modoDev.toggleGroupMode.bind(this.handlers.modoDev)
    );

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
      "city-set-primary",
      "city-get-primary",
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
      "modo-dev-toggle-group-mode",
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
      "drone-obter-estatisticas-numeros",
      "drone-obter-status-cliente",
      "drone-executar-disparo-drone",
      "drone-processar-arquivo-csv",
      "drone-preview-csv",
      "drone-validar-opcoes",
      "drone-gerar-relatorio-nomes",
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
