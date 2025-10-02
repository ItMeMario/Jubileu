// views/droneViews.js
const droneController = require("../controllers/droneController");

async function handleDroneMenu(rl) {
  let running = true;

  while (running) {
    console.log("\n" + "=".repeat(50));
    console.log("            MENU DRONE");
    console.log("=".repeat(50));
    console.log("1. Listar mensagens disponíveis");
    console.log("2. Adicionar números para disparo");
    console.log("3. Ver lista atual de números");
    console.log("4. Limpar lista de números");
    console.log("5. Executar disparo de drone");
    console.log("6. Status do WhatsApp");
    console.log("0. Voltar ao menu principal");
    console.log("=".repeat(50));

    const choice = await new Promise((resolve) => {
      rl.question("Escolha uma opção: ", resolve);
    });

    const option = choice.trim();

    switch (option) {
      case "1":
        await listarMensagens();
        break;
      case "2":
        await adicionarNumerosDisparo(rl);
        break;
      case "3":
        await verListaAtualNumeros();
        break;
      case "4":
        await limparListaNumeros(rl);
        break;
      case "5":
        await executarDisparoDrone(rl);
        break;
      case "6":
        await verificarStatusWhatsApp();
        break;
      case "0":
        console.log("Voltando ao menu principal...");
        running = false; // Sai do loop e retorna ao menu principal
        break;
      default:
        console.log("Opção inválida! Tente novamente.");
        break;
    }
  }
}

async function listarMensagens() {
  console.log("\n--- LISTAR MENSAGENS DISPONÍVEIS ---");

  const mensagens = await droneController.listarMensagens();

  mensagens.forEach((msg) => console.log(msg));

  await pausar();
}

async function adicionarNumerosDisparo(rl) {
  console.log("\n--- ADICIONAR NÚMEROS PARA DISPARO ---");
  console.log("• Formato: 55 + DDD + número (ex: 5547991234567)");
  console.log("• Múltiplos: 5547991234567, 5548988888888, 5511999999999");
  console.log("• Aceita formatação: +55 (47) 99123-4567");
  console.log("⚠️  Código 55 obrigatório para números brasileiros!");
  console.log("• Cole vários números (um por linha)");
  console.log("");

  await processarAdicaoNumeros(rl);
}

async function processarAdicaoNumeros(rl) {
  console.log("\n--- INSERIR NÚMEROS ---");
  console.log(
    "Digite os números (Enter para finalizar, 'cancelar' para voltar):"
  );

  const input = await perguntarMultilinhas(rl);

  if (input.toLowerCase().trim() === "cancelar" || input.trim() === "") {
    console.log("Operação cancelada.");
    return;
  }

  console.log("\nProcessando números...");

  const resultado = await droneController.adicionarNumeros(input);

  console.log("");
  if (resultado.sucesso) {
    console.log("✅ SUCESSO:");
  } else {
    console.log("❌ ERRO:");
  }

  resultado.mensagens.forEach((msg) => console.log(msg));

  await pausar();
}

async function verificarStatusWhatsApp() {
  console.log("\n--- STATUS DO WHATSAPP ---");

  const status = await droneController.obterStatusCliente();

  console.log("");
  console.log("📱 STATUS DA CONEXÃO:");
  console.log(`   ${status.statusTexto}`);

  if (status.info && status.info.wid) {
    console.log(
      `   Usuário: ${status.info.wid.user}@${status.info.wid.server}`
    );
  }

  if (status.erro) {
    console.log(`❌ Erro: ${status.erro}`);
  }

  if (!status.conectado) {
    console.log("\n⚠️  ATENÇÃO: WhatsApp não está conectado!");
    console.log(
      "   Certifique-se de que o cliente está rodando e autenticado."
    );
  }

  await pausar();
}

async function mostrarEstatisticas() {
  console.log("\n--- ESTATÍSTICAS DOS NÚMEROS ---");

  const resultado = await droneController.obterEstatisticasNumeros();

  if (resultado.sucesso) {
    console.log("");
    resultado.resumoTexto.forEach((linha) => console.log("📊 " + linha));
  } else {
    console.log("❌ " + resultado.mensagem);
  }

  await pausar();
}

async function removerNumeroEspecifico(rl) {
  console.log("\n--- REMOVER NÚMERO ESPECÍFICO ---");

  // Primeiro mostra a lista atual
  const lista = await droneController.listarNumerosAtuais();

  if (!lista.sucesso || lista.total === 0) {
    console.log("Nenhum número disponível para remoção.");
    await pausar();
    return;
  }

  console.log("\nNúmeros cadastrados:");
  lista.numeros.forEach((num) => console.log(num.textoExibicao));

  console.log("");
  const indice = await perguntarEsperar(
    rl,
    "Digite o número da lista para remover (ou 0 para cancelar): "
  );

  if (indice.trim() === "0") {
    console.log("Operação cancelada.");
    return;
  }

  const resultado = await droneController.removerNumero(indice.trim());

  console.log("");
  if (resultado.sucesso) {
    console.log("✅ " + resultado.mensagem);
    console.log(`Total restante: ${resultado.totalRestante}`);
  } else {
    console.log("❌ " + resultado.mensagem);
  }

  await pausar();
}

async function verListaAtualNumeros() {
  console.log("\n--- VER LISTA ATUAL DE NÚMEROS ---");

  const resultado = await droneController.listarNumerosAtuais();

  console.log("");

  if (resultado.sucesso) {
    if (resultado.total === 0) {
      console.log("📝 Nenhum número cadastrado ainda.");
      console.log("   Use a opção 2 do menu para adicionar números.");
    } else {
      console.log("📋 NÚMEROS CADASTRADOS:");
      console.log("");
      resultado.numeros.forEach((num) => {
        console.log(num.textoExibicao);
        console.log("");
      });
      console.log(`Total: ${resultado.total} números`);
    }
  } else {
    console.log("❌ " + resultado.mensagens.join(", "));
  }

  await pausar();
}

async function limparListaNumeros(rl) {
  console.log("\n--- LIMPAR LISTA DE NÚMEROS ---");

  // Primeiro verifica se há números
  const lista = await droneController.listarNumerosAtuais();

  if (!lista.sucesso || lista.total === 0) {
    console.log("📝 A lista já está vazia.");
    await pausar();
    return;
  }

  console.log(`⚠️ Você tem ${lista.total} número(s) cadastrado(s).`);
  console.log("Esta ação irá remover TODOS os números da lista.");
  console.log("");

  const confirmacao = await perguntarEsperar(
    rl,
    "Tem certeza? Digite 'CONFIRMAR' para prosseguir: "
  );

  if (confirmacao.trim().toUpperCase() !== "CONFIRMAR") {
    console.log("❌ Operação cancelada.");
    await pausar();
    return;
  }

  console.log("\nLimpando lista...");

  const resultado = await droneController.limparListaCompleta();

  console.log("");
  if (resultado.sucesso) {
    console.log("✅ " + resultado.mensagem);
  } else {
    console.log("❌ " + resultado.mensagem);
  }

  await pausar();
}

async function executarDisparoDrone(rl) {
  console.log("\n--- EXECUTAR DISPARO DE DRONE ---");

  // 1. Verificar status do WhatsApp
  console.log("🔍 Verificando status do WhatsApp...");
  const status = await droneController.obterStatusCliente();

  if (!status.conectado) {
    console.log("\n❌ ERRO: WhatsApp não está conectado!");
    console.log(`   Status atual: ${status.statusTexto}`);
    console.log("   Conecte o WhatsApp antes de executar disparos.");
    await pausar();
    return;
  }

  console.log(`✅ WhatsApp conectado: ${status.statusTexto}`);

  // 2. Verificar se há números cadastrados
  const listaNumeros = await droneController.listarNumerosAtuais();

  if (!listaNumeros.sucesso || listaNumeros.total === 0) {
    console.log("\n❌ ERRO: Nenhum número cadastrado para disparo!");
    console.log("   Adicione números antes de executar disparos.");
    await pausar();
    return;
  }

  console.log(`✅ ${listaNumeros.total} número(s) cadastrado(s)`);

  // 3. Listar mensagens disponíveis
  const mensagens = await droneController.listarMensagens();

  if (
    !mensagens ||
    mensagens.length === 0 ||
    mensagens[0].includes("Nenhuma mensagem")
  ) {
    console.log("\n❌ ERRO: Nenhuma mensagem disponível para disparo!");
    console.log("   Cadastre mensagens no sistema antes de executar disparos.");
    await pausar();
    return;
  }

  // 4. Mostrar submenu de seleção de mensagem
  console.log("\n📝 MENSAGENS DISPONÍVEIS:");
  mensagens.forEach((msg) => console.log(msg));

  console.log("");
  const mensagemIndex = await perguntarEsperar(
    rl,
    "Selecione o número da mensagem para disparo (ou 0 para cancelar): "
  );

  if (mensagemIndex.trim() === "0") {
    console.log("❌ Operação cancelada.");
    await pausar();
    return;
  }

  const mensagemIndexNum = parseInt(mensagemIndex.trim());
  if (
    isNaN(mensagemIndexNum) ||
    mensagemIndexNum < 1 ||
    mensagemIndexNum > mensagens.length
  ) {
    console.log("❌ Número de mensagem inválido!");
    await pausar();
    return;
  }

  // 5. Confirmação final
  console.log("\n⚠️  CONFIRMAÇÃO DE DISPARO:");
  console.log(`   Mensagem selecionada: ${mensagemIndexNum}`);
  console.log(`   Números para disparo: ${listaNumeros.total}`);
  console.log(
    `   Batches de 200 números: ${Math.ceil(listaNumeros.total / 200)}`
  );
  console.log("");

  const confirmacao = await perguntarEsperar(
    rl,
    "Confirma o disparo? Digite 'CONFIRMAR' para prosseguir: "
  );

  if (confirmacao.trim().toUpperCase() !== "CONFIRMAR") {
    console.log("❌ Disparo cancelado pelo usuário.");
    await pausar();
    return;
  }

  // 6. Executar disparo
  console.log("\n🚀 INICIANDO DISPARO...");
  console.log("   (Use Ctrl+C para interromper)");

  const resultado = await droneController.executarDisparoDrone(
    mensagemIndexNum,
    200,
    // Callback de progresso
    (progress) => {
      const statusIcon =
        progress.status === "enviado"
          ? "✅"
          : progress.status === "falha"
          ? "❌"
          : "⏳";

      if (progress.batch) {
        console.log(
          `${statusIcon} [Batch ${progress.batch}/${progress.totalBatches}] ${
            progress.atual
          }/${progress.total} - ${progress.numero} ${
            progress.status === "falha" ? "(ERRO: " + progress.error + ")" : ""
          }`
        );

        if (progress.progressoGeral) {
          console.log(
            `   Progresso geral: ${progress.progressoGeral.atual}/${progress.progressoGeral.total}`
          );
        }
      } else {
        console.log(
          `${statusIcon} ${progress.atual}/${progress.total} - ${
            progress.numero
          } ${
            progress.status === "falha" ? "(ERRO: " + progress.error + ")" : ""
          }`
        );
      }
    },
    // Callback entre batches
    async (batchInfo) => {
      console.log(
        `\n✅ Batch ${batchInfo.batchAtual}/${batchInfo.totalBatches} concluído:`
      );
      console.log(`   Enviados: ${batchInfo.resultado.enviados}`);
      console.log(`   Falhas: ${batchInfo.resultado.falhas}`);

      if (batchInfo.temProximo) {
        console.log("\n⏳ Aguardando delay entre batches...");

        const continuar = await perguntarEsperar(
          rl,
          "Pressione Enter para continuar com próximo batch ou 'cancelar' para parar: "
        );

        return continuar.toLowerCase().trim() !== "cancelar";
      }

      return true;
    }
  );

  // 7. Mostrar resultado final
  console.log("\n" + "=".repeat(50));
  console.log("            RESULTADO DO DISPARO");
  console.log("=".repeat(50));

  if (resultado.sucesso) {
    console.log("✅ " + resultado.mensagem);

    if (resultado.detalhes) {
      console.log(`📊 Total de números: ${resultado.detalhes.totalNumeros}`);
      console.log(
        `📦 Batches processados: ${resultado.detalhes.batchesProcessados}/${resultado.detalhes.totalBatches}`
      );
      console.log(`✅ Enviados: ${resultado.detalhes.totalEnviados}`);
      console.log(`❌ Falhas: ${resultado.detalhes.totalFalhas}`);

      if (resultado.detalhes.mensagemUsada) {
        console.log(
          `📝 Mensagem: ${resultado.detalhes.mensagemUsada.conteudo.substring(
            0,
            50
          )}...`
        );
      }
    }
  } else {
    console.log("❌ " + resultado.mensagem);
    if (resultado.erro) {
      console.log("   Detalhes: " + resultado.erro);
    }
  }

  console.log("=".repeat(50));
  await pausar();
}

// Funções auxiliares

async function pausar() {
  console.log("\nPressione Enter para continuar...");
  await new Promise((resolve) => {
    process.stdin.once("data", resolve);
  });
}

/**
 * Faz uma pergunta e espera resposta
 * @param {*} rl - Interface readline
 * @param {string} pergunta - Texto da pergunta
 * @returns {Promise<string>} - Resposta do usuário
 */
async function perguntarEsperar(rl, pergunta) {
  return new Promise((resolve) => {
    rl.question(pergunta, resolve);
  });
}

/**
 * Permite entrada de múltiplas linhas
 * @param {*} rl - Interface readline
 * @returns {Promise<string>} - Texto inserido
 */
async function perguntarMultilinhas(rl) {
  return new Promise((resolve) => {
    let input = "";
    let linhas = [];

    console.log("(Digite uma linha vazia para finalizar)");

    const processarLinha = (linha) => {
      if (linha.trim() === "") {
        // Linha vazia - finalizar
        rl.removeListener("line", processarLinha);
        resolve(linhas.join("\n"));
      } else {
        linhas.push(linha);
        console.log(`[${linhas.length}] Adicionado: ${linha}`);
      }
    };

    rl.on("line", processarLinha);
  });
}

module.exports = {
  handleDroneMenu,
};
