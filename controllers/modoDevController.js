const modoDevService = require("../services/modoDevService");
const modoDevView = require("../views/modoDevView");

async function handleModoDevMenu(rl) {
    while (true) {
        console.log("\n=== MODO DEV ===");

        const currentMode = await modoDevService.getCurrentMode();
        modoDevView.showStatusLabel(currentMode.isDevMode, currentMode.debugEnabled);

        console.log("\n1. Alternar Modo (Dev <-> Produção)");
        console.log("2. Alternar Debug (ON <-> OFF)");
        console.log("3. Configurar Scout");
        console.log("4. Ver Status Detalhado");
        console.log("0. Voltar ao Menu Principal");

        const choice = await new Promise((resolve) => rl.question("Escolha uma opção: ", resolve));

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
            modoDevView.showScoutConfigSuccess(result.timeFormatted, result.totalSeconds);
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

module.exports = {
    handleModoDevMenu
};