// main/moduleLoader.js
class ModuleLoader {
  constructor() {
    this.modules = {};
    this.isLoaded = false;
  }

  async loadAll() {
    try {
      // Carrega módulo do cliente WhatsApp
      await this.loadClientModule();

      // Carrega utilitários de inicialização
      await this.loadInitializationUtils();

      this.isLoaded = true;
      console.log("✅ Todos os módulos do Zwei Chat carregados com sucesso");
    } catch (error) {
      console.error("❌ Erro ao carregar módulos do Zwei Chat:", error);
      throw error;
    }
  }

  async loadClientModule() {
    try {
      const clientModule = require("../client/client");
      this.modules.client = clientModule.client;
      this.modules.initializeClient = clientModule.initializeClient;

      console.log("✅ Módulo client do Zwei Chat carregado");
    } catch (error) {
      console.error("❌ Erro ao carregar módulo client do Zwei Chat:", error);
      throw new Error("Falha ao carregar cliente WhatsApp");
    }
  }

  async loadInitializationUtils() {
    try {
      const { initializeAllConfigs } = require("../config/initialize");
      this.modules.initializeAllConfigs = initializeAllConfigs;

      console.log("✅ Utilitários de inicialização carregados");
    } catch (error) {
      console.error("❌ Erro ao carregar utilitários:", error);
      throw new Error("Falha ao carregar utilitários de inicialização");
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
}

module.exports = ModuleLoader;
