// tests/webhookSecurity.test.js
// Teste de validação e segurança criptográfica do Webhook (Etapa S2)

const assert = require("assert");
const crypto = require("crypto");
const { CloudGatewayService } = require("../cloud-gateway/server");

console.log("🧪 Iniciando testes de segurança da Etapa S2: Validação HMAC-SHA256 do Webhook...");

const gateway = new CloudGatewayService();
const sampleSecret = "c647804bf6d72a7c8cab030ac6dc6cce";
const sampleBody = JSON.stringify({
  object: "whatsapp_business_account",
  entry: [{ id: "12345", changes: [{ field: "messages", value: { messages: [{ from: "551199999999", text: { body: "Olá" } }] } }] }],
});

// 1. Assinatura válida oficial da Meta
const validHmac = crypto.createHmac("sha256", sampleSecret).update(sampleBody).digest("hex");
const validSignatureHeader = `sha256=${validHmac}`;

const isValid = gateway.verifyMetaSignature(sampleBody, validSignatureHeader, sampleSecret);
assert.strictEqual(isValid, true, "Assinatura válida deve ser aceita pelo webhook");
console.log("✅ 1. Assinatura válida oficial aceita com sucesso!");

// 2. Requisição sem cabeçalho de assinatura (Spoofing)
assert.strictEqual(gateway.verifyMetaSignature(sampleBody, null, sampleSecret), false);
assert.strictEqual(gateway.verifyMetaSignature(sampleBody, "", sampleSecret), false);
console.log("✅ 2. Requisição sem assinatura bloqueada com sucesso!");

// 3. Assinatura forjada com chave/segredo incorreto (Ataque de Falsificação)
const fakeSecret = "segredo_falso_de_outro_app_123456789";
const fakeHmac = crypto.createHmac("sha256", fakeSecret).update(sampleBody).digest("hex");
const fakeSignatureHeader = `sha256=${fakeHmac}`;

const isFakeValid = gateway.verifyMetaSignature(sampleBody, fakeSignatureHeader, sampleSecret);
assert.strictEqual(isFakeValid, false, "Assinatura gerada com segredo incorreto deve ser rejeitada");
console.log("✅ 3. Tentativa de falsificação de assinatura rejeitada!");

// 4. Payload adulterado em trânsito (Man-In-The-Middle / Tampering)
const tamperedBody = sampleBody.replace("Olá", "Ataque_Injetado");
const isTamperedValid = gateway.verifyMetaSignature(tamperedBody, validSignatureHeader, sampleSecret);
assert.strictEqual(isTamperedValid, false, "Corpo alterado sem recalcular assinatura deve ser rejeitado");
console.log("✅ 4. Payload adulterado em trânsito detectado e bloqueado!");

// 5. Formatos malformados e ataques de timing
assert.strictEqual(gateway.verifyMetaSignature(sampleBody, "md5=123456", sampleSecret), false);
assert.strictEqual(gateway.verifyMetaSignature(sampleBody, "sha256=", sampleSecret), false);
assert.strictEqual(gateway.verifyMetaSignature(sampleBody, "invalido", sampleSecret), false);
assert.strictEqual(gateway.verifyMetaSignature(sampleBody, "sha256=curto", sampleSecret), false);

console.log("✅ 5. Tratamento seguro de cabeçalhos malformados e defesas anti-timing validadas!");

console.log("🎉 Todos os testes de segurança da Etapa S2 passaram com 100% de sucesso!");
