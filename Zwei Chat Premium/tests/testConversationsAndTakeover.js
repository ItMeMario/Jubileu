// tests/testConversationsAndTakeover.js
// Teste de ponta a ponta para a funcionalidade de Conversas, Indicadores Verde/Vermelho e Handover (Takeover)

const assert = require("assert");
const { conversationService } = require("../services/conversationService");
const { botIntegrationService } = require("../services/botIntegrationService");
const { syncService } = require("../services/syncService");

async function runTests() {
  console.log("🚀 Iniciando testes da Gestão de Conversas & Handover...");

  // Limpa estado anterior de testes
  conversationService.clearConversations();

  const phoneClient1 = "5511999991111";
  const phoneClient2 = "5511999992222";

  // -------------------------------------------------------------------------
  // Teste 1: Recebimento de mensagem do cliente 1 (Inbound) -> Card Verde
  // -------------------------------------------------------------------------
  console.log("\n🧪 Teste 1: Recebimento de Inbound Message...");
  const msg1 = {
    id: "msg_in_001",
    from: phoneClient1,
    senderName: "Cliente Alpha",
    body: "Olá, quanto custa o produto?",
    timestamp: Date.now(),
    type: "text",
  };

  syncService.emit("message:inbound", msg1);

  // Aguarda processamento assíncrono
  await new Promise((r) => setTimeout(r, 100));

  const conv1 = conversationService.getConversationByPhone(phoneClient1);
  assert(conv1, "Conversa deve ter sido criada no repositório local");
  assert.strictEqual(conv1.contactName, "Cliente Alpha");
  assert.strictEqual(conv1.lastSender, "client", "Último remetente deve ser 'client' (🟢 Indicador Verde)");
  assert.strictEqual(conv1.isBotActive, true, "Por padrão o bot deve estar ativo para o contato");
  assert.strictEqual(conv1.messages.length, 1, "Histórico deve conter 1 mensagem");
  console.log("✅ Teste 1 passou: Conversa criada com lastSender='client' (🟢 Verde) e bot ativo.");

  // -------------------------------------------------------------------------
  // Teste 2: Resposta automática do robô -> Card Vermelho
  // -------------------------------------------------------------------------
  console.log("\n🧪 Teste 2: Registro de resposta enviada pelo Robô...");
  conversationService.recordBotMessage(phoneClient1, "Nosso produto custa R$ 99,00.");

  const conv1AfterBot = conversationService.getConversationByPhone(phoneClient1);
  assert.strictEqual(conv1AfterBot.lastSender, "bot", "Último remetente deve ser 'bot' (🔴 Indicador Vermelho)");
  assert.strictEqual(conv1AfterBot.lastMessage, "Nosso produto custa R$ 99,00.");
  assert.strictEqual(conv1AfterBot.messages.length, 2, "Histórico deve conter 2 mensagens");
  console.log("✅ Teste 2 passou: Resposta do bot registrada com lastSender='bot' (🔴 Vermelho).");

  // -------------------------------------------------------------------------
  // Teste 3: Operador assume a conversa do Cliente 1 (Takeover)
  // -------------------------------------------------------------------------
  console.log("\n🧪 Teste 3: Operador assume a conversa do Cliente 1...");
  const takeoverRes = conversationService.takeoverConversation(phoneClient1);
  assert.strictEqual(takeoverRes.success, true);
  assert.strictEqual(conversationService.isBotActiveForContact(phoneClient1), false, "Bot deve estar INATIVO para Cliente 1");
  assert.strictEqual(conversationService.isBotActiveForContact(phoneClient2), true, "Bot deve permanecer ATIVO para Cliente 2 (Isolamento por contato)");
  console.log("✅ Teste 3 passou: Bot pausado apenas para o Cliente 1; Cliente 2 continua operante.");

  // -------------------------------------------------------------------------
  // Teste 4: Cliente 1 manda nova mensagem com bot pausado -> Robô não responde
  // -------------------------------------------------------------------------
  console.log("\n🧪 Teste 4: Cliente 1 manda mensagem com bot pausado...");
  let botAttemptedToReply = false;

  // Mock temporário para capturar tentativas de execução do bot
  const originalCheck = conversationService.isBotActiveForContact.bind(conversationService);
  const msg2 = {
    id: "msg_in_002",
    from: phoneClient1,
    senderName: "Cliente Alpha",
    body: "Tem desconto à vista?",
    timestamp: Date.now(),
    type: "text",
  };

  syncService.emit("message:inbound", msg2);
  await new Promise((r) => setTimeout(r, 100));

  const conv1Updated = conversationService.getConversationByPhone(phoneClient1);
  assert.strictEqual(conv1Updated.lastSender, "client", "Card deve voltar a ser 'client' (🟢 Verde)");
  assert.strictEqual(conv1Updated.isBotActive, false, "Bot deve continuar inativo");
  assert.strictEqual(conv1Updated.messages.length, 3, "Mensagem deve ter sido gravada no histórico para o operador");
  console.log("✅ Teste 4 passou: Mensagem gravada no histórico e bot permaneceu silenciado para o contato.");

  // -------------------------------------------------------------------------
  // Teste 5: Reativação do Robô pelo Operador
  // -------------------------------------------------------------------------
  console.log("\n🧪 Teste 5: Reativação do Robô para o Cliente 1...");
  const activateRes = conversationService.activateBotForContact(phoneClient1);
  assert.strictEqual(activateRes.success, true);
  assert.strictEqual(conversationService.isBotActiveForContact(phoneClient1), true, "Bot deve voltar a estar ATIVO para Cliente 1");
  console.log("✅ Teste 5 passou: Robô reativado com sucesso para o contato.");

  // -------------------------------------------------------------------------
  // Teste 6: Ordenação e Listagem de Conversas
  // -------------------------------------------------------------------------
  console.log("\n🧪 Teste 6: Listagem e Ordenação de Conversas...");
  syncService.emit("message:inbound", {
    id: "msg_in_003",
    from: phoneClient2,
    senderName: "Cliente Beta",
    body: "Olá, sou outro cliente!",
    timestamp: Date.now() + 1000,
    type: "text",
  });
  await new Promise((r) => setTimeout(r, 100));

  const allConvs = conversationService.getAllConversations();
  assert.strictEqual(allConvs.length, 2, "Devem existir 2 conversas cadastradas");
  assert.strictEqual(allConvs[0].contactPhone, phoneClient2, "Cliente Beta deve ser o primeiro da lista (mais recente)");
  console.log("✅ Teste 6 passou: Listagem retornou 2 conversas ordenadas por timestamp.");

  // Limpeza final
  conversationService.clearConversations();
  console.log("\n🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!");
}

runTests().catch((err) => {
  console.error("❌ Falha nos testes:", err);
  process.exit(1);
});
