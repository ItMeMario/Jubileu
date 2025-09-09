const { ipcMain } = require("electron");
const WhatsAppHandlers = require("./ipc/whatsAppHandlers");
const ConfigHandlers = require("./ipc/configHandlers");
const MessageHandlers = require("./ipc/messageHandlers");
const CityHandlers = require("./ipc/cityHandlers");
const IndicadoresHandlers = require("./ipc/indicadoresHandlers");
const ModoDevHandlers = require("./ipc/modoDevHandlers");
const DataBaseHandlers = require("./ipc/dataBaseHandlers");

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
    // Handlers básicos que já existem
    ipcMain.handle(
      "open-config",
      this.handlers.config.openConfig.bind(this.handlers.config)
    );
    ipcMain.handle(
      "config-close-window",
      this.handlers.config.closeWindow.bind(this.handlers.config)
    );

    // Registra apenas métodos que existem no ConfigHandlers
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
    // Handlers básicos de mensagens (que já existem)
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

    // Registra métodos novos com verificação
    this.registerMessageMethodIfExists("getMessageTypes", "message-get-types");
    this.registerMessageMethodIfExists(
      "getMessageLocales",
      "message-get-locales"
    );
    this.registerMessageMethodIfExists(
      "checkMessageCompleteness",
      "message-check-completeness"
    );

    // Mantém compatibilidade com método antigo
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
    // Handlers básicos de cidades
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
    // Handlers de indicadores
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
    // Handlers de modo dev
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
    // REMOVIDO: modo-dev-get-detailed-status - não será mais usado
    ipcMain.handle(
      "modo-dev-toggle-group-mode",
      this.handlers.modoDev.toggleGroupMode.bind(this.handlers.modoDev)
    );

    // ========== NOVOS HANDLERS PARA LOCALE ==========
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
    // Handlers de banco de dados
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

  // Método para limpar todos os handlers (útil para testes ou reinicialização)
  removeAllHandlers() {
    const events = [
      // WhatsApp events
      "start-whatsapp",
      "stop-whatsapp",

      // Config events
      "open-config",
      "config-close-window",
      "config-get-system-config",
      "config-update-system-config",
      "config-get-available-options",
      "config-get-theme-settings",
      "config-update-theme-settings",
      "config-export-settings",
      "config-import-settings",

      // Message events
      "message-get-messages",
      "message-add-message",
      "message-update-message",
      "message-delete-message",
      "message-get-last-message",
      "message-get-types",
      "message-get-locales",
      "message-get-available-options",
      "message-check-completeness",

      // City events
      "city-get-cities",
      "city-add-city",
      "city-update-city",
      "city-delete-city",
      "city-set-primary",
      "city-get-primary",
      "city-get-by-id",

      // Indicadores events
      "indicadores-get-statistics",
      "indicadores-get-hourly-statistics",
      "indicadores-get-summary-statistics",
      "indicadores-clear-statistics",
      "indicadores-export-to-txt",

      // Modo Dev events - ATUALIZADO: adicionados eventos de locale
      "modo-dev-toggle-dev-mode",
      "modo-dev-toggle-debug-mode",
      "modo-dev-set-scout-time",
      "modo-dev-get-scout-config",
      "modo-dev-get-current-mode",
      "modo-dev-toggle-group-mode",
      // NOVOS: eventos de locale
      "modo-dev-get-current-locale",
      "modo-dev-get-available-locales",
      "modo-dev-set-locale",

      // Database events
      "database-get-all-tables",
      "database-get-table-info",
      "database-get-table-counts",
      "database-get-database-info",
      "database-get-primary-city",
      "database-get-overview",
    ];

    events.forEach((event) => {
      ipcMain.removeAllListeners(event);
    });
  }

  // Método para obter handler específico (útil para debug)
  getHandler(type) {
    return this.handlers[type];
  }
}

module.exports = IPCManager;
