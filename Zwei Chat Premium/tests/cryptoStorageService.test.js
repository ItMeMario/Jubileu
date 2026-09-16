// tests/cryptoStorageService.test.js
// Testes unitários para validar o serviço de criptografia de credenciais (Etapa S1)

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { cryptoStorageService } = require("../services/cryptoStorageService");
const metaConfig = require("../config/metaConfig");

console.log("🧪 Iniciando testes de segurança da Etapa S1: cryptoStorageService...");

// 1. Criptografia e Descriptografia básica
const sampleSecretToken = "EAAZA7YCXZACOkBSRZAdBuAhF7QDf15uAZCtB3MEzJXKSsBbxBUZBmaD4dtUva772tNidwOF";
const encrypted = cryptoStorageService.encrypt(sampleSecretToken);

assert.ok(encrypted, "O texto criptografado não pode ser vazio");
assert.notStrictEqual(encrypted, sampleSecretToken, "O texto criptografado deve ser diferente do original");
assert.ok(cryptoStorageService.isEncrypted(encrypted), "isEncrypted deve retornar true para texto cifrado");

console.log("✅ 1. Criptografia executada com sucesso!");

// 2. Descriptografia e recuperação da integridade original
const decrypted = cryptoStorageService.decrypt(encrypted);
assert.strictEqual(decrypted, sampleSecretToken, "O texto descriptografado deve ser exatamente igual ao original");

console.log("✅ 2. Descriptografia e integridade dos dados validadas!");

// 3. Compatibilidade reversa com tokens legados em texto puro
const legacyToken = "EAA_LEGACY_PLAIN_TOKEN_12345";
const decryptedLegacy = cryptoStorageService.decrypt(legacyToken);
assert.strictEqual(decryptedLegacy, legacyToken, "Tokens legados em texto puro devem ser mantidos sem corrupção");

console.log("✅ 3. Compatibilidade com tokens legados confirmada!");

// 4. Idempotência (não criptografar duas vezes)
const doubleEncrypted = cryptoStorageService.encrypt(encrypted);
assert.strictEqual(doubleEncrypted, encrypted, "Criptografar um texto já cifrado não deve alterar a string");

console.log("✅ 4. Idempotência de criptografia validada!");

// 5. Tratamento de valores nulos e vazios
assert.strictEqual(cryptoStorageService.encrypt(""), "");
assert.strictEqual(cryptoStorageService.decrypt(""), "");
assert.strictEqual(cryptoStorageService.encrypt(null), "");
assert.strictEqual(cryptoStorageService.decrypt(null), "");

console.log("✅ 5. Tratamento de valores nulos/vazios validado!");

// 6. Teste de integração com metaConfig (Gravação segura em disco)
const envPath = path.join(__dirname, "../.env");
const originalEnvContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";

try {
  const testSecret = "EAAB_TEST_SECRET_KEY_SAFE_STORAGE_999";
  metaConfig.saveToEnvFile({ accessToken: testSecret });

  // O arquivo físico no disco deve conter o token criptografado
  const diskEnv = fs.readFileSync(envPath, "utf-8");
  assert.ok(!diskEnv.includes(`META_ACCESS_TOKEN=${testSecret}`), "O token NÃO pode estar em texto puro no disco!");
  assert.ok(diskEnv.includes("META_ACCESS_TOKEN=enc:"), "O token no arquivo .env deve estar com prefixo enc:");

  // A memória da aplicação deve continuar acessando o token em claro perfeitamente
  assert.strictEqual(metaConfig.getConfig().accessToken, testSecret, "O token em memória deve estar acessível em claro");

  console.log("✅ 6. Integração com metaConfig e gravação segura em disco validada com sucesso!");
} finally {
  // Restaura o .env original para integridade do ambiente
  if (originalEnvContent) {
    fs.writeFileSync(envPath, originalEnvContent, "utf-8");
    require("dotenv").config({ path: envPath, override: true });
    metaConfig.updateConfig({
      accessToken: process.env.META_ACCESS_TOKEN || "",
    });
  }
}

console.log("🎉 Todos os testes de segurança da Etapa S1 passaram com 100% de sucesso!");
