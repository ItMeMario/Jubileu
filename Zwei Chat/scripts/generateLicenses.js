// scripts/generateLicenses.js
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// Caracteres permitidos para as chaves (excluindo caracteres ambíguos como 0/O e 1/I para melhor legibilidade)
const CHARSET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/**
 * Gera um bloco aleatório de N caracteres seguros
 */
function getRandomBlock(length = 4) {
  let result = "";
  const randomBytes = crypto.randomBytes(length * 2);
  for (let i = 0; i < length; i++) {
    const randomIndex = randomBytes[i] % CHARSET.length;
    result += CHARSET[randomIndex];
  }
  return result;
}

/**
 * Gera uma chave no formato ZWEI-XXXX-XXXX-XXXX
 */
function generateKey() {
  const b1 = getRandomBlock(4);
  const b2 = getRandomBlock(4);
  const b3 = getRandomBlock(4);
  return `ZWEI-${b1}-${b2}-${b3}`;
}

/**
 * Faz parse dos argumentos de linha de comando
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    count: 1,
    plan: "lifetime",
    days: null,
    saveToDb: true,
    outputFile: path.join(__dirname, "generated-keys.json")
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--count" || arg === "-c") {
      options.count = parseInt(args[++i], 10) || 1;
    } else if (arg === "--plan" || arg === "-p") {
      options.plan = args[++i] || "lifetime";
    } else if (arg === "--days" || arg === "-d") {
      options.days = parseInt(args[++i], 10);
    } else if (arg === "--dry-run") {
      options.saveToDb = false;
    }
  }

  return options;
}

/**
 * Tenta salvar as chaves diretamente no Firestore (se Firebase estiver configurado)
 */
async function saveToFirestore(licenses) {
  try {
    const { loadFirebaseConfig } = require("../config/firebaseConfig");
    const fbConfig = loadFirebaseConfig();

    if (!fbConfig.isConfigured) {
      console.log("ℹ️ Firebase ainda não configurado no projeto local. As chaves foram geradas e salvas em arquivo JSON.");
      return false;
    }

    // Tenta usar Firebase Client SDK local
    const { initializeApp, getApps, getApp } = require("firebase/app");
    const { getFirestore, doc, setDoc } = require("firebase/firestore");

    const app = getApps().length === 0 ? initializeApp(fbConfig) : getApp();
    const db = getFirestore(app);

    console.log("☁️ Conectando ao Cloud Firestore...");

    let successCount = 0;
    for (const lic of licenses) {
      const docRef = doc(db, "licenses", lic.key);
      await setDoc(docRef, lic);
      successCount++;
    }

    console.log(`✅ ${successCount} chave(s) inserida(s) com sucesso na coleção 'licenses' do Firestore!`);
    return true;
  } catch (error) {
    console.warn("⚠️ Não foi possível sincronizar diretamente com o Firestore:", error.message);
    console.log("💡 Dica: Você poderá sincronizar ou cadastrar as chaves no Firestore quando o projeto Firebase for provisionado.");
    return false;
  }
}

/**
 * Execução Principal
 */
async function main() {
  const options = parseArgs();

  console.log("\n============================================");
  console.log("   🔑 GERADOR DE LICENÇAS - ZWEI CHAT");
  console.log("============================================");
  console.log(`📋 Quantidade solicitada: ${options.count}`);
  console.log(`💎 Plano: ${options.plan.toUpperCase()}`);
  if (options.days) {
    console.log(`⏳ Validade: ${options.days} dias`);
  }
  console.log("--------------------------------------------\n");

  const now = new Date();
  const licenses = [];
  const keysList = [];

  for (let i = 0; i < options.count; i++) {
    const key = generateKey();
    let expiresAt = null;

    if (options.days) {
      const expDate = new Date(now.getTime() + options.days * 24 * 60 * 60 * 1000);
      expiresAt = expDate.toISOString();
    }

    const licenseData = {
      key,
      status: "available",
      plan: options.plan,
      createdAt: now.toISOString(),
      expiresAt,
      usedByUid: null,
      usedByEmail: null,
      activatedAt: null
    };

    licenses.push(licenseData);
    keysList.push(key);
    console.log(`  [${i + 1}]  👉  \x1b[32m${key}\x1b[0m`);
  }

  console.log("\n--------------------------------------------");

  // Salva no arquivo local para consulta do administrador
  try {
    let existingData = [];
    if (fs.existsSync(options.outputFile)) {
      try {
        existingData = JSON.parse(fs.readFileSync(options.outputFile, "utf-8"));
      } catch (e) {
        existingData = [];
      }
    }

    const updatedData = [...existingData, ...licenses];
    fs.writeFileSync(options.outputFile, JSON.stringify(updatedData, null, 2), "utf-8");
    console.log(`💾 Chaves salvas no histórico local: ${options.outputFile}`);
  } catch (err) {
    console.error("Erro ao salvar arquivo local:", err.message);
  }

  // Tenta sincronizar com o Firestore se solicitado
  if (options.saveToDb) {
    await saveToFirestore(licenses);
  }

  console.log("\n🎉 Geração concluída com sucesso!\n");
}

main().catch(console.error);
