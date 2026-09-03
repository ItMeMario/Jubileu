// tests/testNumberTransformer.js
// Suite de Testes Automatizados para numberTransformer e broadcastRecipientsService

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { aplicarTransformacoes } = require("../services/numberTransformer");
const { broadcastRecipientsService } = require("../services/broadcastRecipientsService");

console.log("🧪 Iniciando testes da ETAPA 1 (numberTransformer e broadcastRecipientsService)...\n");

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
  }
}

// -------------------------------------------------------------
// 1. TESTES DO NUMBER TRANSFORMER
// -------------------------------------------------------------
console.log("▶️ Testando numberTransformer:");

test("Número completo já formatado (5511999998888) deve permanecer inalterado", () => {
  const result = aplicarTransformacoes("5511999998888", {
    addCountryPrefix: true,
    defaultCountryPrefix: "55",
    addDDD: true,
    defaultDDD: "11",
    add9thDigit: true,
  });
  assert.strictEqual(result, "5511999998888");
});

test("Número com formatação humana (+55 (11) 99999-8888) deve ser sanitizado", () => {
  const result = aplicarTransformacoes("+55 (11) 99999-8888", {
    addCountryPrefix: true,
    defaultCountryPrefix: "55",
  });
  assert.strictEqual(result, "5511999998888");
});

test("Número sem código de país (11999998888) deve receber prefixo 55", () => {
  const result = aplicarTransformacoes("11999998888", {
    addCountryPrefix: true,
    defaultCountryPrefix: "55",
  });
  assert.strictEqual(result, "5511999998888");
});

test("Número de 8 dígitos sem DDD e sem 55 (99998888) deve receber 55 + DDD (11) + 9º dígito", () => {
  const result = aplicarTransformacoes("99998888", {
    addCountryPrefix: true,
    defaultCountryPrefix: "55",
    addDDD: true,
    defaultDDD: "11",
    add9thDigit: true,
  });
  assert.strictEqual(result, "5511999998888");
});

test("Número com 55 e DDD (47), mas com 8 dígitos (554788887777), deve receber o 9º dígito", () => {
  const result = aplicarTransformacoes("554788887777", {
    addCountryPrefix: true,
    defaultCountryPrefix: "55",
    add9thDigit: true,
  });
  assert.strictEqual(result, "5547988887777");
});

test("Número sem prefixo com DDD e 8 dígitos (4788887777) deve virar 5547988887777", () => {
  const result = aplicarTransformacoes("4788887777", {
    addCountryPrefix: true,
    defaultCountryPrefix: "55",
    add9thDigit: true,
  });
  assert.strictEqual(result, "5547988887777");
});

test("Entrada nula ou vazia deve retornar string vazia", () => {
  assert.strictEqual(aplicarTransformacoes(null), "");
  assert.strictEqual(aplicarTransformacoes(""), "");
  assert.strictEqual(aplicarTransformacoes(undefined), "");
});

// -------------------------------------------------------------
// 2. TESTES DO BROADCAST RECIPIENTS SERVICE
// -------------------------------------------------------------
console.log("\n▶️ Testando broadcastRecipientsService:");

// Limpa dados de teste prévios
broadcastRecipientsService.clearRecipients("all");

test("Salvar e obter configurações de disparo e formatação", () => {
  const saved = broadcastRecipientsService.saveConfig({
    defaultDDD: "21",
    add9thDigit: true,
  });
  assert.strictEqual(saved.defaultDDD, "21");
  const loaded = broadcastRecipientsService.getConfig();
  assert.strictEqual(loaded.defaultDDD, "21");
  assert.strictEqual(loaded.add9thDigit, true);
});

test("Adicionar destinatário individualmente com normalização automática", () => {
  const recipient = broadcastRecipientsService.addRecipient({
    phone: "98888-1111", // DDD 21 configurado acima + 55 (já possui 9 dígitos: 988881111)
    name: "Carlos Teste",
    variables: ["Carlos", "100.00"],
  });

  assert.strictEqual(recipient.phone, "5521988881111");
  assert.strictEqual(recipient.name, "Carlos Teste");
  assert.strictEqual(recipient.status, "pending");
  assert.deepStrictEqual(recipient.variables, ["Carlos", "100.00"]);
});

test("Adicionar lote de destinatários (Batch) com deduplicação", () => {
  const batch = [
    { phone: "5511999990001", name: "Ana", variables: ["Ana", "R$ 50"] },
    { phone: "5511999990002", name: "Bruno", variables: ["Bruno", "R$ 60"] },
    { phone: "98888-1111", name: "Carlos Atualizado", variables: ["Carlos Atualizado", "R$ 200"] }, // Atualiza o anterior
  ];

  const count = broadcastRecipientsService.addRecipientsBatch(batch);
  assert.strictEqual(count, 3);

  const all = broadcastRecipientsService.getRecipients();
  assert.strictEqual(all.length, 3); // 2 novos + 1 atualizado

  const carlos = all.find((r) => r.phone === "5521988881111");
  assert.ok(carlos, "Carlos deve existir na lista");
  assert.strictEqual(carlos.name, "Carlos Atualizado");
});

test("Obter estatísticas da fila (getStats)", () => {
  const stats = broadcastRecipientsService.getStats();
  assert.strictEqual(stats.total, 3);
  assert.strictEqual(stats.pending, 3);
  assert.strictEqual(stats.sent, 0);
  assert.strictEqual(stats.failed, 0);
});

test("Atualizar status do destinatário (updateRecipientStatus)", () => {
  const updated = broadcastRecipientsService.updateRecipientStatus(
    "5511999990001",
    "sent",
    null,
    "wamid.TEST12345"
  );
  assert.strictEqual(updated, true);

  const stats = broadcastRecipientsService.getStats();
  assert.strictEqual(stats.sent, 1);
  assert.strictEqual(stats.pending, 2);
});

test("Limpar contatos por filtro ('sent')", () => {
  const removed = broadcastRecipientsService.clearRecipients("sent");
  assert.strictEqual(removed, 1);

  const stats = broadcastRecipientsService.getStats();
  assert.strictEqual(stats.total, 2);
  assert.strictEqual(stats.sent, 0);
  assert.strictEqual(stats.pending, 2);
});

test("Remover contato individual por ID", () => {
  const all = broadcastRecipientsService.getRecipients();
  const idToRemove = all[0].id;

  const removed = broadcastRecipientsService.removeRecipient(idToRemove);
  assert.strictEqual(removed, true);

  const stats = broadcastRecipientsService.getStats();
  assert.strictEqual(stats.total, 1);
});

console.log(`\n📊 Resultado dos Testes: ${passed}/${total} passaram.`);
if (passed === total) {
  console.log("🎉 Todos os testes da ETAPA 1 foram aprovados com sucesso!");
} else {
  process.exit(1);
}
