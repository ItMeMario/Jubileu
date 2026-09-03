// tests/testBroadcastService.js
// Suite de Testes para metaBroadcastService e canais da Etapa 2

const assert = require("assert");
const { calculateDelayMs, MetaBroadcastService } = require("../services/metaBroadcastService");

console.log("🧪 Iniciando testes da ETAPA 2 (metaBroadcastService e lógica de disparo)...\n");

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

// 1. TESTES DE CÁLCULO DE DELAY
console.log("▶️ Testando calculateDelayMs:");

test("Delay numérico simples deve ser retornado em ms", () => {
  assert.strictEqual(calculateDelayMs(2000), 2000);
  assert.strictEqual(calculateDelayMs(0), 0);
});

test("Delay com tipo fixo em segundos", () => {
  const result = calculateDelayMs({ type: "fixed", unit: "seconds", value: 3 });
  assert.strictEqual(result, 3000);
});

test("Delay com tipo fixo em minutos", () => {
  const result = calculateDelayMs({ type: "fixed", unit: "minutes", value: 1 });
  assert.strictEqual(result, 60000);
});

test("Delay com tipo range (aleatório)", () => {
  const config = { type: "range", unit: "seconds", min: 2, max: 4 };
  for (let i = 0; i < 20; i++) {
    const delay = calculateDelayMs(config);
    assert.ok(delay >= 2000 && delay <= 4000, `Delay ${delay} deve estar entre 2000 e 4000`);
  }
});

// 2. TESTES DE EVENTOS E CONTROLE
console.log("\n▶️ Testando MetaBroadcastService (Estado e Eventos):");

test("Instância deve inicializar com estado inativo", () => {
  const service = new MetaBroadcastService();
  assert.strictEqual(service.isRunning, false);
  assert.strictEqual(service.isPaused, false);
  assert.strictEqual(service.shouldStop, false);
  const stats = service.getStats();
  assert.strictEqual(stats.total, 0);
  assert.strictEqual(stats.processed, 0);
});

test("Pausa, retomada e parada devem emitir eventos corretos", () => {
  const service = new MetaBroadcastService();
  service.isRunning = true;

  let pauseEventFired = false;
  let resumeEventFired = false;
  let stopEventFired = false;
  let logEvents = [];

  service.on("broadcast:paused", () => { pauseEventFired = true; });
  service.on("broadcast:resumed", () => { resumeEventFired = true; });
  service.on("broadcast:stopped", () => { stopEventFired = true; });
  service.on("broadcast:log", (l) => { logEvents.push(l); });

  service.pause();
  assert.strictEqual(service.isPaused, true);
  assert.strictEqual(pauseEventFired, true);

  service.resume();
  assert.strictEqual(service.isPaused, false);
  assert.strictEqual(resumeEventFired, true);

  service.stop();
  assert.strictEqual(service.shouldStop, true);
  assert.strictEqual(stopEventFired, true);
  assert.ok(logEvents.length >= 2, "Deve ter emitido logs informativos");
});

console.log(`\n📊 Resultado dos Testes: ${passed}/${total} passaram.`);
if (passed === total) {
  console.log("🎉 Todos os testes da ETAPA 2 foram aprovados com sucesso!");
} else {
  process.exit(1);
}
