const modoDevService = require("../services/modoDevService");

async function handleModoDevMenu(rl) {
    while (true) {
        console.log("\n=== MODO DEV ===");
        
        // Mostrar status atual
        const currentMode = await modoDevService.getCurrentMode();
        console.log(`Status atual: ${currentMode.isDevMode ? 'DESENVOLVIMENTO (3s)' : 'PRODUÇÃO (1-3min)'}`);
        
        console.log("\n1. Ativar Modo Desenvolvimento (delay 3s)");
        console.log("2. Ativar Modo Produção (delay 1-3min)");
        console.log("3. Ver Status Atual");
        console.log("4. Testar Delay Atual");
        console.log("0. Voltar ao Menu Principal");

        const choice = await new Promise((resolve) => {
            rl.question("Escolha uma opção: ", resolve);
        });

        switch (choice) {
            case "1":
                await activateDevMode(rl);
                break;
            case "2":
                await activateProductionMode(rl);
                break;
            case "3":
                await showCurrentStatus();
                break;
            case "4":
                await testCurrentDelay();
                break;
            case "0":
                console.log("Voltando ao menu principal...");
                return;
            default:
                console.log("Opção inválida. Tente novamente.");
        }
    }
}

async function activateDevMode(rl) {
    try {
        console.log("\n🔧 Ativando Modo Desenvolvimento...");
        
        const result = await modoDevService.setDevMode(true);
        
        if (result.success) {
            console.log("✅ Modo Desenvolvimento ativado!");
            console.log("📝 Delay configurado para: 3 segundos");
            console.log("⚠️  Lembre-se: Este modo é apenas para desenvolvimento!");
        } else {
            console.log("❌ Erro ao ativar modo desenvolvimento:", result.error);
        }
        
        await waitForEnter(rl);
    } catch (error) {
        console.log("❌ Erro inesperado:", error.message);
        await waitForEnter(rl);
    }
}

async function activateProductionMode(rl) {
    try {
        console.log("\n🚀 Ativando Modo Produção...");
        
        const result = await modoDevService.setDevMode(false);
        
        if (result.success) {
            console.log("✅ Modo Produção ativado!");
            console.log("📝 Delay configurado para: 1-3 minutos (aleatório)");
            console.log("✨ Sistema pronto para uso em produção!");
        } else {
            console.log("❌ Erro ao ativar modo produção:", result.error);
        }
        
        await waitForEnter(rl);
    } catch (error) {
        console.log("❌ Erro inesperado:", error.message);
        await waitForEnter(rl);
    }
}

async function showCurrentStatus() {
    try {
        console.log("\n📊 STATUS ATUAL DO SISTEMA");
        console.log("=" .repeat(30));
        
        const status = await modoDevService.getDetailedStatus();
        
        console.log(`Modo: ${status.isDevMode ? '🔧 DESENVOLVIMENTO' : '🚀 PRODUÇÃO'}`);
        console.log(`Delay: ${status.delayDescription}`);
        console.log(`Última alteração: ${status.lastChanged || 'Não registrado'}`);
        console.log(`Arquivo de config: ${status.configExists ? '✅ Encontrado' : '❌ Não encontrado'}`);
        
        console.log("\n" + "=" .repeat(30));
        
    } catch (error) {
        console.log("❌ Erro ao obter status:", error.message);
    }
}

async function testCurrentDelay() {
    try {
        console.log("\n🧪 Testando delay atual...");
        
        const startTime = Date.now();
        console.log("⏳ Iniciando delay...");
        
        await modoDevService.testDelay();
        
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        
        console.log(`✅ Delay executado em ${duration} segundos`);
        
    } catch (error) {
        console.log("❌ Erro ao testar delay:", error.message);
    }
}

async function waitForEnter(rl) {
    await new Promise((resolve) => {
        rl.question("\nPressione Enter para continuar...", resolve);
    });
}

module.exports = {
    handleModoDevMenu
};