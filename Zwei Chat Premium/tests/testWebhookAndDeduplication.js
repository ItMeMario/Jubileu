// tests/testWebhookAndDeduplication.js
// Teste automatizado para Deduplicação de Mensagens e Validação de Registro de Webhook

const assert = require("assert");
const { botIntegrationService } = require("../services/botIntegrationService");
const { syncService } = require("../services/syncService");
const { cloudGatewayService } = require("../cloud-gateway/server");

async function runTests() {
  console.log("🚀 Iniciando testes de Deduplicação e Gateway...");

  botIntegrationService.initialize();

  // Teste 1: Deduplicação de mensagens idênticas (mesmo messageId)
  console.log("\n🧪 Teste 1: Deduplicação de Mensagens Inbound com mesmo ID...");
  const msgId = `dedup_test_${Date.now()}`;
  let processCount = 0;

  // Mock temporário no flowExecutor para contar invocações
  const { flowExecutor } = require("../client/flowExecutor");
  const originalHandler = flowExecutor.handleIncomingMessage;
  flowExecutor.handleIncomingMessage = async (msg) => {
    processCount++;
    return { handled: true, actionTaken: "test_reply" };
  };

  try {
    const msg = {
      id: msgId,
      from: "5511999990000",
      senderName: "Test Dedup",
      body: "Olá teste dedup",
      timestamp: Date.now(),
      type: "text"
    };

    // Primeiro disparo
    syncService.emit("message:inbound", msg);
    await new Promise((r) => setTimeout(r, 80));

    // Segundo disparo (mesmo ID)
    syncService.emit("message:inbound", msg);
    await new Promise((r) => setTimeout(r, 80));

    // Terceiro disparo (mesmo ID)
    syncService.emit("message:inbound", msg);
    await new Promise((r) => setTimeout(r, 80));

    assert.strictEqual(
      processCount,
      1,
      `A mensagem deveria ter sido processada exatamente 1 vez, mas foi processada ${processCount} vezes`
    );
    console.log("✅ Teste 1 passou: Mensagens duplicadas com mesmo ID foram filtradas com sucesso.");
  } finally {
    flowExecutor.handleIncomingMessage = originalHandler;
  }

  // Teste 2: Nova mensagem com ID diferente deve ser processada normalmente
  console.log("\n🧪 Teste 2: Mensagem com novo ID é processada normalmente...");
  let processCount2 = 0;
  flowExecutor.handleIncomingMessage = async () => {
    processCount2++;
    return { handled: true };
  };

  try {
    const msgNew = {
      id: `dedup_new_${Date.now()}`,
      from: "5511999990000",
      senderName: "Test Dedup 2",
      body: "Nova mensagem",
      timestamp: Date.now(),
      type: "text"
    };

    syncService.emit("message:inbound", msgNew);
    await new Promise((r) => setTimeout(r, 80));

    assert.strictEqual(processCount2, 1, "Nova mensagem deve ser processada");
    console.log("✅ Teste 2 passou: Mensagens com novos IDs são processadas sem bloqueio.");
  } finally {
    flowExecutor.handleIncomingMessage = originalHandler;
  }

  // Teste 3: cloudGatewayService possui método verifyMetaWebhookRegistration
  console.log("\n🧪 Teste 3: Interface de Auditoria de Webhook no Gateway...");
  assert(
    typeof cloudGatewayService.verifyMetaWebhookRegistration === "function",
    "cloudGatewayService deve expor verifyMetaWebhookRegistration"
  );
  assert(
    typeof cloudGatewayService.registerWebhookOnMeta === "function",
    "cloudGatewayService deve expor registerWebhookOnMeta"
  );
  console.log("✅ Teste 3 passou: Métodos de auditoria e registro presentes no gateway.");

  console.log("\n🎉 TODOS OS TESTES DE DEDUPLICAÇÃO E GATEWAY PASSARAM!");
}

runTests().catch((err) => {
  console.error("❌ Falha nos testes:", err);
  process.exit(1);
});
