const { debug } = require("../../services/debugService");
const {
  createJsonFileIfNotExists,
  readJsonFile,
  saveJsonFile,
} = require("./utilsIM");

/**
 * Configuração padrão do arquivo devMode.json
 */
const DEFAULT_DEV_MODE_CONFIG = {
  isDevMode: false,
  lastChanged: "2025-07-24T15:20:28.466Z",
  debugEnabled: false,
  lastDebugChanged: "2025-08-04T14:45:32.140Z",
  scoutConfig: {
    enabled: true,
    timeSeconds: 3600,
    timeFormatted: "01:00:00",
    lastChanged: "2025-07-25T13:22:28.015Z",
  },
};

/**
 * Inicializa o arquivo devMode.json com valores padrão
 * @returns {Promise<string>} - Caminho do arquivo criado/existente
 */
async function initializeDevModeConfig() {
  try {
    await debug("🔧 Inicializando devMode.json...");
    const filePath = await createJsonFileIfNotExists(
      "devMode.json",
      DEFAULT_DEV_MODE_CONFIG
    );
    await debug("✅ devMode.json inicializado com sucesso");
    return filePath;
  } catch (error) {
    console.error("❌ Erro ao inicializar devMode.json:", error);
    throw error;
  }
}

/**
 * Migra a configuração de devMode para incluir campos novos se necessário
 * @returns {Promise<void>}
 */
async function migrateDevModeIfNeeded() {
  try {
    const data = await readJsonFile("devMode.json");

    if (!data) return;

    let needsMigration = false;

    // Verifica e adiciona scoutConfig se não existir
    if (!data.scoutConfig) {
      await debug("🔄 Migrando configuração de devMode para incluir Scout...");
      data.scoutConfig = {
        enabled: true,
        timeSeconds: 3600,
        timeFormatted: "01:00:00",
        lastChanged: null,
      };
      needsMigration = true;
    } else {
      // Garante que todos os campos de scoutConfig existam
      if (typeof data.scoutConfig.enabled === "undefined") {
        data.scoutConfig.enabled = true;
        needsMigration = true;
      }
      if (typeof data.scoutConfig.timeSeconds === "undefined") {
        data.scoutConfig.timeSeconds = 3600;
        needsMigration = true;
      }
      if (typeof data.scoutConfig.timeFormatted === "undefined") {
        data.scoutConfig.timeFormatted = "01:00:00";
        needsMigration = true;
      }
      if (typeof data.scoutConfig.lastChanged === "undefined") {
        data.scoutConfig.lastChanged = null;
        needsMigration = true;
      }
    }

    // Verifica e adiciona debugEnabled se não existir
    if (typeof data.debugEnabled === "undefined") {
      data.debugEnabled = false;
      needsMigration = true;
    }

    // Verifica e adiciona lastDebugChanged se não existir
    if (typeof data.lastDebugChanged === "undefined") {
      data.lastDebugChanged = null;
      needsMigration = true;
    }

    // Salva apenas se houve mudanças
    if (needsMigration) {
      await saveJsonFile("devMode.json", data);
      await debug("✅ Migração de devMode concluída com sucesso!");
    }
  } catch (error) {
    console.error("❌ Erro durante migração de devMode:", error);
    throw error;
  }
}

module.exports = {
  initializeDevModeConfig,
  migrateDevModeIfNeeded,
  DEFAULT_DEV_MODE_CONFIG,
};
