const messageService = require("../services/messageService");

// Função para entrada de mensagem multilinha (similar ao promptForCityMessage)
async function promptForMessageContent(rl, currentContent = "") {
  console.log(
    "\nDigite o conteúdo da mensagem. Você pode colar várias linhas."
  );
  console.log('Digite "/end" em uma nova linha para finalizar.\n');

  const messageLines = [];

  while (true) {
    const line = await new Promise((resolve) => rl.question("> ", resolve));
    if (line.trim() === "/end") break;
    messageLines.push(line);
  }

  return messageLines.join("\n");
}

async function handleAddMessage(rl) {
  const messageTypes = messageService.getAvailableMessageTypes();
  const locales = messageService.getAvailableLocales();

  console.log("\n=== ADICIONAR NOVA MENSAGEM ===");

  // Escolher o tipo
  console.log("Tipos de mensagem disponíveis:");
  messageTypes.forEach((t, i) => console.log(`${i + 1}. ${t}`));
  const typeIndex = await new Promise((resolve) =>
    rl.question("Escolha o tipo (número): ", resolve)
  );
  const message_type = messageTypes[parseInt(typeIndex) - 1];

  // Escolher o locale
  console.log("\nLocales disponíveis:");
  locales.forEach((l, i) => console.log(`${i + 1}. ${l}`));
  const localeIndex = await new Promise((resolve) =>
    rl.question("Escolha o locale (número): ", resolve)
  );
  const locale = locales[parseInt(localeIndex) - 1];

  // Conteúdo da mensagem usando entrada multilinha
  const message_content = await promptForMessageContent(rl);

  if (!message_type || !locale || !message_content) {
    console.log("⚠ Dados inválidos. Operação cancelada.");
    return;
  }

  const result = await messageService.addMessage({
    locale,
    message_type,
    message_content,
  });

  console.log("✅ Mensagem adicionada com sucesso:", result);
}

async function handleListMessages() {
  const messages = await messageService.getMessages();
  console.log("\n=== LISTA DE MENSAGENS ===");
  messages.forEach((msg) =>
    console.log(
      `[${msg.id}] (${msg.locale} - ${msg.message_type}) => ${msg.message_content}`
    )
  );
}

async function handleEditMessage(rl) {
  const messages = await messageService.getMessages();
  if (!messages.length) {
    console.log("Nenhuma mensagem cadastrada.");
    return;
  }

  console.log("\nMensagens:");
  messages.forEach((msg) =>
    console.log(`[${msg.id}] (${msg.locale}/${msg.message_type})`)
  );

  const id = await new Promise((resolve) =>
    rl.question("Digite o ID da mensagem que deseja editar: ", resolve)
  );

  const existing = await messageService.getMessageById(id);
  if (!existing) {
    console.log("Mensagem não encontrada.");
    return;
  }

  // Usando entrada multilinha para edição também
  console.log(`\nConteúdo atual da mensagem:`);
  console.log(`"${existing.message_content}"`);
  const newContent = await promptForMessageContent(
    rl,
    existing.message_content
  );

  const success = await messageService.updateMessage(id, {
    locale: existing.locale,
    message_type: existing.message_type,
    message_content: newContent,
  });

  console.log(success ? "✅ Mensagem atualizada!" : "⚠ Erro ao atualizar.");
}

async function handleDeleteMessage(rl) {
  const id = await new Promise((resolve) =>
    rl.question("Digite o ID da mensagem a excluir: ", resolve)
  );
  const success = await messageService.deleteMessage(id);
  console.log(success ? "✅ Mensagem excluída." : "⚠ Erro ao excluir.");
}

async function handleShowLastMessage() {
  const last = await messageService.getLastMessage();
  if (!last) {
    console.log("Nenhuma mensagem encontrada.");
    return;
  }
  console.log(
    `Última mensagem (#${last.id} - ${last.locale}/${last.message_type}):\n${last.message_content}`
  );
}

module.exports = {
  handleAddMessage,
  handleListMessages,
  handleEditMessage,
  handleDeleteMessage,
  handleShowLastMessage,
};
