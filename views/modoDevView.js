function showStatusLabel(isDevMode) {
    console.log(`Status atual: ${isDevMode ? 'DESENVOLVIMENTO (3s)' : 'PRODUÇÃO (1-3min)'}`);
}

function showToggleMessage(isDevMode) {
    if (isDevMode) {
        console.log("✅ Modo Desenvolvimento ativado!");
        console.log("📝 Delay configurado para: 3 segundos");
        console.log("⚠️  Lembre-se: Este modo é apenas para desenvolvimento!");
    } else {
        console.log("✅ Modo Produção ativado!");
        console.log("📝 Delay configurado para: 1-3 minutos (aleatório)");
        console.log("✨ Sistema pronto para uso em produção!");
    }
}

function showError(error) {
    console.log("❌ Erro:", error);
}

function showDetailedStatus(status) {
    console.log("\n📊 STATUS ATUAL DO SISTEMA");
    console.log("=".repeat(30));
    console.log(`Modo: ${status.isDevMode ? '🔧 DESENVOLVIMENTO' : '🚀 PRODUÇÃO'}`);
    console.log(`Delay: ${status.delayDescription}`);
    console.log(`Última alteração: ${status.lastChanged || 'Não registrado'}`);
    console.log(`Arquivo de config: ${status.configExists ? '✅ Encontrado' : '❌ Não encontrado'}`);
    console.log("\n" + "=".repeat(30));
}

async function waitForEnter(rl) {
    await new Promise((resolve) => rl.question("\nPressione Enter para continuar...", resolve));
}

module.exports = {
    showStatusLabel,
    showToggleMessage,
    showError,
    showDetailedStatus,
    waitForEnter
};
