const fs = require("fs").promises;
const path = require("path");

const DATA_DIR = path.join(__dirname, "../data");

async function ensureDataDirectory() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    console.log(`✅ Pasta data criada/verificada: ${DATA_DIR}`);
  } catch (error) {
    console.error("Erro ao criar diretório data:", error);
    throw error;
  }
}

async function ensureCityMessageTxtFolder() {
  const folderPath = path.join(DATA_DIR, "cityMessageTxt");
  try {
    await fs.mkdir(folderPath, { recursive: true });
    console.log(`✅ Pasta cityMessageTxt criada/verificada: ${folderPath}`);
    return folderPath;
  } catch (error) {
    console.error("Erro ao criar pasta cityMessageTxt:", error);
    throw error;
  }
}

// Funções adicionadas para corrigir o erro do messageService
async function readJsonFile(filename, defaultValue = null) {
  await ensureDataDirectory();
  const filePath = path.join(DATA_DIR, filename);

  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      // Arquivo não existe, retorna valor padrão
      return defaultValue;
    }
    console.error(`Erro ao ler ${filename}:`, error);
    throw error;
  }
}

async function saveJsonFile(filename, data) {
  await ensureDataDirectory();
  const filePath = path.join(DATA_DIR, filename);

  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (error) {
    console.error(`Erro ao salvar ${filename}:`, error);
    return false;
  }
}

async function createJsonFileIfNotExists(filename, defaultContent) {
  await ensureDataDirectory();
  const filePath = path.join(DATA_DIR, filename);

  try {
    await fs.access(filePath); // Verifica se já existe
    console.log(`✅ Arquivo ${filename} já existe em ${DATA_DIR}`);
    return filePath;
  } catch (err) {
    if (err.code === "ENOENT") {
      await fs.writeFile(
        filePath,
        JSON.stringify(defaultContent, null, 2),
        "utf8"
      );
      console.log(`✅ Arquivo ${filename} criado em ${DATA_DIR}`);
      return filePath;
    }
    throw err;
  }
}

async function initializeDevModeConfig() {
  const defaultConfig = {
    isDevMode: false,
    debugEnabled: false,
    lastChanged: null,
    lastDebugChanged: null,
    scoutConfig: {
      enabled: false,
      timeSeconds: 300, // 5 minutos padrão
      timeFormatted: "00:05:00",
      lastChanged: null,
    },
  };
  return await createJsonFileIfNotExists("devMode.json", defaultConfig);
}

async function initializeCitiesConfig() {
  const defaultCities = [];
  return await createJsonFileIfNotExists("cities.json", defaultCities);
}

async function initializeGroupsConfig() {
  const defaultGroups = { mode: "SINGLE", groups: [] };
  return await createJsonFileIfNotExists("groups.json", defaultGroups);
}

async function initializeMessagesConfig() {
  const defaultMessages = [];
  return await createJsonFileIfNotExists("messages.json", defaultMessages);
}

// 🆕 NOVA FUNÇÃO: Inicializa arquivo de controle anti-spam
async function initializeAntiSpamConfig() {
  const defaultAntiSpam = {
    userAttempts: {},
    suspendedUsers: {},
    lastCleanup: new Date().toISOString(),
  };
  return await createJsonFileIfNotExists("antiSpam.json", defaultAntiSpam);
}

// FUNÇÃO ATUALIZADA: Nova estrutura de indicadores com horários
async function initializeIndicadoresConfig() {
  const defaultIndicadores = {
    clientesAtendidos: 0,
    clientesConvidados: 0,
    horariosEscolhidos: {
      1: { horario: "10:00h (Manhã)", count: 0 },
      2: { horario: "12:00h (Meio-dia)", count: 0 },
      3: { horario: "14:00h (Depois do almoço)", count: 0 },
      4: { horario: "15:30h (Tarde)", count: 0 },
      5: { horario: "17:30h (Final da tarde)", count: 0 },
      6: { horario: "19:30h (Noite)", count: 0 },
    },
    lastUpdated: new Date().toISOString(),
  };
  return await createJsonFileIfNotExists(
    "indicadoresData.json",
    defaultIndicadores
  );
}

// NOVA FUNÇÃO: Para migrar dados antigos se necessário
async function migrateIndicadoresIfNeeded() {
  const filePath = path.join(DATA_DIR, "indicadoresData.json");

  try {
    const data = await readJsonFile("indicadoresData.json");

    if (data && !data.horariosEscolhidos) {
      console.log("🔄 Migrando estrutura antiga de indicadores...");

      data.horariosEscolhidos = {
        1: { horario: "10:00h (Manhã)", count: 0 },
        2: { horario: "12:00h (Meio-dia)", count: 0 },
        3: { horario: "14:00h (Depois do almoço)", count: 0 },
        4: { horario: "15:30h (Tarde)", count: 0 },
        5: { horario: "17:30h (Final da tarde)", count: 0 },
        6: { horario: "19:30h (Noite)", count: 0 },
      };

      // Remove campos antigos se existirem
      if (data.atendidos !== undefined) {
        data.clientesAtendidos = data.atendidos || 0;
        delete data.atendidos;
      }
      if (data.interessados !== undefined) {
        delete data.interessados;
      }
      if (data.conversoes !== undefined) {
        delete data.conversoes;
      }
      if (data.lastReset !== undefined) {
        delete data.lastReset;
      }

      // Garante que existe clientesConvidados
      if (data.clientesConvidados === undefined) {
        data.clientesConvidados = 0;
      }

      data.lastUpdated = new Date().toISOString();

      await saveJsonFile("indicadoresData.json", data);
      console.log("✅ Migração de indicadores concluída com sucesso!");
    }
  } catch (error) {
    console.error("Erro durante migração de indicadores:", error);
  }
}

// NOVA FUNÇÃO: Para migrar configuração do devMode e adicionar Scout
async function migrateDevModeIfNeeded() {
  try {
    const data = await readJsonFile("devMode.json");

    if (data && !data.scoutConfig) {
      console.log("🔄 Migrando configuração de devMode para incluir Scout...");

      data.scoutConfig = {
        enabled: false,
        timeSeconds: 300, // 5 minutos padrão
        timeFormatted: "00:05:00",
        lastChanged: null,
      };

      // Garante que debugEnabled existe
      if (data.debugEnabled === undefined) {
        data.debugEnabled = false;
      }

      await saveJsonFile("devMode.json", data);
      console.log("✅ Migração de devMode concluída com sucesso!");
    }
  } catch (error) {
    console.error("Erro durante migração de devMode:", error);
  }
}

async function initializeAllConfigs() {
  console.log("🚀 Inicializando arquivos e pastas do sistema...\n");

  const results = await Promise.allSettled([
    initializeDevModeConfig(),
    initializeCitiesConfig(),
    initializeGroupsConfig(),
    initializeMessagesConfig(),
    initializeIndicadoresConfig(),
    initializeAntiSpamConfig(), // 🆕 Adicionado
    ensureCityMessageTxtFolder(),
  ]);

  // Executa migrações após inicialização
  await migrateIndicadoresIfNeeded();
  await migrateDevModeIfNeeded();

  const successCount = results.filter((r) => r.status === "fulfilled").length;
  const errorCount = results.filter((r) => r.status === "rejected").length;

  console.log(
    `✅ Inicialização concluída: ${successCount} sucesso(s), ${errorCount} erro(s)\n`
  );

  if (errorCount > 0) {
    console.log("❌ Detalhes dos erros:");
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        const functionNames = [
          "initializeDevModeConfig",
          "initializeCitiesConfig",
          "initializeGroupsConfig",
          "initializeMessagesConfig",
          "initializeIndicadoresConfig",
          "initializeAntiSpamConfig", // 🆕 Adicionado
          "ensureCityMessageTxtFolder",
        ];
        console.error(`   ${functionNames[i]}: ${r.reason.message}`);
      }
    });
    console.log("");
  }

  return { success: successCount, errors: errorCount };
}

module.exports = {
  ensureDataDirectory,
  createJsonFileIfNotExists,
  initializeDevModeConfig,
  initializeCitiesConfig,
  initializeGroupsConfig,
  initializeMessagesConfig,
  initializeIndicadoresConfig,
  initializeAntiSpamConfig, // 🆕 Exportado
  initializeAllConfigs,
  ensureCityMessageTxtFolder,
  migrateIndicadoresIfNeeded,
  migrateDevModeIfNeeded,
  DATA_DIR,
  readJsonFile,
  saveJsonFile,
};
