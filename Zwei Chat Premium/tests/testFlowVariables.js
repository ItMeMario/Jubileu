// tests/testFlowVariables.js
// Teste automatizado para validação de Variáveis Dinâmicas e Contexto de Sessão (Etapa 1)

const { FlowExecutor } = require("../client/flowExecutor");
const { flowService } = require("../services/flowService");
const { metaApiClient } = require("../client/metaApiClient");

console.log("==================================================");
console.log("🧪 TESTE: VARIÁVEIS DINÂMICAS E CONTEXTO DE SESSÃO");
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

// Interceptador de mensagens enviadas
let sentMessages = [];
metaApiClient.sendInteractiveButtons = async (to, body, buttons, header, footer) => {
  const msg = { type: "interactive_buttons", to, body, buttons, header, footer };
  sentMessages.push(msg);
  return { success: true, messageId: `wamid.MOCK_BTN_${Date.now()}` };
};

metaApiClient.sendInteractiveList = async (to, body, buttonTitle, sections, header, footer) => {
  const msg = { type: "interactive_list", to, body, buttonTitle, sections, header, footer };
  sentMessages.push(msg);
  return { success: true, messageId: `wamid.MOCK_LIST_${Date.now()}` };
};

metaApiClient.sendTextMessage = async (to, text) => {
  const msg = { type: "text", to, text };
  sentMessages.push(msg);
  return { success: true, messageId: `wamid.MOCK_TEXT_${Date.now()}` };
};

const executor = new FlowExecutor();
const testPhone = "5511988887777";

// Define um fluxo específico com Cidades, Horários e Mensagem Final com Amarração de Variáveis
const testFlow = {
  id: "flow_test_cidades_horarios",
  name: "Fluxo Teste Cidades e Horários",
  isActive: true,
  triggerKeywords: ["oi", "menu", "quero participar"],
  initialStepId: "step_cidades",
  steps: {
    step_cidades: {
      id: "step_cidades",
      variableName: "cidade",
      type: "interactive_buttons",
      header: "Seleção de Cidade",
      body: "Olá! Qual cidade você deseja participar?",
      buttons: [
        {
          id: "btn_sp",
          title: "São Paulo",
          link: "https://chat.whatsapp.com/SP_GRUPO_OFICIAL",
          nextStepId: "step_horarios",
        },
        {
          id: "btn_rj",
          title: "Rio de Janeiro",
          link: "https://chat.whatsapp.com/RJ_GRUPO_OFICIAL",
          nextStepId: "step_horarios",
        },
      ],
    },
    step_horarios: {
      id: "step_horarios",
      variableName: "horario",
      type: "interactive_buttons",
      header: "Cidade: {{cidade}}",
      body: "Ótimo! Para {{cidade}}, escolha o horário:",
      buttons: [
        { id: "btn_h12", title: "12:00", nextStepId: "step_confirmacao" },
        { id: "btn_h18", title: "18:00", nextStepId: "step_confirmacao" },
      ],
    },
    step_confirmacao: {
      id: "step_confirmacao",
      type: "text",
      body: "🎉 Perfeito! Você escolheu a cidade de {{cidade}} para o horário de {{horario}}.\n\nSeu telefone registrado: {{telefone}}\nEntre no grupo do WhatsApp: {{link}}",
      nextStepId: null,
    },
  },
};

// Registra temporariamente o fluxo no flowService
flowService.saveFlow(testFlow);
flowService.setActiveFlow(testFlow.id);

(async () => {
  // 1. Iniciar Fluxo
  console.log("--- 1. Iniciando fluxo com 'Oi' ---");
  await executor.handleIncomingMessage({
    from: testPhone,
    direction: "inbound",
    type: "text",
    body: "Oi",
  });

  const msg1 = sentMessages[sentMessages.length - 1];
  assert(msg1.type === "interactive_buttons", "Bot enviou menu inicial de cidades");
  assert(msg1.buttons.length === 2, "Menu possui os botões de São Paulo e Rio");

  // 2. Escolher São Paulo
  console.log("\n--- 2. Cliente escolhe 'São Paulo' ---");
  await executor.handleIncomingMessage({
    from: testPhone,
    direction: "inbound",
    type: "interactive",
    interactiveType: "button_reply",
    buttonReply: { id: "btn_sp", title: "São Paulo" },
    body: "São Paulo",
  });

  const contextAfterCity = executor.getSessionContext(testPhone);
  assert(contextAfterCity.cidade === "São Paulo", "Variável 'cidade' gravada como 'São Paulo'");
  assert(
    contextAfterCity.link === "https://chat.whatsapp.com/SP_GRUPO_OFICIAL",
    "Variável 'link' gravada com o link do grupo de São Paulo"
  );

  const msg2 = sentMessages[sentMessages.length - 1];
  assert(msg2.header === "Cidade: São Paulo", "Cabeçalho do passo 2 interpolou {{cidade}}");
  assert(
    msg2.body.includes("Para São Paulo, escolha o horário"),
    "Mensagem do passo 2 interpolou {{cidade}}"
  );

  // 3. Escolher Horário de 12:00
  console.log("\n--- 3. Cliente escolhe horário '12:00' ---");
  await executor.handleIncomingMessage({
    from: testPhone,
    direction: "inbound",
    type: "interactive",
    interactiveType: "button_reply",
    buttonReply: { id: "btn_h12", title: "12:00" },
    body: "12:00",
  });

  const msg3 = sentMessages[sentMessages.length - 1];
  assert(msg3.type === "text", "Bot enviou mensagem final de confirmação");
  assert(
    msg3.text.includes("Você escolheu a cidade de São Paulo para o horário de 12:00"),
    "Mensagem final amarrou com sucesso {{cidade}} e {{horario}}"
  );
  assert(
    msg3.text.includes("https://chat.whatsapp.com/SP_GRUPO_OFICIAL"),
    "Mensagem final incluiu o {{link}} do grupo correto"
  );
  assert(
    msg3.text.includes("5511988887777"),
    "Mensagem final interpolou o {{telefone}} do cliente"
  );

  // 4. Teste de Fluxo com Rio de Janeiro (Garante que os dados mudam dinamicamente para outro contato)
  console.log("\n--- 4. Testando para outro cliente que escolhe 'Rio de Janeiro' e '18:00' ---");
  const phoneRJ = "5521977776666";

  await executor.handleIncomingMessage({
    from: phoneRJ,
    direction: "inbound",
    type: "text",
    body: "Quero participar",
  });

  await executor.handleIncomingMessage({
    from: phoneRJ,
    direction: "inbound",
    type: "interactive",
    interactiveType: "button_reply",
    buttonReply: { id: "btn_rj", title: "Rio de Janeiro" },
    body: "Rio de Janeiro",
  });

  await executor.handleIncomingMessage({
    from: phoneRJ,
    direction: "inbound",
    type: "interactive",
    interactiveType: "button_reply",
    buttonReply: { id: "btn_h18", title: "18:00" },
    body: "18:00",
  });

  const msgFinalRJ = sentMessages[sentMessages.length - 1];
  assert(
    msgFinalRJ.text.includes("Você escolheu a cidade de Rio de Janeiro para o horário de 18:00"),
    "Mensagem final amarrou Cidade do Rio e horário 18:00"
  );
  assert(
    msgFinalRJ.text.includes("https://chat.whatsapp.com/RJ_GRUPO_OFICIAL"),
    "Mensagem final incluiu o {{link}} do grupo do Rio de Janeiro"
  );

  // 5. Teste de Flexibilidade White-Label (Transformar qualquer palavra em variável)
  console.log("\n--- 5. Testando Flexibilidade White-Label ({{pais}}, {{estado}}, {{curso}}, {{plano}}) ---");
  const whiteLabelFlow = {
    id: "flow_test_whitelabel",
    name: "Fluxo White-Label Flexível",
    isActive: true,
    triggerKeywords: ["curso", "matricula"],
    initialStepId: "step_pais",
    steps: {
      step_pais: {
        id: "step_pais",
        variableName: "pais",
        type: "interactive_buttons",
        body: "Qual é o seu país de origem?",
        buttons: [
          { id: "btn_br", title: "Brasil", nextStepId: "step_estado" },
          { id: "btn_pt", title: "Portugal", nextStepId: "step_estado" },
        ],
      },
      step_estado: {
        id: "step_estado",
        variableName: "estado",
        type: "interactive_buttons",
        body: "Você mora em {{pais}}. Qual o seu estado/região?",
        buttons: [
          { id: "btn_est_1", title: "São Paulo", nextStepId: "step_curso" },
          { id: "btn_est_2", title: "Lisboa", nextStepId: "step_curso" },
        ],
      },
      step_curso: {
        id: "step_curso",
        variableName: "curso",
        type: "interactive_buttons",
        body: "Qual curso você deseja fazer?",
        buttons: [
          { id: "btn_cur_1", title: "Marketing Digital", nextStepId: "step_resumo" },
        ],
      },
      step_resumo: {
        id: "step_resumo",
        type: "text",
        body: "Matrícula confirmada para o curso de {{curso}}!\nPaís: {{pais}} | Estado: {{estado}}",
        nextStepId: null,
      },
    },
  };

  flowService.saveFlow(whiteLabelFlow);
  flowService.setActiveFlow(whiteLabelFlow.id);

  const phoneWL = "5511911112222";
  await executor.handleIncomingMessage({ from: phoneWL, direction: "inbound", type: "text", body: "curso" });
  await executor.handleIncomingMessage({
    from: phoneWL,
    direction: "inbound",
    type: "interactive",
    interactiveType: "button_reply",
    buttonReply: { id: "btn_br", title: "Brasil" },
    body: "Brasil",
  });
  await executor.handleIncomingMessage({
    from: phoneWL,
    direction: "inbound",
    type: "interactive",
    interactiveType: "button_reply",
    buttonReply: { id: "btn_est_1", title: "São Paulo" },
    body: "São Paulo",
  });
  await executor.handleIncomingMessage({
    from: phoneWL,
    direction: "inbound",
    type: "interactive",
    interactiveType: "button_reply",
    buttonReply: { id: "btn_cur_1", title: "Marketing Digital" },
    body: "Marketing Digital",
  });

  const msgWLFinal = sentMessages[sentMessages.length - 1];
  assert(msgWLFinal.text.includes("curso de Marketing Digital"), "Variável customizada {{curso}} interpolada");
  assert(msgWLFinal.text.includes("País: Brasil"), "Variável customizada {{pais}} interpolada");
  assert(msgWLFinal.text.includes("Estado: São Paulo"), "Variável customizada {{estado}} interpolada");

  // Remove os fluxos de teste após execução
  flowService.deleteFlow(testFlow.id);
  flowService.deleteFlow(whiteLabelFlow.id);

  console.log("\n==================================================");
  console.log(`📊 RESULTADO DOS TESTES: ${passedTests}/${totalTests} testes passaram com sucesso!`);
  console.log("==================================================");

  if (passedTests === totalTests) {
    console.log("🎉 SISTEMA WHITE-LABEL DE VARIÁVEIS 100% VALIDADO!\n");
    process.exit(0);
  } else {
    process.exit(1);
  }
})();
