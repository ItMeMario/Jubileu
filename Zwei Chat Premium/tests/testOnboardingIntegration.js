// tests/testOnboardingIntegration.js
// Teste de Integração de Ponta a Ponta para Resolução de WABA e Telemetria

const assert = require("assert");
const fs = require("fs");
const { MetaOnboardingService } = require("../services/metaOnboardingService");
const { storagePaths } = require("../services/storagePaths");

async function runOnboardingTests() {
  console.log("🚀 Iniciando Testes de Integração de Onboarding & Diagnóstico...\n");

  const service = new MetaOnboardingService();

  // -------------------------------------------------------------------------
  // Teste 1: Resolução imediata com preResolvedWabaId e preResolvedPhone
  // -------------------------------------------------------------------------
  console.log("🧪 Teste 1: Resolução imediata com WABA pré-resolvido do evento Embedded Signup...");
  const preResolvedWaba = "waba_signup_998877";
  const preResolvedPhone = {
    id: "phone_112233",
    display_phone_number: "+55 11 98888-7777",
    verified_name: "Loja Teste Oficial",
  };

  const result1 = await service.fetchClientWabaAndPhone(
    "fake_access_token",
    preResolvedWaba,
    preResolvedPhone
  );

  assert.strictEqual(result1.wabaId, preResolvedWaba, "WABA ID deve corresponder ao pré-resolvido");
  assert.strictEqual(result1.phone.id, preResolvedPhone.id, "Phone ID deve corresponder ao pré-resolvido");
  console.log("✅ Teste 1 passou: Resolução instantânea (0ms) via credenciais pré-resolvidas.");

  // -------------------------------------------------------------------------
  // Teste 2: Mascaramento Seguro de Segredos e Tokens
  // -------------------------------------------------------------------------
  console.log("\n🧪 Teste 2: Mascaramento de tokens e segredos para telemetria...");
  const rawToken = "EAANZCRGPwhKQBSmBMyx5ADdmYYGADIsgvtiTgSru24doZBavBfFdrdBZAw";
  const masked = service.maskSecret(rawToken);
  assert(masked.startsWith("EAANZC"), "Deve exibir os primeiros 6 caracteres");
  assert(masked.endsWith("FdrdBZAw".slice(-4)), "Deve exibir os últimos 4 caracteres");
  assert(masked.includes("..."), "Deve conter elipses de ocultação");
  assert(!masked.includes("Myx5ADdmYYGADIs"), "Corpo central do token nunca deve estar exposto");
  console.log(`✅ Teste 2 passou: Token protegido com sucesso: ${masked}`);

  // -------------------------------------------------------------------------
  // Teste 3: Gravação e Leitura Persistente de Diagnóstico
  // -------------------------------------------------------------------------
  console.log("\n🧪 Teste 3: Persistência do Relatório de Diagnóstico em disco...");
  const testReport = {
    timestamp: new Date().toISOString(),
    appId: "1824502742321385",
    configId: "2064216567567338",
    stages: [
      { stage: "exchangeCodeForToken", durationMs: 45, status: "OK" },
      { stage: "fetchClientWabaAndPhone", durationMs: 120, status: "OK" },
    ],
    discovered: {
      wabaId: "1149474520810369",
      phoneNumberId: "1386136094578447",
      displayPhoneNumber: "+55 11 99999-0000",
    },
    success: true,
    error: null,
  };

  service.saveDiagnosticsReport(testReport);
  const loadedReport = service.getLastDiagnosticsReport();

  assert(loadedReport, "Relatório deve existir e ser lido do disco");
  assert.strictEqual(loadedReport.appId, testReport.appId);
  assert.strictEqual(loadedReport.discovered.wabaId, testReport.discovered.wabaId);
  assert.strictEqual(loadedReport.success, true);
  assert.strictEqual(loadedReport.stages.length, 2);

  const diagPath = storagePaths.getDiagnosticsPath("last-onboarding-attempt.json");
  assert(fs.existsSync(diagPath), "Arquivo físico de diagnóstico deve existir no caminho seguro");
  console.log(`✅ Teste 3 passou: Relatório salvo e recuperado de ${diagPath}`);

  // -------------------------------------------------------------------------
  // Teste 4: Tratamento de Falha com Relatório de Diagnóstico Automático
  // -------------------------------------------------------------------------
  console.log("\n🧪 Teste 4: Comportamento de completeOnboarding em caso de falha...");
  // Passando código inválido com endpoint simulado
  const failResult = await service.completeOnboarding(
    "invalid_auth_code_999",
    "https://test.redirect/uri",
    null,
    null
  );

  assert.strictEqual(failResult.success, false, "Deve reportar failure");
  assert(failResult.error, "Deve conter mensagem de erro descritiva");

  const lastDiagAfterFail = service.getLastDiagnosticsReport();
  assert(lastDiagAfterFail, "Diagnóstico da falha deve ter sido persistido");
  assert.strictEqual(lastDiagAfterFail.success, false, "Diagnóstico deve registrar success=false");
  assert(lastDiagAfterFail.error, "Diagnóstico deve conter mensagem de erro registrada");
  console.log(`✅ Teste 4 passou: Falha capturada e diagnosticada: "${lastDiagAfterFail.error}"`);

  console.log("\n🎉 TODOS OS TESTES DE INTEGRAÇÃO PASSARAM COM 100% DE SUCESSO!");
}

runOnboardingTests().catch((err) => {
  console.error("❌ Erro nos testes de integração:", err);
  process.exit(1);
});

