// tests/testWebhookSimulator.js
// Simulador e Teste Automatizado para o Webhook da Meta e Funções de Normalização

const crypto = require("crypto");
const {
  verifyMetaSignature,
  normalizeIncomingMessage,
} = require("../firebase-backend/index");

console.log("==================================================");
console.log("🧪 INICIANDO TESTES DO WEBHOOK DA META (ETAPA 1)");
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
// TESTE 1: Validação de Assinatura Criptográfica HMAC-SHA256
// ----------------------------------------------------
console.log("--- 1. Testando Validação de Assinatura HMAC ---");
const testSecret = "meu_app_secret_super_seguro_123";
const rawPayload = JSON.stringify({
  object: "whatsapp_business_account",
  entry: [{ id: "123456789" }],
});

// Gera assinatura válida
const validHash = crypto
  .createHmac("sha256", testSecret)
  .update(rawPayload)
  .digest("hex");
const validHeader = `sha256=${validHash}`;

assert(
  verifyMetaSignature(rawPayload, validHeader, testSecret) === true,
  "Deve aceitar payload com assinatura HMAC-SHA256 válida"
);

assert(
  verifyMetaSignature(rawPayload, "sha256=hash_invalido_falso", testSecret) === false,
  "Deve rejeitar payload com assinatura inválida"
);

assert(
  verifyMetaSignature(rawPayload, validHeader, "secret_incorreto") === false,
  "Deve rejeitar quando o App Secret informado estiver incorreto"
);

// ----------------------------------------------------
// TESTE 2: Normalização de Mensagem de Texto Simples
// ----------------------------------------------------
console.log("\n--- 2. Testando Normalização de Mensagens ---");
const textPayload = {
  from: "5511999998888",
  id: "wamid.HBgLMNTUxMTk5OTk5",
  timestamp: "1725000000",
  type: "text",
  text: { body: "Olá, gostaria de saber mais sobre o Zwei Chat Premium!" },
};

const contactInfo = {
  profile: { name: "Maria Silva" },
  wa_id: "5511999998888",
};

const metadataInfo = {
  display_phone_number: "+55 11 90000-0000",
  phone_number_id: "987654321098765",
};

const normalizedText = normalizeIncomingMessage(textPayload, contactInfo, metadataInfo);

assert(normalizedText.id === textPayload.id, "ID da mensagem normalizado corretamente");
assert(normalizedText.from === "5511999998888", "Número do remetente correto");
assert(normalizedText.senderName === "Maria Silva", "Nome do contato capturado");
assert(normalizedText.body === textPayload.text.body, "Corpo do texto extraído corretamente");
assert(normalizedText.direction === "inbound", "Direção identificada como inbound");

// ----------------------------------------------------
// TESTE 3: Normalização de Resposta de Botão Interativo (Quick Reply)
// ----------------------------------------------------
console.log("\n--- 3. Testando Mensagens Interativas (Botões & Listas) ---");
const buttonPayload = {
  from: "5511999998888",
  id: "wamid.HBgLMNTUxMTk5OTkx",
  timestamp: "1725000010",
  type: "interactive",
  interactive: {
    type: "button_reply",
    button_reply: {
      id: "btn_comprar_plano",
      title: "Quero o Plano Premium",
    },
  },
};

const normalizedButton = normalizeIncomingMessage(buttonPayload, contactInfo, metadataInfo);
assert(normalizedButton.type === "interactive", "Tipo interativo identificado");
assert(normalizedButton.interactiveType === "button_reply", "Subtipo button_reply identificado");
assert(normalizedButton.buttonReply.id === "btn_comprar_plano", "ID do botão clicado preservado");
assert(normalizedButton.body === "Quero o Plano Premium", "Título do botão usado como corpo da mensagem");

// ----------------------------------------------------
// TESTE 4: Normalização de Resposta de Menu/Lista (List Reply)
// ----------------------------------------------------
const listPayload = {
  from: "5511999998888",
  id: "wamid.HBgLMNTUxMTk5OTky",
  timestamp: "1725000020",
  type: "interactive",
  interactive: {
    type: "list_reply",
    list_reply: {
      id: "opt_suporte_tecnico",
      title: "Suporte Técnico",
      description: "Falar com um atendente humano",
    },
  },
};

const normalizedList = normalizeIncomingMessage(listPayload, contactInfo, metadataInfo);
assert(normalizedList.interactiveType === "list_reply", "Subtipo list_reply identificado");
assert(normalizedList.listReply.id === "opt_suporte_tecnico", "ID da opção da lista preservado");
assert(normalizedList.listReply.description === "Falar com um atendente humano", "Descrição da lista capturada");

// ----------------------------------------------------
// TESTE 5: Normalização de Mídia (Documento / Imagem)
// ----------------------------------------------------
console.log("\n--- 4. Testando Normalização de Mídia ---");
const mediaPayload = {
  from: "5511999998888",
  id: "wamid.HBgLMNTUxMTk5OTkz",
  timestamp: "1725000030",
  type: "document",
  document: {
    id: "media_id_123456",
    mime_type: "application/pdf",
    filename: "contrato_servico.pdf",
    caption: "Segue o contrato assinado",
  },
};

const normalizedMedia = normalizeIncomingMessage(mediaPayload, contactInfo, metadataInfo);
assert(normalizedMedia.type === "document", "Tipo documento identificado");
assert(normalizedMedia.media.filename === "contrato_servico.pdf", "Nome do arquivo PDF preservado");
assert(normalizedMedia.media.mimeType === "application/pdf", "MIME type preservado");

console.log("\n==================================================");
console.log(`📊 RESULTADO DOS TESTES: ${passedTests}/${totalTests} testes passaram com sucesso!`);
console.log("==================================================");

if (passedTests === totalTests) {
  console.log("🎉 Todos os testes da Etapa 1 foram concluídos com êxito!\n");
  process.exit(0);
} else {
  console.error("⚠️ Alguns testes falharam.\n");
  process.exit(1);
}
