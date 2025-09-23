const { 
  listDroneMessages, 
  addNumbersToList, 
  showNumbersList, 
  clearNumbersList,
  executeDroneDispatch 
} = require("../controllers/droneController");

async function handleDroneMenu(rl) {
  console.clear();
  console.log("╔══════════════════════════════════════╗");
  console.log("║           🚁 MENU DRONE              ║");
  console.log("╚══════════════════════════════════════╝");
  
  let continueMenu = true;
  
  while (continueMenu) {
    console.log("\n📋 Opções disponíveis:");
    console.log("1. Listar mensagens disponíveis");
    console.log("2. Adicionar números para disparo");
    console.log("3. Ver lista atual de números");
    console.log("4. Limpar lista de números");
    console.log("5. Executar disparo de drone");
    console.log("0. Voltar ao menu principal");
    console.log("─".repeat(40));
    
    const choice = await new Promise((resolve) => {
      rl.question("Escolha uma opção: ", resolve);
    });
    
    const option = choice.trim();
    
    try {
      switch (option) {
        case "1":
          await handleListMessages();
          break;
          
        case "2":
          await handleAddNumbers(rl);
          break;
          
        case "3":
          await handleShowNumbers();
          break;
          
        case "4":
          await handleClearNumbers(rl);
          break;
          
        case "5":
          await handleExecuteDispatch(rl);
          break;
          
        case "0":
          console.log("🔙 Voltando ao menu principal...");
          continueMenu = false;
          break;
          
        default:
          console.log("❌ Opção inválida! Tente novamente.");
          break;
      }
    } catch (error) {
      console.error("❌ Erro:", error.message);
      console.log("Pressione Enter para continuar...");
      await new Promise((resolve) => rl.question("", resolve));
    }
    
    if (continueMenu && option !== "0") {
      console.log("\nPressione Enter para continuar...");
      await new Promise((resolve) => rl.question("", resolve));
      console.clear();
      console.log("╔══════════════════════════════════════╗");
      console.log("║           🚁 MENU DRONE              ║");
      console.log("╚══════════════════════════════════════╝");
    }
  }
}

async function handleListMessages() {
  console.log("\n📝 Mensagens disponíveis para drone:");
  console.log("─".repeat(50));
  
  try {
    const messages = await listDroneMessages();
    
    if (messages.length === 0) {
      console.log("📭 Nenhuma mensagem drone encontrada no banco de dados.");
      return;
    }
    
    messages.forEach((msg, index) => {
      console.log(`\n${index + 1}. ID: ${msg.id}`);
      console.log(`   📍 Locale: ${msg.locale}`);
      console.log(`   📅 Criada em: ${new Date(msg.created_at).toLocaleString('pt-BR')}`);
      console.log(`   💬 Conteúdo:`);
      console.log(`   "${msg.message_content}"`);
      console.log("─".repeat(30));
    });
    
  } catch (error) {
    console.error("❌ Erro ao buscar mensagens:", error.message);
  }
}

async function handleAddNumbers(rl) {
  console.log("\n📞 Adicionar números para disparo:");
  console.log("─".repeat(40));
  console.log("💡 Formatos aceitos:");
  console.log("   • 47999999999");
  console.log("   • +5547999999999");
  console.log("   • (47) 99999-9999");
  console.log("   • 47 99999-9999");
  console.log("\n📝 Digite os números separados por vírgula ou um por linha:");
  console.log("(Digite 'fim' para finalizar)");
  
  let numbers = [];
  let inputLine = "";
  
  while (true) {
    const input = await new Promise((resolve) => {
      rl.question("Número(s): ", resolve);
    });
    
    if (input.trim().toLowerCase() === "fim") {
      break;
    }
    
    if (input.trim()) {
      // Se contém vírgula, split por vírgula
      if (input.includes(',')) {
        const numbersFromInput = input.split(',').map(n => n.trim()).filter(n => n);
        numbers = numbers.concat(numbersFromInput);
      } else {
        numbers.push(input.trim());
      }
    }
  }
  
  if (numbers.length > 0) {
    try {
      const result = await addNumbersToList(numbers);
      console.log(`\n✅ ${result.added} números adicionados com sucesso!`);
      if (result.invalid.length > 0) {
        console.log(`⚠️ ${result.invalid.length} números inválidos foram ignorados:`);
        result.invalid.forEach(num => console.log(`   • ${num}`));
      }
      console.log(`📊 Total de números na lista: ${result.totalCount}`);
    } catch (error) {
      console.error("❌ Erro ao adicionar números:", error.message);
    }
  } else {
    console.log("ℹ️ Nenhum número foi adicionado.");
  }
}

async function handleShowNumbers() {
  console.log("\n📋 Lista atual de números:");
  console.log("─".repeat(40));
  
  try {
    const numbers = await showNumbersList();
    
    if (numbers.length === 0) {
      console.log("📭 Lista vazia. Adicione números primeiro.");
      return;
    }
    
    numbers.forEach((number, index) => {
      console.log(`${index + 1}. ${number}`);
    });
    
    console.log(`\n📊 Total: ${numbers.length} números`);
    
  } catch (error) {
    console.error("❌ Erro ao mostrar números:", error.message);
  }
}

async function handleClearNumbers(rl) {
  console.log("\n🗑️ Limpar lista de números");
  
  try {
    const numbers = await showNumbersList();
    
    if (numbers.length === 0) {
      console.log("ℹ️ A lista já está vazia.");
      return;
    }
    
    console.log(`⚠️ Isso irá remover ${numbers.length} números da lista.`);
    const confirm = await new Promise((resolve) => {
      rl.question("Tem certeza? (s/N): ", resolve);
    });
    
    if (confirm.toLowerCase() === 's' || confirm.toLowerCase() === 'sim') {
      await clearNumbersList();
      console.log("✅ Lista de números limpa com sucesso!");
    } else {
      console.log("ℹ️ Operação cancelada.");
    }
    
  } catch (error) {
    console.error("❌ Erro ao limpar lista:", error.message);
  }
}

async function handleExecuteDispatch(rl) {
  console.log("\n🚁 Executar disparo de drone");
  console.log("─".repeat(40));
  
  try {
    // Verificar se há números na lista
    const numbers = await showNumbersList();
    if (numbers.length === 0) {
      console.log("❌ Nenhum número na lista. Adicione números primeiro.");
      return;
    }
    
    // Verificar se há mensagens disponíveis
    const messages = await listDroneMessages();
    if (messages.length === 0) {
      console.log("❌ Nenhuma mensagem drone disponível no banco.");
      return;
    }
    
    // Mostrar resumo
    console.log(`📊 Resumo do disparo:`);
    console.log(`   • ${numbers.length} números na lista`);
    console.log(`   • ${messages.length} mensagens disponíveis`);
    
    // Listar mensagens para seleção
    console.log("\n📝 Selecione a mensagem para enviar:");
    messages.forEach((msg, index) => {
      const preview = msg.message_content.length > 50 
        ? msg.message_content.substring(0, 50) + "..." 
        : msg.message_content;
      console.log(`${index + 1}. [${msg.locale}] ${preview}`);
    });
    
    const messageChoice = await new Promise((resolve) => {
      rl.question("Escolha o número da mensagem: ", resolve);
    });
    
    const messageIndex = parseInt(messageChoice) - 1;
    if (messageIndex < 0 || messageIndex >= messages.length) {
      console.log("❌ Opção de mensagem inválida.");
      return;
    }
    
    const selectedMessage = messages[messageIndex];
    
    // Confirmação final
    console.log("\n⚠️ CONFIRMAÇÃO DE DISPARO:");
    console.log(`📱 Números: ${numbers.length}`);
    console.log(`💬 Mensagem: "${selectedMessage.message_content}"`);
    console.log("\n🚨 Esta ação não pode ser desfeita!");
    
    const confirm = await new Promise((resolve) => {
      rl.question("Confirma o disparo? (digite 'CONFIRMO' para prosseguir): ", resolve);
    });
    
    if (confirm === 'CONFIRMO') {
      console.log("\n🚁 Iniciando disparo...");
      
      const result = await executeDroneDispatch(selectedMessage.id);
      
      console.log("\n✅ Disparo concluído!");
      console.log(`📊 Estatísticas:`);
      console.log(`   • Enviadas: ${result.sent}`);
      console.log(`   • Falhas: ${result.failed}`);
      console.log(`   • Total: ${result.total}`);
      
      if (result.errors.length > 0) {
        console.log(`\n❌ Erros encontrados:`);
        result.errors.forEach(error => {
          console.log(`   • ${error}`);
        });
      }
      
    } else {
      console.log("ℹ️ Disparo cancelado.");
    }
    
  } catch (error) {
    console.error("❌ Erro ao executar disparo:", error.message);
  }
}

module.exports = {
  handleDroneMenu
};