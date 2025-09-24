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
        await listarMensagensDisponiveis();
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

async function listarMensagensDisponiveis() {
  console.log("\n--- LISTAR MENSAGENS DISPONÍVEIS ---");
  console.log("Funcionalidade em desenvolvimento...");
  await pausar();
}

async function adicionarNumerosDisparo(rl) {
  console.log("\n--- ADICIONAR NÚMEROS PARA DISPARO ---");
  console.log("Funcionalidade em desenvolvimento...");
  await pausar();
}

async function verListaAtualNumeros() {
  console.log("\n--- VER LISTA ATUAL DE NÚMEROS ---");
  console.log("Funcionalidade em desenvolvimento...");
  await pausar();
}

async function limparListaNumeros(rl) {
  console.log("\n--- LIMPAR LISTA DE NÚMEROS ---");
  console.log("Funcionalidade em desenvolvimento...");
  await pausar();
}

async function executarDisparoDrone(rl) {
  console.log("\n--- EXECUTAR DISPARO DE DRONE ---");
  console.log("Funcionalidade em desenvolvimento...");
  await pausar();
}

async function pausar() {
  console.log("\nPressione Enter para continuar...");
  await new Promise((resolve) => {
    process.stdin.once("data", resolve);
  });
}

module.exports = {
  handleDroneMenu,
};
