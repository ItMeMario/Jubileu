// tests/testFullE2EWorkflow.js
// Teste de Integração de Ponta a Ponta (E2E) - Validação Global do Zwei Chat Premium (Etapa 7)

const crypto = require("crypto");
const metaConfig = require("../config/metaConfig");
const { metaApiClient } = require("../client/metaApiClient");
const { metaAccountService } = require("../services/metaAccountService");
const { verifyMetaSignature, normalizeIncomingMessage } = require("../firebase-backend/index");
const { window24hService } = require("../services/window24hService");
const { syncService } = require("../services/syncService");
const { metaTemplateService } = require("../services/metaTemplateService");
const { metaBroadcastService } = require("../services/metaBroadcastService");
const { broadcastHistoryService } = require("../services/broadcastHistoryService");
const { FlowExecutor } = require("../client/flowExecutor");
const { botIntegrationService } = require("../services/botIntegrationService");

console.log("==================================================");
console.log("🌟 TESTE DE INTEGRAÇÃO GLOBAL E2E (ETAPA 7)");
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

(async () => {
  // 1. Configuração e Diagnóstico
  console.log("--- 1. Validando Configurações e Diagnóstico de Conta ---");
  metaConfig.updateConfig({
    phoneNumberId: "123456789",
    wabaId: "987654321",
    accessToken: "token_e2e_valido",
    appSecret: "secret_e2e_123",
    verifyToken: "verify_token_e2e",
  });

  metaApiClient.getPhoneNumberDetails = async () => ({
    success: true,
    data: {
      display_phone_number: "+55 11 99999-8888",
      verified_name: "Zwei Chat Empresa Oficial",
      quality_rating: "GREEN",
      code_verification_status: "VERIFIED",
      messaging_limit_tier: "TIER_10K",
    },
  });

  const healthRes = await metaAccountService.checkConnectionStatus();
  assert(healthRes.success === true, "Diagnóstico da conta Meta validado com sucesso");
  assert(healthRes.data.qualityRating === "GREEN", "Quality rating identificado como GREEN");
  assert(healthRes.data.messagingLimitTier === "TIER_10K", "Messaging limit tier TIER_10K identificado");

  // 2. Webhook & Handshake
  console.log("\n--- 2. Validando Webhook e Segurança HMAC ---");
  const rawBody = JSON.stringify({ object: "whatsapp_business_account" });
  const hmac = crypto.createHmac("sha256", "secret_e2e_123").update(rawBody).digest("hex");
  const sig = `sha256=${hmac}`;

  assert(verifyMetaSignature(rawBody, sig, "secret_e2e_123") === true, "Assinatura HMAC validada");

  // 3. Sincronização e Janela de 24 Horas
  console.log("\n--- 3. Validando Sincronização em Tempo Real e Janela de 24h ---");
  const testContact = "5511977778888";
  assert(window24hService.checkWindow(testContact).isOpen === false, "Janela inicia fechada");

  // Simula chegada de mensagem do cliente
  const incomingMsg = {
    id: "wamid.E2E_01",
    from: testContact,
    direction: "inbound",
    timestamp: Date.now(),
    type: "text",
    body: "Olá, quero suporte",
  };

  window24hService.recordInboundInteraction(testContact, incomingMsg.timestamp);
  assert(window24hService.checkWindow(testContact).isOpen === true, "Janela de 24h aberta após mensagem");
  assert(window24hService.canSendFreeForm(testContact).allowed === true, "Envio livre autorizado dentro da janela");

  // 4. Execução do Chatbot com Botões Interativos
  console.log("\n--- 4. Validando Jornada Completa do Chatbot com Botões e Listas ---");
  const flowExecutor = new FlowExecutor();
  let botDispatchedPayload = null;

  metaApiClient.sendInteractiveButtons = async (to, body, buttons) => {
    botDispatchedPayload = { type: "buttons", to, buttons };
    return { success: true, messageId: "wamid.BTN_E2E" };
  };

  metaApiClient.sendInteractiveList = async (to, body, buttonTitle, sections) => {
    botDispatchedPayload = { type: "list", to, sections };
    return { success: true, messageId: "wamid.LIST_E2E" };
  };

  // 4.1 Início do fluxo
  const botRes1 = await flowExecutor.handleIncomingMessage(incomingMsg);
  assert(botRes1.handled === true, "Bot processou saudação inicial");
  assert(botDispatchedPayload.type === "buttons", "Bot respondeu com Botões de Resposta Rápida");

  // 4.2 Clique em botão
  const buttonClickMsg = {
    id: "wamid.E2E_02",
    from: testContact,
    direction: "inbound",
    type: "interactive",
    interactiveType: "button_reply",
    buttonReply: { id: "btn_servicos", title: "Nossos Serviços" },
    body: "Nossos Serviços",
  };
  const botRes2 = await flowExecutor.handleIncomingMessage(buttonClickMsg);
  assert(botRes2.handled === true, "Clique em botão processado pelo bot");
  assert(botDispatchedPayload.type === "list", "Bot avançou para o Menu de Lista de Serviços");

  // 5. Templates e Disparador em Lote
  console.log("\n--- 5. Validando Templates e Disparador em Lote ---");
  metaTemplateService.templates = [
    {
      id: "tmpl_e2e",
      name: "confirmacao_pedido",
      status: "APPROVED",
      category: "UTILITY",
      language: "pt_BR",
      components: {
        body: {
          text: "Olá {{1}}, seu pedido #{{2}} foi confirmado!",
          variables: ["1", "2"],
        },
      },
    },
  ];

  metaApiClient.sendTemplateMessage = async (to, templateName, lang, components) => {
    return { success: true, messageId: `wamid.BROADCAST_${to}` };
  };

  const broadcastRes = await metaBroadcastService.startBroadcast({
    campaignId: "campanha_e2e_final",
    templateName: "confirmacao_pedido",
    recipients: [
      { phone: "5511999991111", name: "Cliente A", variables: ["Cliente A", "1001"] },
      { phone: "5511999992222", name: "Cliente B", variables: ["Cliente B", "1002"] },
    ],
    delayBetweenMs: 5,
  });

  assert(broadcastRes.total === 2, "Disparador processou 2 contatos");
  assert(broadcastRes.sent === 2, "2 mensagens enviadas com sucesso no lote");

  // Salva no histórico e exporta CSV
  broadcastHistoryService.saveCampaignResult(broadcastRes);
  const csvData = broadcastHistoryService.exportCampaignLogsToCsv("campanha_e2e_final");
  assert(csvData.includes("Cliente A") && csvData.includes("ENVIADO"), "Relatório CSV gerado corretamente");

  console.log("\n==================================================");
  console.log(`📊 RESULTADO DOS TESTES E2E: ${passedTests}/${totalTests} testes passaram com sucesso!`);
  console.log("==================================================");

  if (passedTests === totalTests) {
    console.log("🎉 VALIDAÇÃO GLOBAL DE PONTA A PONTA CONCLUÍDA COM 100% DE ÊXITO!\n");
    process.exit(0);
  } else {
    process.exit(1);
  }
})();
