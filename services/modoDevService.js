// services/modoDevService.js - VERSÃO CORRIGIDA (INÍCIO)
const fs = require("fs").promises;
const path = require("path");
const { delay, randomDelay } = require("../utils/delay");
const Locale = require("../config/locale");

// 🔧 CORREÇÃO: Função para obter caminhos corretos
function getConfigPaths() {
  let app;

  try {
    const electron = require("electron");
    app = electron.app;
  } catch (error) {
    app = null;
  }

  if (app && app.isPackaged) {
    const userDataPath = app.getPath("userData");
    return {
      CONFIG_FILE: path.join(userDataPath, "data", "devMode.json"),
      SYSTEM_CONFIG_FILE: path.join(userDataPath, "data", "config.json"),
    };
  }

  return {
    CONFIG_FILE: path.join(__dirname, "../data/devMode.json"),
    SYSTEM_CONFIG_FILE: path.join(__dirname, "../data/config.json"),
  };
}

const paths = getConfigPaths();
const CONFIG_FILE = paths.CONFIG_FILE;
const SYSTEM_CONFIG_FILE = paths.SYSTEM_CONFIG_FILE;

console.log("📂 modoDevService.js - Caminhos dos configs:");
console.log("   CONFIG_FILE:", CONFIG_FILE);
console.log("   SYSTEM_CONFIG_FILE:", SYSTEM_CONFIG_FILE);

const DEFAULT_CONFIG = {
  isDevMode: false,
  debugEnabled: false,
  lastChanged: null,
  lastDebugChanged: null,
  scoutConfig: {
    enabled: false,
    timeSeconds: 300,
    timeFormatted: "00:05:00",
    lastChanged: null,
  },
};

// Resto do código permanece igual...
async function loadConfig() {
  try {
    const data = await fs.readFile(CONFIG_FILE, "utf8");
    const config = JSON.parse(data);

    if (!config.scoutConfig) {
      config.scoutConfig = DEFAULT_CONFIG.scoutConfig;
      await saveConfig(config);
    }

    return config;
  } catch (error) {
    console.error("Erro ao carregar configuração:", error);
    return DEFAULT_CONFIG;
  }
}

async function saveConfig(config) {
  try {
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error("Erro ao salvar configuração:", error);
    return false;
  }
}

function parseTimeInput(timeInput) {
  const cleanInput = timeInput.trim();
  const timeRegex = /^(\d{1,2}):(\d{1,2}):(\d{1,2})$/;

  const match = cleanInput.match(timeRegex);
  if (!match) {
    return {
      valid: false,
      error: "Formato inválido. Use HH:MM:SS (exemplo: 01:30:45)",
    };
  }

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);

  if (hours > 23) {
    return { valid: false, error: "Horas devem ser entre 00 e 23" };
  }
  if (minutes > 59) {
    return { valid: false, error: "Minutos devem ser entre 00 e 59" };
  }
  if (seconds > 59) {
    return { valid: false, error: "Segundos devem ser entre 00 e 59" };
  }

  const totalSeconds = hours * 3600 + minutes * 60 + seconds;

  if (totalSeconds === 0) {
    return { valid: false, error: "O tempo total não pode ser zero" };
  }

  const formattedTime = `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  return {
    valid: true,
    hours,
    minutes,
    seconds,
    totalSeconds,
    formatted: formattedTime,
  };
}

async function toggleDevMode() {
  try {
    const config = await loadConfig();
    config.isDevMode = !config.isDevMode;
    config.lastChanged = new Date().toISOString();

    const saved = await saveConfig(config);
    if (saved) {
      return { success: true, isDevMode: config.isDevMode };
    } else {
      return { success: false, error: "Falha ao salvar configuração" };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function toggleDebugMode() {
  try {
    const config = await loadConfig();
    config.debugEnabled = !config.debugEnabled;
    config.lastDebugChanged = new Date().toISOString();

    const saved = await saveConfig(config);
    if (saved) {
      return { success: true, debugEnabled: config.debugEnabled };
    } else {
      return {
        success: false,
        error: "Falha ao salvar configuração de debug",
      };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function setScoutTime(timeInput) {
  try {
    const parsedTime = parseTimeInput(timeInput);

    if (!parsedTime.valid) {
      return { success: false, error: parsedTime.error };
    }

    const config = await loadConfig();
    config.scoutConfig.timeSeconds = parsedTime.totalSeconds;
    config.scoutConfig.timeFormatted = parsedTime.formatted;
    config.scoutConfig.enabled = true;
    config.scoutConfig.lastChanged = new Date().toISOString();

    const saved = await saveConfig(config);
    if (saved) {
      return {
        success: true,
        timeFormatted: parsedTime.formatted,
        totalSeconds: parsedTime.totalSeconds,
      };
    } else {
      return {
        success: false,
        error: "Falha ao salvar configuração do Scout",
      };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getScoutConfig() {
  try {
    const config = await loadConfig();
    return {
      enabled: config.scoutConfig.enabled || false,
      timeSeconds: config.scoutConfig.timeSeconds || 300,
      timeFormatted: config.scoutConfig.timeFormatted || "00:05:00",
      lastChanged: config.scoutConfig.lastChanged,
    };
  } catch (error) {
    console.error("Erro ao carregar configuração do Scout:", error);
    return DEFAULT_CONFIG.scoutConfig;
  }
}

async function getCurrentMode() {
  try {
    const config = await loadConfig();
    return {
      isDevMode: config.isDevMode,
      debugEnabled: config.debugEnabled || false,
      lastChanged: config.lastChanged,
      lastDebugChanged: config.lastDebugChanged,
      scoutConfig: config.scoutConfig || DEFAULT_CONFIG.scoutConfig,
    };
  } catch (error) {
    console.error("Erro ao carregar configuração:", error);
    return DEFAULT_CONFIG;
  }
}

async function getDetailedStatus() {
  try {
    const config = await loadConfig();

    let configExists = false;
    try {
      await fs.access(CONFIG_FILE);
      configExists = true;
    } catch (_) {}

    return {
      isDevMode: config.isDevMode,
      debugEnabled: config.debugEnabled || false,
      delayDescription: config.isDevMode
        ? "3 segundos (fixo)"
        : "1-3 minutos (aleatório)",
      debugDescription: config.debugEnabled ? "Habilitado" : "Desabilitado",
      scoutEnabled: config.scoutConfig?.enabled || false,
      scoutTime: config.scoutConfig?.timeFormatted || "00:05:00",
      scoutSeconds: config.scoutConfig?.timeSeconds || 300,
      lastChanged: config.lastChanged
        ? new Date(config.lastChanged).toLocaleString("pt-BR")
        : null,
      lastDebugChanged: config.lastDebugChanged
        ? new Date(config.lastDebugChanged).toLocaleString("pt-BR")
        : null,
      lastScoutChanged: config.scoutConfig?.lastChanged
        ? new Date(config.scoutConfig.lastChanged).toLocaleString("pt-BR")
        : null,
      configExists,
    };
  } catch (error) {
    throw new Error(`Erro ao obter status: ${error.message}`);
  }
}

async function loadSystemConfig() {
  try {
    const data = await fs.readFile(SYSTEM_CONFIG_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Erro ao carregar configuração do sistema:", error);
    throw error;
  }
}

async function saveSystemConfig(config) {
  try {
    await fs.writeFile(SYSTEM_CONFIG_FILE, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error("Erro ao salvar configuração do sistema:", error);
    return false;
  }
}

async function getCurrentLocale() {
  try {
    const config = await loadSystemConfig();
    return config.locale;
  } catch (error) {
    console.error("Erro ao obter locale atual:", error);
    return "en-US";
  }
}

function formatLocaleName(localeKey) {
  const [language, country] = localeKey.split("_");

  const countryNames = {
    US: "United States",
    BR: "Brasil",
    PY: "Paraguay",
  };

  const countryName = countryNames[country] || country;
  return `${language} (${countryName})`;
}

function getAvailableLocales() {
  try {
    const locales = Object.entries(Locale);

    return locales.map(([key, code], index) => ({
      index: index + 1,
      code: code,
      name: formatLocaleName(key),
    }));
  } catch (error) {
    console.error("Erro ao obter locales disponíveis:", error);
    return [
      {
        index: 1,
        code: "en-US",
        name: "English (United States)",
      },
    ];
  }
}

async function setLocale(selectedIndex) {
  try {
    const availableLocales = getAvailableLocales();
    const selectedLocale = availableLocales.find(
      (locale) => locale.index === parseInt(selectedIndex)
    );

    if (!selectedLocale) {
      return { success: false, error: "Opção inválida" };
    }

    const config = await loadSystemConfig();
    config.locale = selectedLocale.code;

    const saved = await saveSystemConfig(config);
    if (saved) {
      return {
        success: true,
        locale: {
          code: selectedLocale.code,
          name: selectedLocale.name,
        },
        message: `Idioma alterado para ${selectedLocale.name}`,
      };
    } else {
      return {
        success: false,
        error: "Falha ao salvar configuração do idioma",
      };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  toggleDevMode,
  toggleDebugMode,
  setScoutTime,
  getScoutConfig,
  getCurrentMode,
  getDetailedStatus,
  getCurrentLocale,
  getAvailableLocales,
  setLocale,
};
