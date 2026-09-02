// tests/testFlowBuilderCrud.js
// Testes automatizados para validação do CRUD e integridade do Flow Builder (Etapas 1-4)

const { flowService } = require("../services/flowService");

console.log("==================================================");
console.log("🧪 TESTES DO CONSTRUTOR DE FLUXOS (FLOW BUILDER)");
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
// TESTE 1: Criação de Novo Fluxo em Branco
// ----------------------------------------------------
console.log("--- 1. Testando Criação de Fluxo em Branco ---");
const initialCount = flowService.getAllFlows().length;
const newFlow = flowService.createEmptyFlow("Fluxo de Vendas e Suporte");

assert(newFlow && newFlow.id.startsWith("flow_"), "ID único de fluxo gerado com sucesso");
assert(newFlow.name === "Fluxo de Vendas e Suporte", "Nome do fluxo configurado");
assert(newFlow.steps.step_1.type === "interactive_buttons", "Passo inicial com botões criado");
assert(flowService.getAllFlows().length === initialCount + 1, "Fluxo persistido na lista");

// ----------------------------------------------------
// TESTE 2: Edição e Adição de Novos Passos
// ----------------------------------------------------
console.log("\n--- 2. Testando Edição de Nós e Estrutura ---");
newFlow.triggerKeywords = ["comprar", "preco", "planos"];
newFlow.steps.step_1.buttons = [
  { id: "btn_planos", title: "Ver Planos", nextStepId: "step_lista_planos" },
  { id: "btn_suporte", title: "Suporte", nextStepId: "step_suporte" },
];

// Adiciona um passo do tipo Lista
newFlow.steps.step_lista_planos = {
  id: "step_lista_planos",
  type: "interactive_list",
  body: "Selecione o plano desejado:",
  buttonTitle: "Catálogo",
  sections: [
    {
      title: "Planos",
      rows: [
        { id: "row_basic", title: "Basic", description: "Plano Individual", nextStepId: null },
        { id: "row_pro", title: "Pro", description: "Plano Empresarial", nextStepId: null },
      ],
    },
  ],
};

// Adiciona um passo de Texto
newFlow.steps.step_suporte = {
  id: "step_suporte",
  type: "text",
  body: "Aguarde um momento que nosso time entrará em contato!",
  nextStepId: null,
};

flowService.saveFlow(newFlow);
const reloadedFlow = flowService.getFlowById(newFlow.id);

assert(Object.keys(reloadedFlow.steps).length === 3, "3 passos estruturados e salvos no fluxo");
assert(reloadedFlow.steps.step_lista_planos.type === "interactive_list", "Passo de Lista salvo");
assert(reloadedFlow.steps.step_suporte.type === "text", "Passo de Texto salvo");

// ----------------------------------------------------
// TESTE 3: Duplicação de Fluxo
// ----------------------------------------------------
console.log("\n--- 3. Testando Duplicação de Fluxo ---");
const duplicated = flowService.duplicateFlow(newFlow.id);

assert(duplicated !== null, "Fluxo duplicado com sucesso");
assert(duplicated.id !== newFlow.id, "ID do fluxo duplicado é diferente do original");
assert(duplicated.name.includes("(Cópia)"), "Nome do fluxo duplicado contém o sufixo (Cópia)");
assert(Object.keys(duplicated.steps).length === 3, "Todos os 3 passos foram clonados");

// ----------------------------------------------------
// TESTE 4: Chaveamento de Fluxo Ativo
// ----------------------------------------------------
console.log("\n--- 4. Testando Ativação de Fluxo ---");
flowService.setActiveFlow(newFlow.id);
assert(flowService.getActiveFlow().id === newFlow.id, "Novo fluxo marcado como ativo");

// ----------------------------------------------------
// TESTE 5: Exclusão de Fluxo com Fallback
// ----------------------------------------------------
console.log("\n--- 5. Testando Exclusão de Fluxos ---");
const delSuccess1 = flowService.deleteFlow(duplicated.id);
assert(delSuccess1 === true, "Cópia do fluxo excluída com sucesso");

const delSuccess2 = flowService.deleteFlow(newFlow.id);
assert(delSuccess2 === true, "Fluxo original excluído com sucesso");
assert(flowService.getActiveFlow() !== null, "Fallback de fluxo ativo continua funcionando");

console.log("\n==================================================");
console.log(`📊 RESULTADO DOS TESTES: ${passedTests}/${totalTests} testes passaram com sucesso!`);
console.log("==================================================");

if (passedTests === totalTests) {
  console.log("🎉 Testes do Flow Builder concluídos com 100% de êxito!\n");
  process.exit(0);
} else {
  process.exit(1);
}
