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
    console.log("0. Sair");
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
      case "0":
        console.log("Saindo do sistema...");
        rl.close();
        process.exit(0);
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
  console.log("Você pode inserir números das seguintes formas:");
  console.log("• Um número por vez: 11999999999");
  console.log("• Múltiplos separados por vírgula: 11999999999, 21888888888");
  console.log("• Formato brasileiro: (11) 99999-9999");
  console.log("• Com código do país: +5511999999999");
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

  console.log(`⚠️  Você tem ${lista.total} número(s) cadastrado(s).`);
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
  console.log("Funcionalidade em desenvolvimento...");
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
