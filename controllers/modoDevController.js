const modoDevService = require("../services/modoDevService");
const modoDevView = require("../views/modoDevView");
const groupService = require("../services/groupService");
const { confirmAction } = require("../views/groupViews");

async function handleModoDevMenu(rl) {
  while (true) {
    console.log("\n=== MODO DEV ===");

    const currentMode = await modoDevService.getCurrentMode();
    modoDevView.showStatusLabel(
      currentMode.isDevMode,
      currentMode.debugEnabled
    );

    console.log("\n1. Alternar Modo (Dev <-> Produção)");
    console.log("2. Alternar Debug (ON <-> OFF)");
    console.log("3. Configurar Scout");
    console.log("4. Ver Status Detalhado");
    console.log("5. Alternar modo de grupo (SINGLE/MULTI)");
    console.log("0. Voltar ao Menu Principal");

    const choice = await new Promise((resolve) =>
      rl.question("Escolha uma opção: ", resolve)
    );

    switch (choice) {
      case "1":
        await toggleMode(rl);
        break;
      case "2":
        await toggleDebug(rl);
        break;
      case "3":
        await configureScout(rl);
        break;
      case "4":
        await showStatus(rl);
        break;
      case "5":
        await toggleGroupMode(rl);
        break;
      case "0":
        console.log("Voltando ao menu principal...");
        return;
      default:
        console.log("Opção inválida. Tente novamente.");
    }
  }
}

async function toggleMode(rl) {
  try {
    const result = await modoDevService.toggleDevMode();
    if (result.success) {
      modoDevView.showToggleMessage(result.isDevMode);
    } else {
      modoDevView.showError(result.error);
    }
  } catch (error) {
    modoDevView.showError(error.message);
  }

  await modoDevView.waitForEnter(rl);
}

async function toggleDebug(rl) {
  try {
    const result = await modoDevService.toggleDebugMode();
    if (result.success) {
      modoDevView.showDebugToggleMessage(result.debugEnabled);
    } else {
      modoDevView.showError(result.error);
    }
  } catch (error) {
    modoDevView.showError(error.message);
  }

  await modoDevView.waitForEnter(rl);
}

async function configureScout(rl) {
  try {
    const currentScout = await modoDevService.getScoutConfig();
    modoDevView.showCurrentScoutConfig(currentScout);

    console.log("\nComo deseja configurar o tempo do Scout?");
    console.log("Formato aceito: HH:MM:SS (exemplo: 01:30:45)");
    console.log("Deixe em branco para manter o atual");

    const timeInput = await new Promise((resolve) =>
      rl.question("Digite o tempo (horas:minutos:segundos): ", resolve)
    );

    if (timeInput.trim() === "") {
      console.log("⏸️  Configuração mantida sem alterações.");
      await modoDevView.waitForEnter(rl);
      return;
    }

    const result = await modoDevService.setScoutTime(timeInput);
    if (result.success) {
      modoDevView.showScoutConfigSuccess(
        result.timeFormatted,
        result.totalSeconds
      );
    } else {
      modoDevView.showError(result.error);
    }
  } catch (error) {
    modoDevView.showError(error.message);
  }

  await modoDevView.waitForEnter(rl);
}

async function showStatus(rl) {
  try {
    const status = await modoDevService.getDetailedStatus();
    modoDevView.showDetailedStatus(status);
  } catch (error) {
    modoDevView.showError(error.message);
  }

  await modoDevView.waitForEnter(rl);
}

async function toggleGroupMode(rl) {
  const currentMode = groupService.getCurrentMode();
  const newMode = currentMode === "SINGLE" ? "MULTI" : "SINGLE";

  console.log(`\nModo atual: ${currentMode}`);
  console.log(`Novo modo: ${newMode}`);
  console.log("\nIMPORTANTE:");
  console.log('- SINGLE: Usará apenas o grupo marcado como "primário"');
  console.log("- MULTI: Usará todos os grupos cadastrados");

  const shouldToggle = await confirmAction(rl, `mudar para modo ${newMode}`);
  if (!shouldToggle) {
    console.log("\nOperação cancelada.");
    return;
  }

  await groupService.setMode(newMode);
  console.log(`\n✅ Modo alterado para ${newMode}!`);

  if (newMode === "SINGLE") {
    const groups = await groupService.getAllGroups();
    if (groups.length > 0 && !groups.some((g) => g.isPrimary)) {
      await groupService.setPrimaryGroup(groups[0].id);
      console.log(
        `⚠️ Grupo ${groups[0].id} definido como primário automaticamente.`
      );
    }
  }

  await modoDevView.waitForEnter(rl);
}

module.exports = {
  handleModoDevMenu,
};
