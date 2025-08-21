const messageService = require("../services/messageService");

// Versões originais para CLI (mantidas)
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

// =========================
// VERSÕES ADAPTADAS PARA GUI
// =========================

async function handleListMessagesGUI() {
  try {
    const messages = await messageService.getMessages();
    return {
      success: true,
      data: messages,
    };
  } catch (error) {
    console.error("Erro ao listar mensagens:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

async function handleAddMessageGUI(messageData) {
  try {
    const { locale, message_type, message_content } = messageData;

    if (!locale || !message_type || !message_content) {
      return {
        success: false,
        error: "Todos os campos são obrigatórios",
      };
    }

    const result = await messageService.addMessage({
      locale,
      message_type,
      message_content,
    });

    return {
      success: true,
      data: result,
      message: "Mensagem adicionada com sucesso",
    };
  } catch (error) {
    console.error("Erro ao adicionar mensagem:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

async function handleEditMessageGUI(id, messageData) {
  try {
    const { locale, message_type, message_content } = messageData;

    if (!locale || !message_type || !message_content) {
      return {
        success: false,
        error: "Todos os campos são obrigatórios",
      };
    }

    const existing = await messageService.getMessageById(id);
    if (!existing) {
      return {
        success: false,
        error: "Mensagem não encontrada",
      };
    }

    const success = await messageService.updateMessage(id, {
      locale,
      message_type,
      message_content,
    });

    if (success) {
      return {
        success: true,
        message: "Mensagem atualizada com sucesso",
      };
    } else {
      return {
        success: false,
        error: "Erro ao atualizar mensagem",
      };
    }
  } catch (error) {
    console.error("Erro ao editar mensagem:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

async function handleDeleteMessageGUI(id) {
  try {
    const success = await messageService.deleteMessage(id);

    if (success) {
      return {
        success: true,
        message: "Mensagem excluída com sucesso",
      };
    } else {
      return {
        success: false,
        error: "Mensagem não encontrada ou erro ao excluir",
      };
    }
  } catch (error) {
    console.error("Erro ao excluir mensagem:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

async function handleShowLastMessageGUI() {
  try {
    const last = await messageService.getLastMessage();

    if (!last) {
      return {
        success: false,
        error: "Nenhuma mensagem encontrada",
      };
    }

    return {
      success: true,
      data: last,
    };
  } catch (error) {
    console.error("Erro ao buscar última mensagem:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Função para obter tipos de mensagem e locales disponíveis
async function getAvailableOptionsGUI() {
  try {
    const messageTypes = messageService.getAvailableMessageTypes();
    const locales = messageService.getAvailableLocales();

    return {
      success: true,
      data: {
        messageTypes,
        locales,
      },
    };
  } catch (error) {
    console.error("Erro ao obter opções disponíveis:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  // Versões CLI (originais)
  handleAddMessage,
  handleListMessages,
  handleEditMessage,
  handleDeleteMessage,
  handleShowLastMessage,

  // Versões GUI (novas)
  handleListMessagesGUI,
  handleAddMessageGUI,
  handleEditMessageGUI,
  handleDeleteMessageGUI,
  handleShowLastMessageGUI,
  getAvailableOptionsGUI,
};
