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
 * Inicializa e obtém instância do Firestore via Admin SDK
 */
function getAdminFirestoreInstance() {
  const serviceAccountPaths = [
    path.join(__dirname, "serviceAccountKey.json"),
    path.join(__dirname, "../serviceAccountKey.json"),
    path.join(__dirname, "../data/serviceAccountKey.json")
  ];

  const serviceAccountPath = serviceAccountPaths.find(p => fs.existsSync(p));

  if (!serviceAccountPath) {
    console.error("\n❌ Arquivo 'serviceAccountKey.json' não foi encontrado.");
    console.log("💡 Para executar comandos administrativos no Firestore:");
    console.log("   1. Acesse o Firebase Console -> Project Settings -> Service accounts");
    console.log("   2. Clique em 'Generate new private key'");
    console.log("   3. Salve o arquivo como 'serviceAccountKey.json' na pasta 'Zwei Chat'.\n");
    return null;
  }

  try {
    const { initializeApp: initAdminApp, cert, getApps: getAdminApps } = require("firebase-admin/app");
    const { getFirestore: getAdminFirestore } = require("firebase-admin/firestore");

    if (!getAdminApps().length) {
      const serviceAccount = require(serviceAccountPath);
      initAdminApp({
        credential: cert(serviceAccount)
      });
    }

    return getAdminFirestore();
  } catch (err) {
    console.error("❌ Erro ao inicializar Firebase Admin SDK:", err.message);
    return null;
  }
}

/**
 * Faz parse dos argumentos de linha de comando
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    action: "generate", // generate | renew | check | revoke
    key: null,
    count: 1,
    plan: "monthly",
    days: 30,
    saveToDb: true,
    outputFile: path.join(__dirname, "generated-keys.json")
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--renew" || arg === "-r") {
      options.action = "renew";
      options.key = (args[++i] || "").trim().toUpperCase();
    } else if (arg === "--check" || arg === "-k") {
      options.action = "check";
      options.key = (args[++i] || "").trim().toUpperCase();
    } else if (arg === "--revoke") {
      options.action = "revoke";
      options.key = (args[++i] || "").trim().toUpperCase();
    } else if (arg === "--count" || arg === "-c") {
      options.count = parseInt(args[++i], 10) || 1;
    } else if (arg === "--plan" || arg === "-p") {
      options.plan = args[++i] || "monthly";
    } else if (arg === "--days" || arg === "-d") {
      options.days = parseInt(args[++i], 10);
    } else if (arg === "--dry-run") {
      options.saveToDb = false;
    }
  }

  return options;
}

/**
 * Renova a assinatura de uma licença (+N dias)
 */
async function handleRenewLicense(key, days = 30) {
  if (!key) {
    console.error("❌ Por favor, informe a chave a ser renovada: --renew ZWEI-XXXX-XXXX-XXXX");
    return;
  }

  console.log("\n============================================");
  console.log("   🔄 RENOVAÇÃO DE ASSINATURA - ZWEI CHAT");
  console.log("============================================");
  console.log(`🔑 Chave informada: \x1b[36m${key}\x1b[0m`);
  console.log(`⏳ Período de renovação: ${days} dias`);
  console.log("--------------------------------------------\n");

  const db = getAdminFirestoreInstance();
  if (!db) return;

  try {
    const licenseRef = db.collection("licenses").doc(key);
    const licenseSnap = await licenseRef.get();

    if (!licenseSnap.exists) {
      console.error(`❌ Chave '${key}' não foi encontrada no Firestore.`);
      return;
    }

    const licenseData = licenseSnap.data();
    const now = new Date();
    let baseDate = now;

    // Se a licença ainda estiver ativa e vencer no futuro, estende a partir da data de vencimento atual
    if (licenseData.expiresAt) {
      const currentExp = new Date(licenseData.expiresAt);
      if (currentExp > now) {
        baseDate = currentExp;
        console.log(`ℹ️ Assinatura ainda em vigor. Estendendo a partir do vencimento atual (${currentExp.toLocaleDateString("pt-BR")}).`);
      } else {
        console.log(`ℹ️ Assinatura já estava vencida em ${currentExp.toLocaleDateString("pt-BR")}. Renovando a partir de hoje.`);
      }
    }

    const newExpiresAt = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
    const nowIso = now.toISOString();

    // 1. Atualiza documento da licença
    await licenseRef.update({
      status: "active",
      expiresAt: newExpiresAt,
      lastRenewedAt: nowIso
    });

    // 2. Atualiza documento do usuário vinculado
    if (licenseData.usedByUid) {
      const userRef = db.collection("users").doc(licenseData.usedByUid);
      await userRef.update({
        isActivated: true,
        licenseExpiresAt: newExpiresAt,
        updatedAt: nowIso
      });
      console.log(`👤 Usuário vinculado atualizado: \x1b[32m${licenseData.usedByEmail || licenseData.usedByUid}\x1b[0m`);
    }

    const formattedNewExp = new Date(newExpiresAt).toLocaleDateString("pt-BR");
    const remainingDays = Math.ceil((new Date(newExpiresAt) - now) / (1000 * 60 * 60 * 24));

    console.log("\n--------------------------------------------");
    console.log(`✅ \x1b[32mASSINATURA RENOVADA COM SUCESSO!\x1b[0m`);
    console.log(`📅 Novo Vencimento: \x1b[33m${formattedNewExp}\x1b[0m (${remainingDays} dias restantes)`);
    console.log(`🟢 Status: ATIVO`);
    console.log("--------------------------------------------\n");

  } catch (error) {
    console.error("❌ Erro ao renovar licença no Firestore:", error.message);
  }
}

/**
 * Consulta e exibe relatório de uma chave
 */
async function handleCheckLicense(key) {
  if (!key) {
    console.error("❌ Por favor, informe a chave a ser consultada: --check ZWEI-XXXX-XXXX-XXXX");
    return;
  }

  console.log("\n============================================");
  console.log("   🔍 CONSULTA DE LICENÇA - ZWEI CHAT");
  console.log("============================================");
  console.log(`🔑 Chave: \x1b[36m${key}\x1b[0m`);
  console.log("--------------------------------------------\n");

  const db = getAdminFirestoreInstance();
  if (!db) return;

  try {
    const licenseRef = db.collection("licenses").doc(key);
    const licenseSnap = await licenseRef.get();

    if (!licenseSnap.exists) {
      console.error(`❌ Chave '${key}' não foi encontrada no Firestore.`);
      return;
    }

    const data = licenseSnap.data();
    const now = new Date();

    let statusDisplay = data.status.toUpperCase();
    if (data.expiresAt && new Date(data.expiresAt) <= now) {
      statusDisplay = "\x1b[31mEXPIRADA (VENCIDA)\x1b[0m";
    } else if (data.status === "active") {
      statusDisplay = "\x1b[32mATIVA\x1b[0m";
    } else if (data.status === "available") {
      statusDisplay = "\x1b[34mDISPONÍVEL (NÃO ATIVADA)\x1b[0m";
    } else if (data.status === "revoked") {
      statusDisplay = "\x1b[31mREVOGADA\x1b[0m";
    }

    console.log(`📋 Status:          ${statusDisplay}`);
    console.log(`💎 Plano:           ${(data.plan || "mensal").toUpperCase()}`);
    console.log(`👤 Usuário:         ${data.usedByEmail || "(Nenhum usuário vinculado)"}`);
    console.log(`🆔 UID Usuário:     ${data.usedByUid || "N/A"}`);
    console.log(`📅 Criada em:       ${data.createdAt ? new Date(data.createdAt).toLocaleDateString("pt-BR") : "N/A"}`);
    console.log(`🚀 Ativada em:      ${data.activatedAt ? new Date(data.activatedAt).toLocaleDateString("pt-BR") : "N/A"}`);

    if (data.expiresAt) {
      const expDate = new Date(data.expiresAt);
      const isExpired = expDate <= now;
      const daysDiff = Math.abs(Math.ceil((expDate - now) / (1000 * 60 * 60 * 24)));

      console.log(`⏳ Vencimento:      ${expDate.toLocaleDateString("pt-BR")} (${isExpired ? `Venceu há ${daysDiff} dia(s)` : `Faltam ${daysDiff} dia(s)`})`);
    } else {
      console.log(`⏳ Vencimento:      Sem expiração (Vitalício)`);
    }

    if (data.lastRenewedAt) {
      console.log(`🔄 Última renovação:${new Date(data.lastRenewedAt).toLocaleString("pt-BR")}`);
    }

    console.log("\n--------------------------------------------\n");

  } catch (error) {
    console.error("❌ Erro ao consultar chave no Firestore:", error.message);
  }
}

/**
 * Revoga uma chave de licença
 */
async function handleRevokeLicense(key) {
  if (!key) {
    console.error("❌ Por favor, informe a chave a ser revogada: --revoke ZWEI-XXXX-XXXX-XXXX");
    return;
  }

  const db = getAdminFirestoreInstance();
  if (!db) return;

  try {
    const licenseRef = db.collection("licenses").doc(key);
    const licenseSnap = await licenseRef.get();

    if (!licenseSnap.exists) {
      console.error(`❌ Chave '${key}' não encontrada.`);
      return;
    }

    const data = licenseSnap.data();
    await licenseRef.update({ status: "revoked" });

    if (data.usedByUid) {
      await db.collection("users").doc(data.usedByUid).update({ isActivated: false });
    }

    console.log(`🚫 Chave \x1b[31m${key}\x1b[0m revogada com sucesso.`);
  } catch (error) {
    console.error("❌ Erro ao revogar chave:", error.message);
  }
}

/**
 * Geração de novas licenças
 */
async function handleGenerateLicenses(options) {
  console.log("\n============================================");
  console.log("   🔑 GERADOR DE LICENÇAS - ZWEI CHAT");
  console.log("============================================");
  console.log(`📋 Quantidade solicitada: ${options.count}`);
  console.log(`💎 Plano: ${options.plan.toUpperCase()}`);
  if (options.plan === "monthly" || options.days) {
    console.log(`⏳ Validade inicial: ${options.days || 30} dias`);
  }
  console.log("--------------------------------------------\n");

  const now = new Date();
  const licenses = [];

  for (let i = 0; i < options.count; i++) {
    const key = generateKey();
    let expiresAt = null;

    // Se dias forem explicitamente informados no momento da criação da chave
    if (options.days && options.plan !== "lifetime") {
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
      activatedAt: null,
      lastRenewedAt: null
    };

    licenses.push(licenseData);
    console.log(`  [${i + 1}]  👉  \x1b[32m${key}\x1b[0m`);
  }

  console.log("\n--------------------------------------------");

  // Salva no histórico local JSON
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

  // Grava no Cloud Firestore
  if (options.saveToDb) {
    const db = getAdminFirestoreInstance();
    if (db) {
      const batch = db.batch();
      for (const lic of licenses) {
        const docRef = db.collection("licenses").doc(lic.key);
        batch.set(docRef, lic);
      }
      await batch.commit();
      console.log(`☁️ \x1b[32m${licenses.length} chave(s) sincronizada(s) no Cloud Firestore com sucesso!\x1b[0m`);
    }
  }

  console.log("\n🎉 Operação concluída com sucesso!\n");
}

/**
 * Ponto de entrada
 */
async function main() {
  const options = parseArgs();

  switch (options.action) {
    case "renew":
      await handleRenewLicense(options.key, options.days || 30);
      break;
    case "check":
      await handleCheckLicense(options.key);
      break;
    case "revoke":
      await handleRevokeLicense(options.key);
      break;
    case "generate":
    default:
      await handleGenerateLicenses(options);
      break;
  }
}

main().catch(console.error);

