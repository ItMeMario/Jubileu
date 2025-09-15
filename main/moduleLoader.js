class ModuleLoader {
  constructor() {
    this.modules = {};
    this.isLoaded = false;
  }

  async loadAll() {
    try {
      // Carrega módulo do cliente WhatsApp
      await this.loadClientModule();

      // Carrega handler de mensagens
      await this.loadMessageHandler();

      // Carrega utilitários de inicialização
      await this.loadInitializationUtils();

      this.isLoaded = true;
      console.log("Todos os módulos carregados com sucesso");
    } catch (error) {
      console.error("Erro ao carregar módulos:", error);
      throw error;
    }
  }

  async loadClientModule() {
    try {
      const clientModule = require("../client/client");
      this.modules.client = clientModule.client;
      this.modules.startScout = clientModule.startScout;

      console.log("Módulo client carregado");
    } catch (error) {
      console.error("Erro ao carregar módulo client:", error);
      throw new Error("Falha ao carregar cliente WhatsApp");
    }
  }

  async loadMessageHandler() {
    try {
      this.modules.messageHandler = require("../handlers/message");
      console.log("Handler de mensagens carregado");
    } catch (error) {
      console.error("Erro ao carregar message handler:", error);
      throw new Error("Falha ao carregar handler de mensagens");
    }
  }

  async loadInitializationUtils() {
    try {
      const { initializeAllConfigs } = require("../utils/initialize");
      this.modules.initializeAllConfigs = initializeAllConfigs;

      const { initializeApp } = require("../controllers/configController");
      this.modules.initializeApp = initializeApp;

      console.log("Utilitários de inicialização carregados");
    } catch (error) {
      console.error("Erro ao carregar utilitários:", error);
      throw new Error("Falha ao carregar utilitários de inicialização");
    }
  }

  async initializeConfigs() {
    if (!this.isLoaded) {
      throw new Error("Módulos não foram carregados ainda");
    }

    try {
      if (this.modules.initializeAllConfigs) {
        await this.modules.initializeAllConfigs();
        console.log("Configurações inicializadas");
      }
    } catch (error) {
      console.error("Erro na inicialização das configurações:", error);
      throw error;
    }
  }

  getModule(moduleName) {
    return this.modules[moduleName];
  }

  getModules() {
    return this.modules;
  }

  isModulesLoaded() {
    return this.isLoaded;
  }

  // Método para verificar se módulos críticos estão disponíveis
  validateCriticalModules() {
    const criticalModules = ["client", "startScout", "messageHandler"];
    const missing = criticalModules.filter((module) => !this.modules[module]);

    if (missing.length > 0) {
      throw new Error(`Módulos críticos não carregados: ${missing.join(", ")}`);
    }

    return true;
  }
}

module.exports = ModuleLoader;
