// tests/oauthCsrfSecurity.test.js
// Testes unitários para validar a proteção anti-CSRF no fluxo OAuth da Meta (Etapa S3)

const assert = require("assert");
const { metaOnboardingService } = require("../services/metaOnboardingService");

console.log("🧪 Iniciando testes de segurança da Etapa S3: Proteção Anti-CSRF no OAuth...");

// 1. Geração de State Criptograficamente Seguro
const state1 = metaOnboardingService.generateOAuthState();
const state2 = metaOnboardingService.generateOAuthState();

assert.ok(state1, "State gerado não pode ser vazio");
assert.strictEqual(typeof state1, "string", "State deve ser string");
assert.strictEqual(state1.length, 48, "State deve ter 48 caracteres hexadecimais (24 bytes de entropia)");
assert.notStrictEqual(state1, state2, "Cada state gerado deve ser estritamente único e aleatório");

console.log("✅ 1. Geração de tokens de estado de alta entropia validada!");

// 2. Inclusão correta do State na URL oficial do diálogo OAuth
const authUrl = metaOnboardingService.getEmbeddedSignupUrl("https://www.facebook.com/connect/login_success.html", state1);
const parsedUrl = new URL(authUrl);

assert.strictEqual(parsedUrl.searchParams.get("state"), state1, "A URL de autenticação deve conter o parâmetro state correspondente");

console.log("✅ 2. Inclusão do parâmetro state na URL OAuth confirmada!");

// 3. Validação de State Legítimo vs Ataque de CSRF
const isValidLegit = metaOnboardingService.validateOAuthState(state1, state1);
assert.strictEqual(isValidLegit, true, "State idêntico deve ser aprovado");

const isAttackBlocked = metaOnboardingService.validateOAuthState("state_falso_injetado_por_atacante_99999999999999", state1);
assert.strictEqual(isAttackBlocked, false, "State divergente (ataque CSRF) deve ser bloqueado estritamente");

const isMissingBlocked = metaOnboardingService.validateOAuthState(null, state1);
assert.strictEqual(isMissingBlocked, false, "Callback sem state deve ser bloqueado");

const isEmptyBlocked = metaOnboardingService.validateOAuthState("", state1);
assert.strictEqual(isEmptyBlocked, false, "State vazio deve ser bloqueado");

const isDifferentLengthBlocked = metaOnboardingService.validateOAuthState("abc", state1);
assert.strictEqual(isDifferentLengthBlocked, false, "State com comprimento divergente deve ser bloqueado");

console.log("✅ 3. Bloqueio de sequestro de sessão e ataques de CSRF validado com sucesso!");

console.log("🎉 Todos os testes de segurança da Etapa S3 passaram com 100% de sucesso!");
