// app.js
const { initializeAllConfigs } = require("./utils/initialize");
const { client, startScout } = require("./client/client");
const { handleConfigMenu } = require("./views/configViews");
const { handleDroneMenu } = require("./views/droneViews");
const messageHandler = require("./handlers/message");
const { debug } = require("./services/debugService");
const { createInterface } = require("readline");

// 🆕 IMPORTAÇÕES DO SISTEMA DE LEMBRETES
const ReminderScheduler = require("./utils/reminderScheduler")

// Controle do estado da aplicação
let isClientReady = false;
let rl = null;

// Função para criar interface readline
function createReadlineInterface() {
  if (rl) {
    rl.close();
  }
  
  rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '🤖 > '
  });
  
  return rl;
}

// Menu interativo principal
async function showInteractiveMenu() {
  if (!isClientReady) {
    console.log("⏳ Aguardando WhatsApp conectar...");
    return;
  }

  console.log("\n" + "=".repeat(50));
  console.log("🤖 WHATSAPP BOT - MENU PRINCIPAL");
  console.log("=".repeat(50));
  console.log("📋 Comandos disponíveis:");
  console.log("  config  - Acessar configurações");
  console.log("  drone   - Acessar menu de disparos");
  console.log("  status  - Ver status do bot");
  console.log("  stop    - Parar o bot");
  console.log("  help    - Mostrar este menu");
  console.log("  exit    - Sair (mesmo que stop)");
  console.log("=".repeat(50));
  console.log("💡 Digite um comando e pressione Enter");
  
  rl.prompt();
}

// Processador de comandos
async function processCommand(input) {
  const command = input.trim().toLowerCase();
  
  try {
    switch (command) {
      case 'config':
        console.log("🔧 Acessando configurações...\n");
        await handleConfigMenu(rl);
        break;
        
      case 'drone':
        console.log("🚁 Acessando menu de disparos...\n");
        await handleDroneMenu(rl);
        break;
        
      case 'status':
        await showStatus();
        break;
        
      case 'stop':
      case 'exit':
        await stopBot();
        return;
        
      case 'help':
      case '':
        await showInteractiveMenu();
        return;
        
      default:
        console.log(`❌ Comando '${command}' não reconhecido.`);
        console.log("💡 Digite 'help' para ver os comandos disponíveis.");
        break;
    }
  } catch (error) {
    console.error(`❌ Erro ao executar comando '${command}':`, error.message);
    await debug(`Erro no comando ${command}: ${error.message}`);
  }
  
  // Volta ao prompt após executar comando
  setTimeout(() => {
    console.log("\n" + "-".repeat(30));
    rl.prompt();
  }, 1000);
}

// Mostrar status do bot
async function showStatus() {
  console.log("\n📊 STATUS DO BOT");
  console.log("=".repeat(30));
  console.log(`🔗 WhatsApp: ${isClientReady ? '✅ Conectado' : '❌ Desconectado'}`);
  
  try {
    const info = await client.info;
    console.log(`📱 Número: ${info.wid.user}`);
    console.log(`👤 Nome: ${info.pushname || 'N/A'}`);
  } catch (error) {
    console.log("📱 Informações do WhatsApp indisponíveis");
  }
  
  console.log(`⏰ Uptime: ${process.uptime().toFixed(0)}s`);
  console.log(`💾 Memória: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
  console.log("=".repeat(30));
}

// Parar o bot
async function stopBot() {
  console.log("\n🛑 Parando o bot...");
  
  try {
    if (isClientReady) {
      await client.destroy();
      console.log("✅ Cliente WhatsApp desconectado");
    }
    
    if (rl) {
      rl.close();
      console.log("✅ Interface fechada");
    }
    
    console.log("👋 Bot parado com sucesso!");
    process.exit(0);
    
  } catch (error) {
    console.error("❌ Erro ao parar o bot:", error.message);
    process.exit(1);
  }
}

// Configurar eventos do cliente
function setupClientEvents() {
  client.on("qr", (qr) => {
    const qrcode = require("qrcode-terminal");
    console.log("\n📱 Escaneie o QR Code com seu WhatsApp:");
    qrcode.generate(qr, { small: true });
  });

  client.on("ready", async () => {
    isClientReady = true;
    console.log("\n✅ WhatsApp conectado com sucesso!");

    // 🆕 CONFIGURA O SISTEMA DE LEMBRETES
    try {
      await debug("⏰ Configurando sistema de lembretes...");
      reminderService.setWhatsAppClient(client);
      const scheduler = new ReminderScheduler();
      scheduler.start();
      await debug("✅ Sistema de lembretes iniciado!");
    } catch (error) {
      await debug("❌ Erro ao iniciar lembretes:", error);
    }

    // Mostra o menu pela primeira vez
    setTimeout(async () => {
      await showInteractiveMenu();
    }, 1000);
  });

  client.on("authenticated", async () => {
    await debug("✅ Cliente autenticado!");
  });

  client.on("auth_failure", async (msg) => {
    console.log(`❌ Falha na autenticação: ${msg}`);
    await debug(`Falha na autenticação: ${msg}`);
  });

  client.on("disconnected", async (reason) => {
    isClientReady = false;
    console.log(`🔌 WhatsApp desconectado: ${reason}`);
    await debug(`Cliente desconectado: ${reason}`);
  });

  client.on("message", messageHandler);
}

// Função principal
async function startApp() {
  try {
    console.log("🚀 Iniciando WhatsApp Bot...\n");
    
    // 🔧 Inicializa configurações
    await initializeAllConfigs();
    console.log("✅ Configurações inicializadas");

    // 🎯 Configura interface readline
    rl = createReadlineInterface();
    
    // 📱 Configura eventos do cliente
    setupClientEvents();
    
    // 🚁 Inicia scout
    startScout(client);
    
    // 🔗 Inicializa cliente WhatsApp
    console.log("🔗 Conectando ao WhatsApp...");
    client.initialize();
    
    // 📝 Configura handler de comandos
    rl.on('line', async (input) => {
      await processCommand(input);
    });
    
    rl.on('close', async () => {
      await stopBot();
    });
    
    // 🛡️ Handler de sinais do sistema
    process.on('SIGINT', async () => {
      console.log("\n🛑 Interrupção detectada...");
      await stopBot();
    });
    
    process.on('SIGTERM', async () => {
      console.log("\n🛑 Terminação detectada...");
      await stopBot();
    });
    
  } catch (error) {
    console.error("❌ Erro durante inicialização:", error.message);
    await debug("Erro na inicialização:", error);
    process.exit(1);
  }
}

// Inicia a aplicação
startApp();