// tests/electronSecurity.test.js
// Testes unitários de validação da Etapa S4 (Endurecimento do Electron e Content Security Policy)

const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("🧪 Iniciando testes de segurança da Etapa S4: Endurecimento do Electron & CSP...");

// 1. Validação de Content Security Policy (CSP) no index.html
const indexHtmlPath = path.join(__dirname, "../renderer/html/index.html");
assert.ok(fs.existsSync(indexHtmlPath), "index.html deve existir");

const htmlContent = fs.readFileSync(indexHtmlPath, "utf-8");
assert.ok(htmlContent.includes("Content-Security-Policy"), "index.html deve conter a meta tag Content-Security-Policy");

// Validação de diretivas estritas na CSP
assert.ok(htmlContent.includes("default-src 'self'"), "CSP deve restringir default-src para 'self'");
assert.ok(htmlContent.includes("script-src 'self'"), "CSP deve restringir script-src para 'self' (bloqueando scripts remotos/eval)");
assert.ok(htmlContent.includes("connect-src 'self' https://graph.facebook.com"), "CSP deve restringir connect-src exclusivamente para endpoints autorizados");

console.log("✅ 1. Content Security Policy (CSP) rigorosa validada no index.html!");

// 2. Validação de regras de navegação segura no main.js
const mainJsPath = path.join(__dirname, "../main.js");
assert.ok(fs.existsSync(mainJsPath), "main.js deve existir");

const mainJsContent = fs.readFileSync(mainJsPath, "utf-8");
assert.ok(mainJsContent.includes("shell"), "main.js deve importar o módulo shell do Electron");
assert.ok(mainJsContent.includes("will-navigate"), "main.js deve interceptar o evento will-navigate para impedir navegação arbitrária");
assert.ok(mainJsContent.includes("setWindowOpenHandler"), "main.js deve configurar setWindowOpenHandler para bloquear popups indevidos");
assert.ok(mainJsContent.includes("shell.openExternal"), "main.js deve encaminhar links externos para o navegador padrão");

console.log("✅ 2. Bloqueio de navegação arbitrária e abertura de links externos validado!");

console.log("🎉 Todos os testes de segurança da Etapa S4 passaram com 100% de sucesso!");
