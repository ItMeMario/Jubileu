// tests/testFlowExecutor.js
// Testes automatizados para validação do FlowService e FlowExecutor (Etapa 5)

const { FlowExecutor } = require("../client/flowExecutor");
const { flowService } = require("../services/flowService");
const { metaApiClient } = require("../client/metaApiClient");

console.log("==================================================");
console.log("🧪 INICIANDO TESTES DO MOTOR DE FLUXOS (ETAPA 5)");
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
// Mock do MetaApiClient para interceptar envios do bot
// ----------------------------------------------------
let lastSentMessage = null;
metaApiClient.sendInteractiveButtons = async (to, body, buttons, header, footer) => {
  lastSentMessage = { type: "interactive_buttons", to, body, buttons, header, footer };
  return { success: true, messageId: "wamid.MOCK_BTN_123" };
};

metaApiClient.sendInteractiveList = async (to, body, buttonTitle, sections, header, footer) => {
  lastSentMessage = { type: "interactive_list", to, body, buttonTitle, sections, header, footer };
  return { success: true, messageId: "wamid.MOCK_LIST_123" };
};

metaApiClient.sendTextMessage = async (to, text) => {
  lastSentMessage = { type: "text", to, text };
  return { success: true, messageId: "wamid.MOCK_TEXT_123" };
};

const executor = new FlowExecutor();
const testPhone = "5511999998888";

// ----------------------------------------------------
// TESTE 1: Início de Fluxo por Palavra-Chave (Gatilho)
// ----------------------------------------------------
console.log("--- 1. Testando Gatilho Inicial de Atendimento ---");
(async () => {
  // Mensagem inicial de saudação
  const msgOla = {
    from: testPhone,
    direction: "inbound",
    type: "text",
    body: "Olá, gostaria de ajuda",
  };

  const result1 = await executor.handleIncomingMessage(msgOla);
  assert(result1.handled === true, "Mensagem de saudação processada pelo executor");
  assert(lastSentMessage.type === "interactive_buttons", "Bot respondeu com Botões Interativos");
  assert(lastSentMessage.buttons.length === 3, "Menu inicial com 3 botões rápidos enviados");
  assert(executor.getActiveSessionCount() === 1, "Sessão ativa criada para o usuário");

  // ----------------------------------------------------
  // TESTE 2: Resposta por Clique em Botão (Quick Reply)
  // ----------------------------------------------------
  console.log("\n--- 2. Testando Clique em Botão de Resposta Rápida ---");
  const msgCliqueServicos = {
    from: testPhone,
    direction: "inbound",
    type: "interactive",
    interactiveType: "button_reply",
    buttonReply: { id: "btn_servicos", title: "Nossos Serviços" },
    body: "Nossos Serviços",
  };

  const result2 = await executor.handleIncomingMessage(msgCliqueServicos);
  assert(result2.handled === true, "Clique no botão 'btn_servicos' processado");
  assert(lastSentMessage.type === "interactive_list", "Bot avançou para o Menu de Lista de Catálogo");
  assert(lastSentMessage.buttonTitle === "Ver Soluções", "Título do botão da lista correto");

  // ----------------------------------------------------
  // TESTE 3: Seleção em Menu de Lista (List Reply)
  // ----------------------------------------------------
  console.log("\n--- 3. Testando Seleção em Menu de Lista ---");
  const msgCliqueLista = {
    from: testPhone,
    direction: "inbound",
    type: "interactive",
    interactiveType: "list_reply",
    listReply: { id: "row_chatbot", title: "Chatbot com IA" },
    body: "Chatbot com IA",
  };

  const result3 = await executor.handleIncomingMessage(msgCliqueLista);
  assert(result3.handled === true, "Seleção do item de lista 'row_chatbot' processada");
  assert(lastSentMessage.body.includes("Chatbot Interativo"), "Passo de detalhes do Chatbot executado");

  // ----------------------------------------------------
  // TESTE 4: Fallback Inteligente por Digitação de Texto
  // ----------------------------------------------------
  console.log("\n--- 4. Testando Fallback Textual Inteligente ---");
  // O passo atual tem os botões: [btn_voltar_menu: 'Voltar ao Menu', btn_falar_humano: 'Falar com Atendente']
  // Usuário digita '2' em vez de clicar
  const msgDigitouNumero = {
    from: testPhone,
    direction: "inbound",
    type: "text",
    body: "2",
  };

  const result4 = await executor.handleIncomingMessage(msgDigitouNumero);
  assert(result4.handled === true, "Digitação '2' resolvida para o botão 'Falar com Atendente'");
  assert(lastSentMessage.type === "text", "Bot enviou mensagem de texto final de atendente humano");
  assert(lastSentMessage.text.includes("especialistas foi notificado"), "Texto do atendente correto");

  // ----------------------------------------------------
  // TESTE 5: Encerramento de Sessão ao Fim do Fluxo
  // ----------------------------------------------------
  console.log("\n--- 5. Testando Encerramento da Sessão ---");
  assert(executor.getActiveSessionCount() === 0, "Sessão encerrada após atingir nó final");

  console.log("\n==================================================");
  console.log(`📊 RESULTADO DOS TESTES: ${passedTests}/${totalTests} testes passaram com sucesso!`);
  console.log("==================================================");

  if (passedTests === totalTests) {
    console.log("🎉 Todos os testes do Motor de Fluxos foram concluídos com êxito!\n");
    process.exit(0);
  } else {
    process.exit(1);
  }
})();
