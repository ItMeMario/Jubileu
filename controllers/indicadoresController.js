const indicadoresService = require('../services/indicadoresService');

async function handleIndicadoresMenu(rl) {
    while (true) {
        console.log('\n=== Menu de Indicadores ===');
        console.log('1. Visualizar estatísticas');
        console.log('2. Limpar todos os dados');
        console.log('3. Exportar para arquivo TXT');
        console.log('0. Voltar ao menu anterior');

        const choice = await new Promise(resolve => {
            rl.question('Escolha uma opção: ', resolve);
        });

        switch (choice) {
            case '1':
                await showStatistics();
                break;
            case '2':
                await clearStatistics(rl);
                break;
            case '3':
                await exportToTxt();
                break;
            case '0':
                return;
            default:
                console.log('Opção inválida. Tente novamente.');
        }
    }
}

async function showStatistics() {
    const stats = indicadoresService.getStatistics();
    console.log('\n📊 Estatísticas Atuais:');
    console.log(`👥 Clientes Atendidos: ${stats.clientesAtendidos}`);
    console.log(`📩 Clientes Convidados: ${stats.clientesConvidados}`);
    console.log(`🕒 Última Atualização: ${stats.lastUpdated || 'N/A'}`);
}

async function clearStatistics(rl) {
    const confirm = await new Promise(resolve => {
        rl.question('Tem certeza que deseja limpar TODOS os dados? (s/n): ', resolve);
    });

    if (confirm.toLowerCase() === 's') {
        indicadoresService.clearStatistics();
        console.log('✅ Dados resetados com sucesso!');
    } else {
        console.log('Operação cancelada.');
    }
}

async function exportToTxt() {
    try {
        const filePath = indicadoresService.exportToTxt();
        console.log(`✅ Arquivo exportado com sucesso para: ${filePath}`);
    } catch (error) {
        console.error('❌ Erro ao exportar arquivo:', error.message);
    }
}

module.exports = {
    handleIndicadoresMenu
};