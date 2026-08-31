// tests/testMetaApiClient.js
// Testes automatizados para validação do MetaApiClient (Etapa 2)

const metaConfig = require("../config/metaConfig");
const {
  MetaApiClient,
  normalizePhoneNumber,
  parseMetaErrorMessage,
} = require("../client/metaApiClient");

console.log("==================================================");
console.log("🧪 INICIANDO TESTES DO CLIENTE META API (ETAPA 2)");
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
// TESTE 1: Normalização de Telefones
// ----------------------------------------------------
console.log("--- 1. Testando Normalização de Telefones ---");
assert(
  normalizePhoneNumber("+55 (11) 99999-8888") === "5511999998888",
  "Deve formatar número brasileiro com parênteses e traços para dígitos puros"
);
assert(
  normalizePhoneNumber("+1 (555) 123-4567") === "15551234567",
  "Deve formatar número internacional dos EUA"
);
assert(
  normalizePhoneNumber("5511988887777") === "5511988887777",
  "Deve manter números já limpos sem alteração"
);

// ----------------------------------------------------
// TESTE 2: Tratamento de Erros da Meta API
// ----------------------------------------------------
console.log("\n--- 2. Testando Tradução de Erros da Meta ---");
const error24h = {
  data: {
    error: {
      message: "Message undeliverable",
      type: "OAuthException",
      code: 131047,
    },
  },
};
assert(
  parseMetaErrorMessage(error24h).includes("Janela de atendimento de 24 horas expirada"),
  "Deve traduzir código 131047 para aviso da janela de 24 horas"
);

const errorToken = {
  data: {
    error: {
      message: "Session has expired",
      code: 190,
    },
  },
};
assert(
  parseMetaErrorMessage(errorToken).includes("Token de Acesso da Meta expirou"),
  "Deve traduzir código 190 para erro de expiração de token"
);

// ----------------------------------------------------
// TESTE 3: Configuração e Validação de Endpoints
// ----------------------------------------------------
console.log("\n--- 3. Testando Configuração e URLs da Graph API ---");
metaConfig.updateConfig({
  phoneNumberId: "10987654321",
  wabaId: "98765432100",
  accessToken: "token_teste_abc",
  apiVersion: "v21.0",
});

const validation = metaConfig.validateCredentials();
assert(validation.isValid === true, "Credenciais mínimas devem ser válidas");
assert(
  metaConfig.getMessagesEndpoint() === "https://graph.facebook.com/v21.0/10987654321/messages",
  "URL do endpoint de mensagens gerada com precisão"
);

// ----------------------------------------------------
// TESTE 4: Validação de Regras Estruturais de Botões e Listas
// ----------------------------------------------------
console.log("\n--- 4. Testando Regras de Botões Interativos e Listas ---");
const client = new MetaApiClient();

// Intercepta chamadas de request para validar o payload montado
let lastRequest = null;
client._request = async function (method, url, data) {
  lastRequest = { method, url, data };
  return { success: true, messageId: "wamid.TEST_ID_123" };
};

// 4.1 Teste de Botões
async function runButtonTest() {
  await client.sendInteractiveButtons(
    "5511999998888",
    "Escolha uma das opções abaixo:",
    [
      { id: "btn_1", title: "Opção 1 com título longo que deve ser truncado" },
      { id: "btn_2", title: "Opção 2" },
    ],
    "Título do Cabeçalho",
    "Texto do Rodapé"
  );

  const payload = lastRequest.data;
  assert(payload.messaging_product === "whatsapp", "Messaging product definido como whatsapp");
  assert(payload.type === "interactive", "Tipo interactive definido");
  assert(payload.interactive.type === "button", "Subtipo button configurado");
  assert(payload.interactive.action.buttons.length === 2, "Quantidade de botões preservada");
  assert(
    payload.interactive.action.buttons[0].reply.title.length <= 20,
    "Título do botão truncado no limite estrito de 20 caracteres da Meta"
  );
  assert(payload.interactive.header.text === "Título do Cabeçalho", "Cabeçalho adicionado");
  assert(payload.interactive.footer.text === "Texto do Rodapé", "Rodapé adicionado");
}

// 4.2 Teste de Menu de Lista
async function runListTest() {
  await client.sendInteractiveList(
    "5511999998888",
    "Selecione um serviço do nosso catálogo:",
    "Abrir Menu",
    [
      {
        title: "Planos",
        rows: [
          { id: "plano_basic", title: "Plano Standard", description: "Versão via QR Code" },
          { id: "plano_prem", title: "Plano Premium", description: "Versão via API Oficial da Meta" },
        ],
      },
    ]
  );

  const payload = lastRequest.data;
  assert(payload.interactive.type === "list", "Subtipo list configurado");
  assert(payload.interactive.action.button === "Abrir Menu", "Texto do botão da lista correto");
  assert(payload.interactive.action.sections[0].rows.length === 2, "Linhas da lista formatadas corretamente");
}

// 4.3 Teste de Template com Parâmetros
async function runTemplateTest() {
  await client.sendTemplateMessage(
    "5511999998888",
    "boas_vindas_premium",
    "pt_BR",
    [
      {
        type: "body",
        parameters: [
          { type: "text", text: "Mario" },
          { type: "text", text: "Zwei Chat Premium" },
        ],
      },
    ]
  );

  const payload = lastRequest.data;
  assert(payload.type === "template", "Tipo template configurado");
  assert(payload.template.name === "boas_vindas_premium", "Nome do template preservado");
  assert(payload.template.language.code === "pt_BR", "Idioma do template pt_BR configurado");
  assert(payload.template.components[0].parameters.length === 2, "Parâmetros dinâmicos incluídos");
}

(async () => {
  await runButtonTest();
  await runListTest();
  await runTemplateTest();

  console.log("\n==================================================");
  console.log(`📊 RESULTADO DOS TESTES: ${passedTests}/${totalTests} testes passaram com sucesso!`);
  console.log("==================================================");

  if (passedTests === totalTests) {
    console.log("🎉 Todos os testes do MetaApiClient passaram com 100% de sucesso!\n");
    process.exit(0);
  } else {
    process.exit(1);
  }
})();
