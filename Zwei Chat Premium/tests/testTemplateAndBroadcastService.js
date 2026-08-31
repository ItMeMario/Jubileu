// tests/testTemplateAndBroadcastService.js
// Testes automatizados para validação do MetaTemplateService e MetaBroadcastService (Etapa 4)

const {
  MetaTemplateService,
  metaTemplateService,
} = require("../services/metaTemplateService");
const {
  MetaBroadcastService,
  metaBroadcastService,
} = require("../services/metaBroadcastService");
const { metaApiClient } = require("../client/metaApiClient");

console.log("==================================================");
console.log("🧪 INICIANDO TESTES DE TEMPLATES E DISPARADOR (ETAPA 4)");
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
// TESTE 1: Extração de Variáveis e Normalização de Template
// ----------------------------------------------------
console.log("--- 1. Testando Extração de Variáveis de Templates ---");
const templateService = new MetaTemplateService();

const rawTemplateData = {
  id: "1234567890",
  name: "aviso_cobranca",
  status: "APPROVED",
  category: "UTILITY",
  language: "pt_BR",
  components: [
    { type: "HEADER", format: "TEXT", text: "Aviso Importante" },
    {
      type: "BODY",
      text: "Olá {{1}}, seu boleto no valor de R$ {{2}} vence em {{3}}. Acesse: {{4}}",
    },
    { type: "FOOTER", text: "Zwei Chat - Não responda a esta mensagem" },
    {
      type: "BUTTONS",
      buttons: [{ type: "URL", text: "Pagar Agora", url: "https://exemplo.com" }],
    },
  ],
};

const normalized = templateService._normalizeTemplate(rawTemplateData);

assert(normalized.name === "aviso_cobranca", "Nome do template normalizado");
assert(normalized.status === "APPROVED", "Status do template preservado");
assert(normalized.components.body.variables.length === 4, "4 variáveis dinâmicas identificadas");
assert(
  JSON.stringify(normalized.components.body.variables) === JSON.stringify(["1", "2", "3", "4"]),
  "Índices das variáveis extraídos na ordem correta"
);

// ----------------------------------------------------
// TESTE 2: Renderização de Preview e Construção de Parâmetros
// ----------------------------------------------------
console.log("\n--- 2. Testando Preview e Payload de Componentes ---");
const sampleValues = ["Mario", "150,00", "10/09/2026", "https://pagar.me/123"];
const previewText = templateService.renderPreview(normalized, sampleValues);

assert(
  previewText === "Olá Mario, seu boleto no valor de R$ 150,00 vence em 10/09/2026. Acesse: https://pagar.me/123",
  "Texto de preview gerado com substituição exata das variáveis"
);

const componentsPayload = templateService.buildTemplateComponents(normalized, sampleValues);
assert(componentsPayload.length === 1, "Componente de corpo gerado");
assert(componentsPayload[0].type === "body", "Tipo body especificado");
assert(componentsPayload[0].parameters.length === 4, "4 parâmetros textuais criados");
assert(componentsPayload[0].parameters[0].text === "Mario", "Primeiro parâmetro correto");
assert(componentsPayload[0].parameters[1].text === "150,00", "Segundo parâmetro correto");

// ----------------------------------------------------
// TESTE 3: Execução do Disparador em Lote (Broadcast)
// ----------------------------------------------------
console.log("\n--- 3. Testando Disparador Oficial em Lote ---");
const broadcastService = new MetaBroadcastService();

// Mock do envio de template da Meta API para teste isolado
let sentRecipients = [];
metaApiClient.sendTemplateMessage = async function (to, templateName, languageCode, components) {
  sentRecipients.push({ to, templateName, components });
  if (to === "5511999990000") {
    return { success: false, error: "Número inexistente na Meta" };
  }
  return { success: true, messageId: `wamid.MOCK_${Date.now()}_${to}` };
};

// Registra template na memória do templateService
metaTemplateService.templates = [normalized];

async function runBroadcastTest() {
  const recipientsList = [
    {
      phone: "(11) 99999-1111",
      name: "João Silva",
      variables: ["João Silva", "200,00", "15/09", "https://link.com/1"],
    },
    {
      phone: "5511999992222",
      name: "Ana Costa",
      variables: ["Ana Costa", "350,00", "20/09", "https://link.com/2"],
    },
    {
      phone: "5511999990000", // Simula número que falhará
      name: "Contato Invalido",
      variables: ["Invalido", "0,00", "00/00", "https://link.com/3"],
    },
  ];

  let progressCount = 0;
  broadcastService.on("broadcast:progress", (stats) => {
    progressCount++;
  });

  const finalStats = await broadcastService.startBroadcast({
    campaignId: "campanha_teste_01",
    templateName: "aviso_cobranca",
    recipients: recipientsList,
    delayBetweenMs: 10,
  });

  assert(finalStats.total === 3, "Total de 3 contatos processados");
  assert(finalStats.sent === 2, "2 envios realizados com sucesso");
  assert(finalStats.failed === 1, "1 envio com falha registrado");
  assert(finalStats.progressPercent === 100, "Progresso atingiu 100%");
  assert(progressCount === 3, "Eventos de progresso disparados para cada contato");
  assert(sentRecipients.length === 3, "Todas as requisições foram despachadas");
  assert(finalStats.logs.length === 3, "Log individual de cada envio gerado");
}

(async () => {
  await runBroadcastTest();

  console.log("\n==================================================");
  console.log(`📊 RESULTADO DOS TESTES: ${passedTests}/${totalTests} testes passaram com sucesso!`);
  console.log("==================================================");

  if (passedTests === totalTests) {
    console.log("🎉 Todos os testes de Templates e Disparador foram concluídos com êxito!\n");
    process.exit(0);
  } else {
    process.exit(1);
  }
})();
