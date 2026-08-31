// tests/testSyncAndWindowService.js
// Testes automatizados para validação do Window24hService e SyncService (Etapa 3)

const {
  Window24hService,
  WINDOW_DURATION_MS,
} = require("../services/window24hService");
const { SyncService } = require("../services/syncService");

console.log("==================================================");
console.log("🧪 INICIANDO TESTES DE SINCRONIZAÇÃO E JANELA 24H (ETAPA 3)");
console.log("==================================================\n");

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
  }
}

// ----------------------------------------------------
// TESTE 1: Estado Inicial da Janela de 24h (Sem Mensagens)
// ----------------------------------------------------
console.log("--- 1. Testando Estado Inicial da Janela 24h ---");
const windowService = new Window24hService();
const phoneTest = "+55 (11) 99999-1111";

const initialCheck = windowService.checkWindow(phoneTest);
assert(initialCheck.isOpen === false, "Janela deve iniciar fechada sem histórico");
assert(initialCheck.isExpired === true, "isExpired deve ser true para novo contato");
assert(
  windowService.canSendFreeForm(phoneTest).allowed === false,
  "Não deve permitir envio livre sem abertura prévia de janela"
);

// ----------------------------------------------------
// TESTE 2: Abertura da Janela com Mensagem Recente
// ----------------------------------------------------
console.log("\n--- 2. Testando Abertura e Validade da Janela ---");
const now = Date.now();
windowService.recordInboundInteraction(phoneTest, now);

const openCheck = windowService.checkWindow(phoneTest);
assert(openCheck.isOpen === true, "Janela deve estar aberta após mensagem de entrada");
assert(openCheck.isExpired === false, "isExpired deve ser false");
assert(openCheck.remainingMs > 0, "Tempo restante deve ser maior que zero");
assert(openCheck.formattedStatus.includes("restantes"), "Status formatado contém 'restantes'");
assert(
  windowService.canSendFreeForm(phoneTest).allowed === true,
  "Deve autorizar envio de mensagem livre dentro da janela de 24h"
);

// ----------------------------------------------------
// TESTE 3: Expiração da Janela (Simulando 25 horas atrás)
// ----------------------------------------------------
console.log("\n--- 3. Testando Expiração após 24 horas ---");
const twentyFiveHoursAgo = now - (25 * 60 * 60 * 1000);
windowService.recordInboundInteraction(phoneTest, twentyFiveHoursAgo);

const expiredCheck = windowService.checkWindow(phoneTest);
assert(expiredCheck.isOpen === false, "Janela deve estar fechada após 25h");
assert(expiredCheck.isExpired === true, "isExpired deve ser true");
assert(expiredCheck.remainingMs === 0, "Tempo restante zerado");
assert(
  expiredCheck.formattedStatus.includes("Janela expirada há"),
  "Status formatado indica expiração"
);

const freeFormValidation = windowService.canSendFreeForm(phoneTest);
assert(freeFormValidation.allowed === false, "Envio livre bloqueado após 24h");
assert(
  freeFormValidation.reason.includes("Message Template"),
  "Mensagem orienta o envio de Message Template"
);

// ----------------------------------------------------
// TESTE 4: Renovação da Janela com Nova Mensagem
// ----------------------------------------------------
console.log("\n--- 4. Testando Renovação da Janela ---");
windowService.recordInboundInteraction(phoneTest, Date.now());
const renewedCheck = windowService.checkWindow(phoneTest);
assert(renewedCheck.isOpen === true, "Janela renovada com sucesso por nova mensagem");

// ----------------------------------------------------
// TESTE 5: Barramento de Eventos do SyncService
// ----------------------------------------------------
console.log("\n--- 5. Testando SyncService e Roteamento de Eventos ---");
const sync = new SyncService();

let inboundEventReceived = false;
let statusEventReceived = false;

sync.on("message:inbound", (msg) => {
  if (msg.from === "5511988882222" && msg.body === "Olá!") {
    inboundEventReceived = true;
  }
});

sync.on("message:status_updated", (statusMsg) => {
  if (statusMsg.id === "wamid.TEST_99" && statusMsg.status === "read") {
    statusEventReceived = true;
  }
});

// Simula chamada de snapshot com mock de dados
const mockDocChangeInbound = {
  type: "added",
  doc: {
    id: "wamid.TEST_100",
    data: () => ({
      from: "5511988882222",
      body: "Olá!",
      direction: "inbound",
      timestamp: Date.now(),
      type: "text",
    }),
  },
};

const mockDocChangeStatus = {
  type: "modified",
  doc: {
    id: "wamid.TEST_99",
    data: () => ({
      from: "5511988882222",
      direction: "outbound",
      status: "read",
      updatedAt: Date.now(),
    }),
  },
};

// Mock de Firestore collection com onSnapshot
const mockDb = {
  collection: (name) => ({
    onSnapshot: (callback) => {
      if (name === "messages") {
        callback({
          docChanges: () => [mockDocChangeInbound, mockDocChangeStatus],
        });
      }
      return () => {};
    },
  }),
};

sync.initialize(mockDb);
sync.startListening();

assert(inboundEventReceived === true, "Evento message:inbound disparado e capturado com sucesso");
assert(statusEventReceived === true, "Evento message:status_updated disparado com status 'read'");

console.log("\n==================================================");
console.log(`📊 RESULTADO DOS TESTES: ${passedTests}/${totalTests} testes passaram com sucesso!`);
console.log("==================================================");

if (passedTests === totalTests) {
  console.log("🎉 Todos os testes de Sincronização e Janela 24h foram concluídos com êxito!\n");
  process.exit(0);
} else {
  process.exit(1);
}
