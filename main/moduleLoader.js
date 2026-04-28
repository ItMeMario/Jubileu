const { instanceManager } = require("../services/instanceManager");
const { droneInstanceManager } = require("../services/droneServiceModules/droneInstanceManagerDSM");

class ModuleLoader {
  constructor() {
    this.modules = {};
    this.isLoaded = false;
  }

  async loadAll() {
    try {
      // Carrega módulo do cliente WhatsApp (legado)
      await this.loadClientModule();

      // Carrega handler de mensagens
      await this.loadMessageHandler();

      // Carrega utilitários de inicialização
      await this.loadInitializationUtils();

      // Carrega módulos do sistema de lembretes
      await this.loadReminderModules();

      // NOVO: Carrega e inicializa o InstanceManager
      await this.loadInstanceManager();

      // NOVO: Carrega e inicializa o DroneInstanceManager
      await this.loadDroneInstanceManager();

      this.isLoaded = true;
      console.log("✅ Todos os módulos carregados com sucesso");
    } catch (error) {
      console.error("❌ Erro ao carregar módulos:", error);
      throw error;
    }
  }

  async loadClientModule() {
    try {
      const clientModule = require("../client/client");
      this.modules.client = clientModule.client;
      this.modules.startScout = clientModule.startScout;

      console.log("✅ Módulo client carregado (legado)");
    } catch (error) {
      console.error("❌ Erro ao carregar módulo client:", error);
      throw new Error("Falha ao carregar cliente WhatsApp");
    }
  }

  async loadMessageHandler() {
    try {
      this.modules.messageHandler = require("../handlers/message");
      console.log("✅ Handler de mensagens carregado");
    } catch (error) {
      console.error("❌ Erro ao carregar message handler:", error);
      throw new Error("Falha ao carregar handler de mensagens");
    }
  }

  async loadInitializationUtils() {
    try {
      const { initializeAllConfigs } = require("../config/initialize");
      this.modules.initializeAllConfigs = initializeAllConfigs;

      const { initializeApp } = require("../controllers/configController");
      this.modules.initializeApp = initializeApp;

      console.log("✅ Utilitários de inicialização carregados");
    } catch (error) {
      console.error("❌ Erro ao carregar utilitários:", error);
      throw new Error("Falha ao carregar utilitários de inicialização");
    }
  }

  async loadReminderModules() {
    try {
      // Carrega ReminderService
      this.modules.reminderService = require("../services/reminderService");

      // Carrega ReminderScheduler
      const ReminderScheduler = require("../utils/reminderScheduler");
      this.modules.ReminderScheduler = ReminderScheduler;

      console.log("✅ Módulos de lembrete carregados");
    } catch (error) {
      console.error("⚠️ Erro ao carregar módulos de lembrete:", error);
      // Não quebra a aplicação se os lembretes não carregarem
      console.warn("⚠️ Sistema de lembretes não disponível");
    }
  }

  // NOVO: Carrega e inicializa o InstanceManager
  async loadInstanceManager() {
    try {
      // Armazena referência do instanceManager
      this.modules.instanceManager = instanceManager;

      // Inicializa o manager (carrega instâncias do banco)
      await instanceManager.initialize();

      console.log("✅ InstanceManager carregado e inicializado");
    } catch (error) {
      console.error("❌ Erro ao carregar InstanceManager:", error);
      // Não quebra a aplicação, mas registra o erro
      console.warn("⚠️ Sistema de múltiplas instâncias não disponível");
    }
  }

  // NOVO: Carrega e inicializa o DroneInstanceManager
  async loadDroneInstanceManager() {
    try {
      this.modules.droneInstanceManager = droneInstanceManager;
      await droneInstanceManager.initialize();
      console.log("✅ DroneInstanceManager carregado e inicializado");
    } catch (error) {
      console.error("❌ Erro ao carregar DroneInstanceManager:", error);
      console.warn("⚠️ Sistema de instâncias do Drone não disponível");
    }
  }

  async initializeConfigs() {
    if (!this.isLoaded) {
      throw new Error("Módulos não foram carregados ainda");
    }

    try {
      if (this.modules.initializeAllConfigs) {
        await this.modules.initializeAllConfigs();
        console.log("✅ Configurações inicializadas");
      }
    } catch (error) {
      console.error("❌ Erro na inicialização das configurações:", error);
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

  // NOVO: Verifica se o sistema de instâncias está disponível
  isInstanceManagerAvailable() {
    return !!this.modules.instanceManager;
  }

  // NOVO: Obtém o InstanceManager
  getInstanceManager() {
    return this.modules.instanceManager;
  }
}

module.exports = ModuleLoader;
