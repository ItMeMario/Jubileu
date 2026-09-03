// tests/testBroadcastModule.js
// Suite de Testes para o parser de contatos e lógica da Etapa 4

const assert = require("assert");
const { parseRecipientsInput } = require("../renderer/guiScripts/appGuiModules/broadcastModule");

console.log("🧪 Iniciando testes da ETAPA 4 (broadcastModule & parse de contatos/CSV)...\n");

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

test("Parse de linhas simples no formato Telefone, Nome, Variáveis", () => {
  const input = `5511999991111, João Silva, 150.00, 15/09\n5511999992222, Maria Santos, 230.00, 18/09`;
  const result = parseRecipientsInput(input);
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].phone, "5511999991111");
  assert.strictEqual(result[0].name, "João Silva");
  assert.deepStrictEqual(result[0].variables, ["João Silva", "150.00", "15/09"]);
});

test("Parse de CSV com delimitador ponto e vírgula (;)", () => {
  const input = `47988887777; Carlos Ferreira; 500; Premium\n21977776666; Beatriz Costa; 100; Basic`;
  const result = parseRecipientsInput(input);
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].phone, "47988887777");
  assert.strictEqual(result[0].name, "Carlos Ferreira");
  assert.strictEqual(result[1].phone, "21977776666");
});

test("Ignorar linha de cabeçalho com 'Nome, Telefone'", () => {
  const input = `Nome, Telefone\nAna Lima, 11988884444\nBruno Souza, 11977773333`;
  const result = parseRecipientsInput(input);
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].name, "Ana Lima");
  assert.strictEqual(result[0].phone, "11988884444");
  assert.strictEqual(result[1].name, "Bruno Souza");
  assert.strictEqual(result[1].phone, "11977773333");
});

test("Parse com aspas e espaços extras", () => {
  const input = `"5511999998888", "Marcos Silva", "R$ 300,00"`;
  const result = parseRecipientsInput(input);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].phone, "5511999998888");
  assert.strictEqual(result[0].name, "Marcos Silva");
});

test("Linhas vazias ou inválidas devem ser ignoradas", () => {
  const input = `\n\n5511999990000, Teste\n   \n\n`;
  const result = parseRecipientsInput(input);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].phone, "5511999990000");
});

console.log(`\n📊 Resultado dos Testes: ${passed}/${total} passaram.`);
if (passed === total) {
  console.log("🎉 Todos os testes da ETAPA 4 foram aprovados com sucesso!");
} else {
  process.exit(1);
}
