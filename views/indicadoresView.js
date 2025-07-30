function showMenu() {
    console.log('\n=== Menu de Indicadores ===');
    console.log('1. Visualizar estatísticas completas');
    console.log('2. Visualizar apenas estatísticas de horários');
    console.log('3. Limpar todos os dados');
    console.log('4. Exportar para arquivo TXT');
    console.log('0. Voltar ao menu anterior');
}

function showInvalidOption() {
    console.log('Opção inválida. Tente novamente.');
}

function showCompleteStatistics(stats) {
    console.log('\n📊 ===== ESTATÍSTICAS COMPLETAS =====');
    console.log('\n📈 Indicadores Gerais:');
    console.log(`👥 Clientes Atendidos: ${stats.clientesAtendidos}`);
    console.log(`📩 Clientes Convidados: ${stats.clientesConvidados}`);
    console.log(`📊 Taxa de Conversão: ${stats.taxaConversao}%`);
    console.log(`🕒 Última Atualização: ${stats.lastUpdated}`);
    
    if (stats.horarioStats) {
        console.log('\n⏰ Horários Escolhidos:');
        
        stats.horarioStats.horariosProcessados.forEach(horario => {
            console.log(`${horario.id}. ${horario.horario.padEnd(25)} ${horario.count.toString().padStart(3)} (${horario.percentual.padStart(5)}%) ${horario.barra}`);
        });
        
        console.log(`\n📈 Total de horários escolhidos: ${stats.horarioStats.totalHorarios}`);
        console.log(`🏆 Horário mais popular: ${stats.horarioStats.horarioMaisPopular.horario} (${stats.horarioStats.horarioMaisPopular.count} escolhas)`);
        
        if (stats.horarioStats.horarioMenosPopular) {
            console.log(`📉 Horário menos popular: ${stats.horarioStats.horarioMenosPopular.horario} (${stats.horarioStats.horarioMenosPopular.count} escolhas)`);
        }
    } else {
        console.log('\n⏰ Horários Escolhidos:');
        console.log('Nenhum horário foi escolhido ainda.');
    }
    
    console.log('\n====================================');
}

function showHourlyStatistics(stats) {
    console.log('\n⏰ ===== ESTATÍSTICAS DE HORÁRIOS =====');
    
    if (!stats.hasData) {
        if (stats.hasHorarios) {
            console.log('\n📝 Nenhum horário foi escolhido ainda.');
            console.log('\n📋 Horários disponíveis:');
            stats.horariosDisponiveis.forEach(horario => {
                console.log(`${horario.id}. ${horario.horario}`);
            });
        } else {
            console.log('\n❌ Dados de horários não disponíveis.');
        }
    } else {
        console.log('\n📊 Distribuição por horário:');
        
        stats.horariosOrdenados.forEach(horario => {
            console.log(`${horario.posicao.toString().padStart(2)}º ${horario.horario.padEnd(25)} ${horario.count.toString().padStart(3)} (${horario.percentual.padStart(5)}%)`);
            console.log(`    ${horario.barra}\n`);
        });
        
        console.log(`📈 Total de horários escolhidos: ${stats.totalHorarios}\n`);
        console.log(`✅ Horários com escolhas: ${stats.horariosComEscolhas}/6`);
        console.log(`❌ Horários sem escolhas: ${stats.horariosZerados}/6`);
        
        if (stats.horariosNaoEscolhidos.length > 0) {
            console.log('\n📝 Horários ainda não escolhidos:');
            stats.horariosNaoEscolhidos.forEach(horario => {
                console.log(`   • ${horario}`);
            });
        }
    }
    
    console.log('\n=====================================');
}

async function showClearConfirmation(rl) {
    console.log('\n⚠️  ATENÇÃO: Esta ação irá limpar TODOS os dados:');
    console.log('   • Clientes atendidos');
    console.log('   • Clientes convidados');
    console.log('   • Estatísticas de horários escolhidos');
    
    const confirm = await new Promise(resolve => {
        rl.question('\nTem certeza que deseja continuar? (s/n): ', resolve);
    });

    return confirm.toLowerCase() === 's';
}

async function showDoubleConfirmation(rl) {
    const doubleConfirm = await new Promise(resolve => {
        rl.question('Digite "CONFIRMAR" para prosseguir: ', resolve);
    });
    
    return doubleConfirm === 'CONFIRMAR';
}

function showClearSuccess() {
    console.log('✅ Todos os dados foram resetados com sucesso!');
}

function showIncorrectConfirmation() {
    console.log('❌ Confirmação incorreta. Operação cancelada.');
}

function showOperationCancelled() {
    console.log('❌ Operação cancelada.');
}

function showExportSuccess(filePath) {
    console.log(`✅ Arquivo exportado com sucesso para: ${filePath}`);
    console.log('📄 O arquivo inclui:');
    console.log('   • Estatísticas gerais');
    console.log('   • Detalhamento de horários escolhidos');
    console.log('   • Percentuais e análises');
}

function showExportError(errorMessage) {
    console.error('❌ Erro ao exportar arquivo:', errorMessage);
}

module.exports = {
    showMenu,
    showInvalidOption,
    showCompleteStatistics,
    showHourlyStatistics,
    showClearConfirmation,
    showDoubleConfirmation,
    showClearSuccess,
    showIncorrectConfirmation,
    showOperationCancelled,
    showExportSuccess,
    showExportError
};