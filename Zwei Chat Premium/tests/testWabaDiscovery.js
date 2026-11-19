// tests/testWabaDiscovery.js
// Teste automatizado para validação da busca em profundidade multi-nível do WABA ID

const assert = require("assert");
const { MetaOnboardingService } = require("../services/metaOnboardingService");

async function runTests() {
  console.log("🧪 Iniciando testes de Resolução Multi-Nível de WABA...");
  const service = new MetaOnboardingService();

  // Teste 1: Retorno imediato quando pré-resolvido
  console.log("▶ Teste 1: Credenciais pré-resolvidas");
  const result1 = await service.fetchClientWabaAndPhone(
    "fake_token",
    "pre_resolved_waba_123",
    { id: "phone_456", display_phone_number: "+5511999999999" }
  );
  assert.strictEqual(result1.wabaId, "pre_resolved_waba_123");
  assert.strictEqual(result1.phone.id, "phone_456");
  console.log("✅ Teste 1 passou com sucesso!");

  console.log("\n🎉 Todos os testes unitários de resolução foram validados!");
}

runTests().catch((err) => {
  console.error("❌ Falha nos testes:", err);
  process.exit(1);
});

