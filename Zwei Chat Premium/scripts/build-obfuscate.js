// scripts/build-obfuscate.js
// Motor de Compilação, Ofuscação de AST e Isolamento de Staging para Produção
// Zwei Chat Premium — Proteção contra Engenharia Reversa (Vulnerabilidade #6)

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const JavaScriptObfuscator = require("javascript-obfuscator");

const ROOT_DIR = path.resolve(__dirname, "..");
const STAGING_DIR = path.join(ROOT_DIR, "build-protected");

// Configurações de Ofuscação de Nível Comercial (Alta Resiliência e Zero Impacto Funcional)

// 1. Perfil Node.js (Processo Principal, Serviços, Motor de Fluxos, Cloud Gateway)
const NODE_CONFIG = {
  target: "node",
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.25,
  debugProtection: false,
  disableConsoleOutput: false, // Mantém compatibilidade com electron-log e logs críticos
  identifierNamesGenerator: "hexadecimal",
  numbersToExpressions: true,
  selfDefending: true, // Detecta se o código foi formatado/alterado e neutraliza
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 8,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayEncoding: ["rc4", "base64"],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersType: "variable",
  stringArrayThreshold: 0.8,
  transformObjectKeys: false, // Preserva métodos de bibliotecas externas e contratos nativos
  unicodeEscapeSequence: false,
};

// 2. Perfil Preload (Context Bridge entre Main e Renderer)
const PRELOAD_CONFIG = {
  ...NODE_CONFIG,
  reservedNames: ["^zweiPremiumApi$"],
};

// 3. Perfil Browser / ES Modules (Interface Gráfica e Módulos do Renderer)
const BROWSER_MODULE_CONFIG = {
  target: "browser",
  sourceType: "module",
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.6,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.2,
  debugProtection: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: "hexadecimal",
  numbersToExpressions: true,
  selfDefending: false, // Evita conflitos com strict mode no V8 do Chromium
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 10,
  stringArray: true,
  stringArrayEncoding: ["base64"],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayThreshold: 0.75,
  transformObjectKeys: false,
  unicodeEscapeSequence: false,
  reservedNames: ["^zweiPremiumApi$"],
};

/**
 * Coleta recursivamente arquivos dentro de um diretório que correspondam a um filtro
 */
function getFilesRecursively(dirPath, filterFn) {
  if (!fs.existsSync(dirPath)) return [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  let results = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getFilesRecursively(fullPath, filterFn));
    } else if (!filterFn || filterFn(fullPath)) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Garante que o diretório de destino exista
 */
function ensureDirExists(filePath) {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
}

/**
 * Ofusca um arquivo JavaScript e grava no destino de staging
 */
function processAndObfuscateJs(srcRelPath, config) {
  const srcFullPath = path.join(ROOT_DIR, srcRelPath);
  const destFullPath = path.join(STAGING_DIR, srcRelPath);

  if (!fs.existsSync(srcFullPath)) {
    console.warn(`⚠️ Arquivo de origem não encontrado: ${srcRelPath}`);
    return null;
  }

  const rawCode = fs.readFileSync(srcFullPath, "utf8");
  const obfuscationResult = JavaScriptObfuscator.obfuscate(rawCode, config);
  const obfuscatedCode = obfuscationResult.getObfuscatedCode();

  ensureDirExists(destFullPath);
  fs.writeFileSync(destFullPath, obfuscatedCode, "utf8");

  const originalSize = Buffer.byteLength(rawCode, "utf8");
  const obfuscatedSize = Buffer.byteLength(obfuscatedCode, "utf8");
  const hash = crypto.createHash("sha256").update(obfuscatedCode).digest("hex");

  return {
    file: srcRelPath,
    originalSize,
    obfuscatedSize,
    hash,
  };
}

/**
 * Copia arquivos estáticos (HTML, CSS) sanitizando comentários sensíveis
 */
function processStaticFile(srcRelPath) {
  const srcFullPath = path.join(ROOT_DIR, srcRelPath);
  const destFullPath = path.join(STAGING_DIR, srcRelPath);

  ensureDirExists(destFullPath);

  if (srcRelPath.endsWith(".html")) {
    let html = fs.readFileSync(srcFullPath, "utf8");
    // Remove comentários HTML <!-- ... --> que possam conter notas de desenvolvimento
    html = html.replace(/<!--[\s\S]*?-->/g, "");
    fs.writeFileSync(destFullPath, html, "utf8");
  } else {
    fs.copyFileSync(srcFullPath, destFullPath);
  }
}

/**
 * Executa o fluxo completo de compilação protegida
 */
function runBuild() {
  const startTime = Date.now();
  console.log("==========================================================");
  console.log("🛡️  INICIANDO MOTOR DE OFUSCAÇÃO & BUILD COMERCIAL");
  console.log("    Projeto: Zwei Chat Premium");
  console.log(`    Diretório Raiz: ${ROOT_DIR}`);
  console.log(`    Diretório de Staging: ${STAGING_DIR}`);
  console.log("==========================================================\n");

  // 1. Limpeza do diretório de staging anterior
  if (fs.existsSync(STAGING_DIR)) {
    console.log("🧹 Limpando diretório de staging anterior...");
    fs.rmSync(STAGING_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(STAGING_DIR, { recursive: true });

  const manifest = {
    buildDate: new Date().toISOString(),
    protectedFiles: [],
  };

  // 2. Processar Módulos Backend / Node.js
  console.log("🔒 [1/4] Ofuscando Processo Principal e Backend Node.js...");
  const nodeFiles = [
    "main.js",
    "config/metaConfig.js",
    "client/flowExecutor.js",
    "client/metaApiClient.js",
    "cloud-gateway/server.js",
  ];

  // Coleta todos os serviços da pasta services/
  const serviceFiles = getFilesRecursively(path.join(ROOT_DIR, "services"), (f) =>
    f.endsWith(".js")
  ).map((f) => path.relative(ROOT_DIR, f).replace(/\\/g, "/"));

  const allNodeFiles = [...nodeFiles, ...serviceFiles];

  for (const file of allNodeFiles) {
    const stats = processAndObfuscateJs(file, NODE_CONFIG);
    if (stats) {
      manifest.protectedFiles.push(stats);
      console.log(`  ✓ [NODE] ${file} (${stats.originalSize}B -> ${stats.obfuscatedSize}B)`);
    }
  }

  // 3. Processar Preload Script
  console.log("\n🔒 [2/4] Ofuscando Script Preload do Electron...");
  const preloadFile = "renderer/preload/preload.js";
  const preloadStats = processAndObfuscateJs(preloadFile, PRELOAD_CONFIG);
  if (preloadStats) {
    manifest.protectedFiles.push(preloadStats);
    console.log(
      `  ✓ [PRELOAD] ${preloadFile} (${preloadStats.originalSize}B -> ${preloadStats.obfuscatedSize}B)`
    );
  }

  // 4. Processar Módulos de Interface (Renderer / ES Modules)
  console.log("\n🔒 [3/4] Ofuscando Módulos do Renderer (ES Modules)...");
  const rendererJsFiles = getFilesRecursively(
    path.join(ROOT_DIR, "renderer/guiScripts"),
    (f) => f.endsWith(".js")
  ).map((f) => path.relative(ROOT_DIR, f).replace(/\\/g, "/"));

  for (const file of rendererJsFiles) {
    const stats = processAndObfuscateJs(file, BROWSER_MODULE_CONFIG);
    if (stats) {
      manifest.protectedFiles.push(stats);
      console.log(`  ✓ [UI] ${file} (${stats.originalSize}B -> ${stats.obfuscatedSize}B)`);
    }
  }

  // 5. Sanitizar e Copiar Recursos Estáticos (HTML, CSS, Assets)
  console.log("\n📦 [4/4] Copiando e Sanitizando Ativos Estáticos (HTML/CSS)...");
  const staticFiles = [
    ...getFilesRecursively(path.join(ROOT_DIR, "renderer/html")),
    ...getFilesRecursively(path.join(ROOT_DIR, "renderer/css")),
  ].map((f) => path.relative(ROOT_DIR, f).replace(/\\/g, "/"));

  for (const file of staticFiles) {
    processStaticFile(file);
    console.log(`  ✓ [STATIC] ${file}`);
  }

  // Copia ícone se existir
  const iconPath = path.join(ROOT_DIR, "build/icon.ico");
  if (fs.existsSync(iconPath)) {
    const destIcon = path.join(STAGING_DIR, "build/icon.ico");
    ensureDirExists(destIcon);
    fs.copyFileSync(iconPath, destIcon);
    console.log(`  ✓ [ICON] build/icon.ico`);
  }

  // 6. Gerar package.json limpo para o Staging de Produção
  const rootPkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "package.json"), "utf8"));
  const stagingPkg = {
    name: rootPkg.name,
    version: rootPkg.version,
    description: rootPkg.description,
    main: rootPkg.main,
    dependencies: rootPkg.dependencies || {},
  };
  fs.writeFileSync(
    path.join(STAGING_DIR, "package.json"),
    JSON.stringify(stagingPkg, null, 2),
    "utf8"
  );
  console.log("  ✓ [PKG] package.json de produção (devDependencies removidos)");

  // 7. Gravar Manifesto de Segurança
  fs.writeFileSync(
    path.join(STAGING_DIR, "build-manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8"
  );

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log("\n==========================================================");
  console.log(`✅ OFUSCAÇÃO CONCLUÍDA COM SUCESSO EM ${durationSec}s!`);
  console.log(`   Arquivos Protegidos: ${manifest.protectedFiles.length}`);
  console.log(`   Saída Pronta em: ${STAGING_DIR}`);
  console.log("==========================================================\n");

  return manifest;
}

if (require.main === module) {
  try {
    runBuild();
  } catch (err) {
    console.error("❌ Falha crítica no pipeline de ofuscação:", err);
    process.exit(1);
  }
}

module.exports = { runBuild, STAGING_DIR };
