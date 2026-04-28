// config/initialize.js
const { debug } = require("../services/debugService");

// Importa módulos de diretórios
const {
  ensureDataDirectory,
  ensureAudioDirectory,
  ensureDatabaseDirectory,
  DATA_DIR,
  DATABASE_DIR,
  AUDIO_DIR,
  DATABASE_PATH,
  paths,
} = require("./initializeModules/directoriesIM");

// Importa módulos de utilitários
const {
  readJsonFile,
  saveJsonFile,
  createJsonFileIfNotExists,
} = require("./initializeModules/utilsIM");

// Importa módulos de configuração JSON
const { initializeConfigJson } = require("./initializeModules/configJsonIM");

const {
  initializeDevModeConfig,
  migrateDevModeIfNeeded,
} = require("./initializeModules/devModeIM");

const { initializeMessagesConfig } = require("./initializeModules/messagesIM");

const { initializeAntiSpamConfig } = require("./initializeModules/antiSpamIM");

// Importa módulo do banco de dados
const {
  databaseExists,
  checkTableExists,
  runQuery,
  getDatabaseConnection,
  initializeDatabase,
} = require("./initializeModules/databaseIM");

// Importa módulo de instâncias
const {
  MAX_INSTANCES,
  INSTANCE_STATUS,
  initializeInstancesTable,
  getAllInstances,
  getInstanceById,
  countActiveInstances,
  createInstance,
  updateInstanceStatus,
  updateInstanceName,
  deleteInstance,
  hardDeleteInstance,
  resetAllInstancesStatus,
} = require("./initializeModules/instancesIM");

// Importa módulo de clientes do Drone (NOVO)
const {
  initializeDroneClientsTable,
  getDroneClientsStats,
  clearClientsByInstance,
} = require("./initializeModules/droneClientsIM");

const {
  initializeDroneInstancesTable,
  resetAllDroneInstancesStatus,
} = require("./initializeModules/droneInstancesIM");

const {
  initializeDeeJayInstancesTable,
} = require("./initializeModules/deeJayIM");

const {
  initializeCrmInstancesTable,
  resetAllCrmInstancesStatus,
} = require("./initializeModules/crmIM");

/**
 * Inicializa todos os arquivos, pastas e banco de dados do sistema
 * @returns {Promise<{success: number, errors: number}>}
 */
async function initializeAllConfigs() {
  debug("🚀 Inicializando arquivos, pastas e banco de dados do sistema...\n");

  // Inicializa banco de dados
  try {
    const dbPath = await initializeDatabase();
    debug(`✅ Banco de dados inicializado: ${dbPath}`);
  } catch (error) {
    console.error("❌ Erro crítico ao inicializar banco de dados:", error);
    throw error;
  }

  // Inicializa tabela de instâncias
  try {
    await initializeInstancesTable();
    debug("✅ Tabela de instâncias inicializada");

    // Reseta status de todas as instâncias na inicialização
    await resetAllInstancesStatus();
    debug("✅ Status das instâncias resetado para 'disconnected'");
  } catch (error) {
    console.error("❌ Erro ao inicializar tabela de instâncias:", error);
    throw error;
  }

  // Inicializa tabela de clientes do Drone (NOVO)
  try {
    await initializeDroneClientsTable();
    debug("✅ Tabela de clientes do Drone inicializada");
  } catch (error) {
    console.error("❌ Erro ao inicializar tabela de clientes do Drone:", error);
    throw error;
  }

  // Inicializa tabela de instâncias do Drone
  try {
    await initializeDroneInstancesTable();
    debug("✅ Tabela de instâncias do Drone inicializada");
    
    await resetAllDroneInstancesStatus();
    debug("✅ Status das instâncias do Drone resetado para 'disconnected'");
  } catch (error) {
    console.error("❌ Erro ao inicializar tabela de instâncias do Drone:", error);
    throw error;
  }

  // Inicializa tabela de instâncias Dee Jay
  try {
    await initializeDeeJayInstancesTable();
    debug("✅ Tabela de instâncias Dee Jay inicializada");
  } catch (error) {
    console.error("❌ Erro ao inicializar tabela de instâncias Dee Jay:", error);
    throw error;
  }

  // Inicializa tabela de instâncias CRM
  try {
    await initializeCrmInstancesTable();
    debug("✅ Tabela de instâncias CRM inicializada");
    
    await resetAllCrmInstancesStatus();
    debug("✅ Status das instâncias CRM resetado para 'disconnected'");
  } catch (error) {
    console.error("❌ Erro ao inicializar tabela de instâncias CRM:", error);
    throw error;
  }

  // Inicializa pasta de áudio
  try {
    await ensureAudioDirectory();
    debug(`✅ Pasta de áudio inicializada: ${AUDIO_DIR}`);
  } catch (error) {
    console.error("❌ Erro ao inicializar pasta de áudio:", error);
    throw error;
  }

  // Inicializa arquivos de configuração JSON
  const results = await Promise.allSettled([
    initializeConfigJson(),
    initializeDevModeConfig(),
    initializeMessagesConfig(),
    initializeAntiSpamConfig(),
  ]);

  // Executa migração do devMode se necessário
  await migrateDevModeIfNeeded();

  // Conta sucessos e erros
  const successCount = results.filter((r) => r.status === "fulfilled").length;
  const errorCount = results.filter((r) => r.status === "rejected").length;

  await debug(
    `✅ Inicialização concluída: ${successCount} sucesso(s), ${errorCount} erro(s)\n`
  );

  // Exibe detalhes dos erros se houver
  if (errorCount > 0) {
    await debug("❌ Detalhes dos erros:");
    const functionNames = [
      "initializeConfigJson",
      "initializeDevModeConfig",
      "initializeMessagesConfig",
      "initializeAntiSpamConfig",
    ];

    results.forEach((r, i) => {
      if (r.status === "rejected") {
        console.error(`   ${functionNames[i]}: ${r.reason.message}`);
      }
    });
    await debug("");
  }

  return { success: successCount, errors: errorCount };
}

// Exporta todas as funções e constantes necessárias
module.exports = {
  // Funções de diretórios
  ensureDataDirectory,
  ensureAudioDirectory,
  ensureDatabaseDirectory,

  // Constantes de caminhos
  DATA_DIR,
  DATABASE_DIR,
  AUDIO_DIR,
  DATABASE_PATH,
  paths,

  // Funções de utilitários JSON
  readJsonFile,
  saveJsonFile,
  createJsonFileIfNotExists,

  // Funções de inicialização de configs JSON
  initializeConfigJson,
  initializeDevModeConfig,
  initializeMessagesConfig,
  initializeAntiSpamConfig,

  // Funções de banco de dados
  databaseExists,
  checkTableExists,
  runQuery,
  getDatabaseConnection,
  initializeDatabase,

  // Funções de migração
  migrateDevModeIfNeeded,

  // Constantes de instâncias
  MAX_INSTANCES,
  INSTANCE_STATUS,

  // Funções de instâncias
  initializeInstancesTable,
  getAllInstances,
  getInstanceById,
  countActiveInstances,
  createInstance,
  updateInstanceStatus,
  updateInstanceName,
  deleteInstance,
  hardDeleteInstance,
  resetAllInstancesStatus,

  // Funções de clientes do Drone (NOVO)
  initializeDroneClientsTable,
  getDroneClientsStats,
  clearClientsByInstance,

  // Funções de instâncias do Drone
  initializeDroneInstancesTable,
  resetAllDroneInstancesStatus,

  // Função principal
  initializeAllConfigs,
};
