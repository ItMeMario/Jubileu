// scripts/env-manager.js
// Gerenciador de Ambientes (Dev/Testes vs Produção) para Zwei Chat Premium

const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const envFile = path.join(rootDir, ".env");
const devFile = path.join(rootDir, ".env.development");
const prodFile = path.join(rootDir, ".env.production");

function readEnvParams(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, "utf-8");
  const params = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      params[key] = val;
    }
  }
  return params;
}

function mask(str, visibleChars = 4) {
  if (!str) return "(não definido)";
  if (str.length <= visibleChars * 2) return str;
  return `${str.slice(0, visibleChars)}...${str.slice(-visibleChars)}`;
}

function printStatus() {
  const current = readEnvParams(envFile);
  const dev = readEnvParams(devFile);
  const prod = readEnvParams(prodFile);

  console.log("\n========================================================");
  console.log("   ZWEI CHAT PREMIUM - STATUS DO AMBIENTE ATIVO");
  console.log("========================================================");

  if (!current) {
    console.log("⚠️  Nenhum arquivo .env ativo encontrado!");
    console.log("👉 Execute 'npm run env:dev' ou 'npm run env:prod' para ativar.");
    console.log("========================================================\n");
    return;
  }

  let identified = "CUSTOMIZADO / MANUAL";
  if (dev && current.META_PHONE_NUMBER_ID === dev.META_PHONE_NUMBER_ID) {
    identified = "DESENVOLVIMENTO / TESTES (App Developer)";
  } else if (prod && current.META_PHONE_NUMBER_ID === prod.META_PHONE_NUMBER_ID) {
    identified = "PRODUÇÃO (Conta Oficial Meta)";
  }

  console.log(`📌 Perfil Ativo:       ${identified}`);
  console.log(`🌐 NODE_ENV:           ${current.NODE_ENV || "development"}`);
  console.log(`📱 Phone Number ID:    ${current.META_PHONE_NUMBER_ID || "(vazio)"}`);
  console.log(`🏢 WABA ID:            ${current.META_WABA_ID || "(vazio)"}`);
  console.log(`🆔 Meta App ID:        ${current.META_APP_ID || "(vazio)"}`);
  console.log(`🔑 Access Token:       ${mask(current.META_ACCESS_TOKEN, 6)}`);
  console.log(`🛡️ Verify Token:       ${mask(current.META_VERIFY_TOKEN, 4)}`);
  console.log("========================================================\n");
}

function switchEnv(target) {
  let sourceFile = null;
  let label = "";

  if (target === "dev" || target === "test" || target === "development") {
    sourceFile = devFile;
    label = "DESENVOLVIMENTO / TESTES (.env.development)";
  } else if (target === "prod" || target === "production") {
    sourceFile = prodFile;
    label = "PRODUÇÃO (.env.production)";
  } else {
    console.error(`\n❌ Comando inválido: "${target}"`);
    console.log("Uso:");
    console.log("  node scripts/env-manager.js dev     # Ativa ambiente de testes");
    console.log("  node scripts/env-manager.js prod    # Ativa ambiente de produção");
    console.log("  node scripts/env-manager.js status  # Exibe ambiente atual\n");
    process.exit(1);
  }

  if (!fs.existsSync(sourceFile)) {
    console.error(`\n❌ Arquivo de origem não encontrado: ${sourceFile}`);
    console.error("Crie o arquivo antes de alternar o ambiente.\n");
    process.exit(1);
  }

  const content = fs.readFileSync(sourceFile, "utf-8");
  const banner = `# ===================================================\n# AMBIENTE ATIVO: ${label.toUpperCase()}\n# Alternado via scripts/env-manager.js em ${new Date().toLocaleString("pt-BR")}\n# ===================================================\n\n`;

  fs.writeFileSync(envFile, banner + content, "utf-8");

  console.log(`\n✅ Ambiente alterado com sucesso para: [${label}]!`);
  console.log(`📄 Arquivo ativo: ${envFile}`);
  printStatus();
}

// CLI handler
const action = (process.argv[2] || "status").toLowerCase();

if (action === "status") {
  printStatus();
} else {
  switchEnv(action);
}
