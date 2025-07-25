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

function showCurrentScoutConfig(scoutConfig) {
    console.log("\n🔍 CONFIGURAÇÃO ATUAL DO SCOUT");
    console.log("=".repeat(35));
    console.log(`Status: ${scoutConfig.enabled ? '✅ ATIVO' : '❌ INATIVO'}`);
    console.log(`Tempo configurado: ${scoutConfig.timeFormatted}`);
    console.log(`Total em segundos: ${scoutConfig.timeSeconds}s`);
    
    if (scoutConfig.lastChanged) {
        console.log(`Última alteração: ${new Date(scoutConfig.lastChanged).toLocaleString('pt-BR')}`);
    } else {
        console.log(`Última alteração: Não registrado`);
    }
    console.log("=".repeat(35));
}

function showScoutConfigSuccess(timeFormatted, totalSeconds) {
    console.log("✅ Scout configurado com sucesso!");
    console.log(`⏰ Tempo definido: ${timeFormatted}`);
    console.log(`📊 Total: ${totalSeconds} segundos`);
    console.log("🔍 Scout está agora ATIVO no sistema!");
}

function showError(error) {
    console.log("❌ Erro:", error);
}

function showDetailedStatus(status) {
    console.log("\n📊 STATUS ATUAL DO SISTEMA");
    console.log("=".repeat(40));
    console.log(`Modo: ${status.isDevMode ? '🔧 DESENVOLVIMENTO' : '🚀 PRODUÇÃO'}`);
    console.log(`Debug: ${status.debugEnabled ? '🐛 HABILITADO' : '🔇 DESABILITADO'}`);
    console.log(`Scout: ${status.scoutEnabled ? '🔍 ATIVO' : '❌ INATIVO'}`);
    console.log(`Delay: ${status.delayDescription}`);
    console.log(`Debug Logs: ${status.debugDescription}`);
    console.log(`Tempo Scout: ${status.scoutTime} (${status.scoutSeconds}s)`);
    console.log(`Última alteração (Modo): ${status.lastChanged || 'Não registrado'}`);
    console.log(`Última alteração (Debug): ${status.lastDebugChanged || 'Não registrado'}`);
    console.log(`Última alteração (Scout): ${status.lastScoutChanged || 'Não registrado'}`);
    console.log(`Arquivo de config: ${status.configExists ? '✅ Encontrado' : '❌ Não encontrado'}`);
    console.log("\n" + "=".repeat(40));
}

async function waitForEnter(rl) {
    await new Promise((resolve) => rl.question("\nPressione Enter para continuar...", resolve));
}

module.exports = {
    showStatusLabel,
    showToggleMessage,
    showDebugToggleMessage,
    showCurrentScoutConfig,
    showScoutConfigSuccess,
    showError,
    showDetailedStatus,
    waitForEnter
};