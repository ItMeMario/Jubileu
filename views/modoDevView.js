function showStatusLabel(isDevMode, debugEnabled) {
    const devStatus = isDevMode ? 'DESENVOLVIMENTO (3s)' : 'PRODUÇÃO (1-3min)';
    const debugStatus = debugEnabled ? 'DEBUG: ON' : 'DEBUG: OFF';
    console.log(`Status atual: ${devStatus} | ${debugStatus}`);
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

function showDebugToggleMessage(debugEnabled) {
    if (debugEnabled) {
        console.log("🐛 Debug Mode ativado!");
        console.log("📝 Logs de debug serão exibidos no console");
        console.log("⚠️  Útil para desenvolvimento e troubleshooting");
    } else {
        console.log("🔇 Debug Mode desativado!");
        console.log("📝 Logs de debug não serão exibidos");
        console.log("✨ Console mais limpo para produção!");
    }
}

function showError(error) {
    console.log("❌ Erro:", error);
}

function showDetailedStatus(status) {
    console.log("\n📊 STATUS ATUAL DO SISTEMA");
    console.log("=".repeat(35));
    console.log(`Modo: ${status.isDevMode ? '🔧 DESENVOLVIMENTO' : '🚀 PRODUÇÃO'}`);
    console.log(`Debug: ${status.debugEnabled ? '🐛 HABILITADO' : '🔇 DESABILITADO'}`);
    console.log(`Delay: ${status.delayDescription}`);
    console.log(`Debug Logs: ${status.debugDescription}`);
    console.log(`Última alteração (Modo): ${status.lastChanged || 'Não registrado'}`);
    console.log(`Última alteração (Debug): ${status.lastDebugChanged || 'Não registrado'}`);
    console.log(`Arquivo de config: ${status.configExists ? '✅ Encontrado' : '❌ Não encontrado'}`);
    console.log("\n" + "=".repeat(35));
}

async function waitForEnter(rl) {
    await new Promise((resolve) => rl.question("\nPressione Enter para continuar...", resolve));
}

module.exports = {
    showStatusLabel,
    showToggleMessage,
    showDebugToggleMessage,
    showError,
    showDetailedStatus,
    waitForEnter
};