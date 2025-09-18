const messageService = require("../services/messageService");

// Versões originais para CLI
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

  let message_content;

  // Lógica especial para audio_invite
  if (message_type === "audio_invite") {
    console.log("\n🎵 === MENSAGEM DE ÁUDIO ===");
    console.log("📁 Pasta de áudios: data/audio/");
    console.log(
      "ℹ️  Coloque seu arquivo de áudio na pasta 'data/audio/' antes de continuar."
    );
    console.log("ℹ️  Digite apenas o nome do arquivo (ex: convite.mp3)");

    message_content = await new Promise((resolve) =>
      rl.question("Nome do arquivo de áudio: ", resolve)
    );
  } else {
    // Conteúdo da mensagem usando entrada multilinha (comportamento original)
    message_content = await promptForMessageContent(rl);
  }

  if (!message_type || !locale || !message_content) {
    console.log("⚠️ Dados inválidos. Operação cancelada.");
    return;
  }

  const result = await messageService.addMessage({
    locale,
    message_type,
    message_content,
  });

  if (message_type === "audio_invite") {
    console.log("✅ Mensagem de áudio adicionada com sucesso:", result);
    console.log(`🎵 Arquivo referenciado: data/audio/${message_content}`);
  } else {
    console.log("✅ Mensagem adicionada com sucesso:", result);
  }
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

  let newContent;

  // Lógica especial para edição de audio_invite
  if (existing.message_type === "audio_invite") {
    console.log("\n🎵 === EDITANDO MENSAGEM DE ÁUDIO ===");
    console.log(`Arquivo atual: ${existing.message_content}`);
    console.log("📁 Pasta de áudios: data/audio/");
    console.log(
      "ℹ️  Coloque seu novo arquivo de áudio na pasta 'data/audio/' antes de continuar."
    );
    console.log("ℹ️  Digite apenas o nome do arquivo (ex: novo_convite.mp3)");
    console.log("ℹ️  Ou pressione Enter para manter o arquivo atual");

    const input = await new Promise((resolve) =>
      rl.question("Nome do arquivo de áudio: ", resolve)
    );

    newContent = input.trim() || existing.message_content;
  } else {
    // Usando entrada multilinha para edição (comportamento original)
    console.log(`\nConteúdo atual da mensagem:`);
    console.log(`"${existing.message_content}"`);
    newContent = await promptForMessageContent(rl, existing.message_content);
  }

  const success = await messageService.updateMessage(id, {
    locale: existing.locale,
    message_type: existing.message_type,
    message_content: newContent,
  });

  if (success) {
    if (existing.message_type === "audio_invite") {
      console.log("✅ Mensagem de áudio atualizada!");
      console.log(`🎵 Novo arquivo referenciado: data/audio/${newContent}`);
    } else {
      console.log("✅ Mensagem atualizada!");
    }
  } else {
    console.log("⚠️ Erro ao atualizar.");
  }
}

async function handleDeleteMessage(rl) {
  const id = await new Promise((resolve) =>
    rl.question("Digite o ID da mensagem a excluir: ", resolve)
  );
  const success = await messageService.deleteMessage(id);
  console.log(success ? "✅ Mensagem excluída." : "⚠️ Erro ao excluir.");
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

// Função para verificar completude das mensagens (CLI)
async function handleCheckMessageCompleteness(rl) {
  try {
    console.log("\n📊 === VERIFICAÇÃO DE COMPLETUDE ===");
    console.log("1. Ver completude de todos os locales");
    console.log("2. Ver completude de um locale específico");

    const option = await new Promise((resolve) => {
      rl.question("Escolha uma opção (1 ou 2): ", resolve);
    });

    const report = await messageService.checkMessageCompleteness();

    if (option === "1") {
      // Mostrar todos os locales
      console.log("\n📊 Verificando completude de todos os locales...\n");

      // Exibir resumo geral
      console.log("=== RESUMO GERAL ===");
      console.log(`📝 Total de locales: ${report.summary.totalLocales}`);
      console.log(
        `📝 Total de tipos de mensagem: ${report.summary.totalMessageTypes}`
      );
      console.log(
        `📊 Mensagens esperadas: ${report.summary.totalExpectedMessages}`
      );
      console.log(
        `✅ Mensagens cadastradas: ${report.summary.totalExistingMessages}`
      );
      console.log(
        `📈 Completude geral: ${report.summary.completionPercentage.toFixed(
          1
        )}%`
      );

      // Exibir detalhes por locale
      console.log("\n=== DETALHES POR LOCALE ===");
      Object.entries(report.byLocale).forEach(([locale, data]) => {
        const status = data.percentage === 100 ? "✅" : "⚠️";
        console.log(
          `${status} ${locale}: ${data.existing}/${
            data.total
          } (${data.percentage.toFixed(1)}%)`
        );

        if (data.missing.length > 0) {
          console.log(`   Faltando: ${data.missing.join(", ")}`);
        }
      });

      // Exibir lista completa de faltantes se houver
      if (report.missing.length > 0) {
        console.log("\n=== MENSAGENS FALTANTES ===");
        report.missing.forEach(({ locale, messageType }) => {
          console.log(`❌ ${locale} -> ${messageType}`);
        });
        console.log(`\nTotal de mensagens faltantes: ${report.missing.length}`);
      } else {
        console.log(
          "\n🎉 Todas as mensagens estão cadastradas para todos os locales!"
        );
      }
    } else if (option === "2") {
      // Mostrar locale específico
      const locales = messageService.getAvailableLocales();

      console.log("\nLocales disponíveis:");
      locales.forEach((locale, index) => {
        console.log(`${index + 1}. ${locale}`);
      });

      const localeIndex = await new Promise((resolve) => {
        rl.question("Escolha o locale (número): ", resolve);
      });

      const selectedLocale = locales[parseInt(localeIndex) - 1];

      if (!selectedLocale) {
        console.log("❌ Opção inválida.");
        return;
      }

      const localeData = report.byLocale[selectedLocale];

      console.log(`\n📊 Verificando completude do locale: ${selectedLocale}\n`);

      // Estatísticas do locale
      console.log("=== ESTATÍSTICAS ===");
      console.log(`📝 Total de tipos de mensagem: ${localeData.total}`);
      console.log(`✅ Mensagens cadastradas: ${localeData.existing}`);
      console.log(`❌ Mensagens faltantes: ${localeData.missing.length}`);
      console.log(`📈 Completude: ${localeData.percentage.toFixed(1)}%`);

      // Lista detalhada dos faltantes
      if (localeData.missing.length > 0) {
        console.log("\n=== TIPOS DE MENSAGEM FALTANTES ===");
        localeData.missing.forEach((messageType) => {
          console.log(`❌ ${messageType}`);
        });
      } else {
        console.log(
          `\n🎉 Todas as mensagens estão cadastradas para o locale ${selectedLocale}!`
        );
      }
    } else {
      console.log("❌ Opção inválida.");
    }
  } catch (error) {
    console.error("❌ Erro ao verificar completude das mensagens:", error);
  }
}

module.exports = {
  handleAddMessage,
  handleListMessages,
  handleEditMessage,
  handleDeleteMessage,
  handleShowLastMessage,
  handleCheckMessageCompleteness,
};
