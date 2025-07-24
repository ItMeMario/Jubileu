const indicadoresService = require('../services/indicadoresService');

async function handleIndicadoresMenu(rl) {
    while (true) {
        console.log('\n=== Menu de Indicadores ===');
        console.log('1. Visualizar estatísticas completas');
        console.log('2. Visualizar apenas estatísticas de horários');
        console.log('3. Limpar todos os dados');
        console.log('4. Exportar para arquivo TXT');
        console.log('0. Voltar ao menu anterior');

        const choice = await new Promise(resolve => {
            rl.question('Escolha uma opção: ', resolve);
        });

        switch (choice) {
            case '1':
                await showCompleteStatistics();
                break;
            case '2':
                await showHourlyStatistics();
                break;
            case '3':
                await clearStatistics(rl);
                break;
            case '4':
                await exportToTxt();
                break;
            case '0':
                return;
            default:
                console.log('Opção inválida. Tente novamente.');
        }
    }
}

async function showCompleteStatistics() {
    const stats = indicadoresService.getStatistics();
    
    console.log('\n📊 ===== ESTATÍSTICAS COMPLETAS =====');
    console.log('\n📈 Indicadores Gerais:');
    console.log(`👥 Clientes Atendidos: ${stats.clientesAtendidos}`);
    console.log(`📩 Clientes Convidados: ${stats.clientesConvidados}`);
    
    // Calcula taxa de conversão
    const taxaConversao = stats.clientesAtendidos > 0 
        ? ((stats.clientesConvidados / stats.clientesAtendidos) * 100).toFixed(1)
        : '0.0';
    console.log(`📊 Taxa de Conversão: ${taxaConversao}%`);
    
    console.log(`🕒 Última Atualização: ${stats.lastUpdated || 'N/A'}`);
    
    // Exibe estatísticas de horários
    if (stats.horariosEscolhidos) {
        console.log('\n⏰ Horários Escolhidos:');
        
        let totalHorarios = 0;
        Object.values(stats.horariosEscolhidos).forEach(horario => {
            totalHorarios += horario.count;
        });
        
        if (totalHorarios > 0) {
            Object.entries(stats.horariosEscolhidos).forEach(([id, horario]) => {
                const percentual = ((horario.count / totalHorarios) * 100).toFixed(1);
                const barra = '█'.repeat(Math.round(horario.count / totalHorarios * 20));
                console.log(`${id}. ${horario.horario.padEnd(25)} ${horario.count.toString().padStart(3)} (${percentual.padStart(5)}%) ${barra}`);
            });
            
            console.log(`\n📈 Total de horários escolhidos: ${totalHorarios}`);
            
            // Horário mais popular
            const horarioMaisPopular = Object.entries(stats.horariosEscolhidos)
                .reduce((prev, current) => prev[1].count > current[1].count ? prev : current);
            console.log(`🏆 Horário mais popular: ${horarioMaisPopular[1].horario} (${horarioMaisPopular[1].count} escolhas)`);
            
            // Horário menos popular (com pelo menos 1 escolha)
            const horariosComEscolhas = Object.entries(stats.horariosEscolhidos)
                .filter(([_, horario]) => horario.count > 0);
            
            if (horariosComEscolhas.length > 1) {
                const horarioMenosPopular = horariosComEscolhas
                    .reduce((prev, current) => prev[1].count < current[1].count ? prev : current);
                console.log(`📉 Horário menos popular: ${horarioMenosPopular[1].horario} (${horarioMenosPopular[1].count} escolhas)`);
            }
        } else {
            console.log('Nenhum horário foi escolhido ainda.');
        }
    } else {
        console.log('\n⏰ Dados de horários não disponíveis.');
    }
    
    console.log('\n====================================');
}

async function showHourlyStatistics() {
    const hourlyStats = indicadoresService.getHourlyStatistics();
    
    console.log('\n⏰ ===== ESTATÍSTICAS DE HORÁRIOS =====');
    
    if (Object.keys(hourlyStats).length > 0) {
        let totalHorarios = 0;
        Object.values(hourlyStats).forEach(horario => {
            totalHorarios += horario.count;
        });
        
        if (totalHorarios > 0) {
            console.log('\n📊 Distribuição por horário:');
            
            // Ordena por popularidade (maior para menor)
            const horariosOrdenados = Object.entries(hourlyStats)
                .sort(([,a], [,b]) => b.count - a.count);
            
            horariosOrdenados.forEach(([id, horario], index) => {
                const percentual = ((horario.count / totalHorarios) * 100).toFixed(1);
                const barra = '█'.repeat(Math.round(horario.count / totalHorarios * 30));
                const posicao = `${index + 1}º`.padStart(3);
                
                console.log(`${posicao} ${horario.horario.padEnd(25)} ${horario.count.toString().padStart(3)} (${percentual.padStart(5)}%)`);
                console.log(`    ${barra}\n`);
            });
            
            console.log(`📈 Total de horários escolhidos: ${totalHorarios}\n`);
            
            // Estatísticas adicionais
            const horariosComEscolhas = horariosOrdenados.filter(([_, horario]) => horario.count > 0);
            const horariosZerados = horariosOrdenados.filter(([_, horario]) => horario.count === 0);
            
            console.log(`✅ Horários com escolhas: ${horariosComEscolhas.length}/6`);
            console.log(`❌ Horários sem escolhas: ${horariosZerados.length}/6`);
            
            if (horariosZerados.length > 0) {
                console.log('\n📝 Horários ainda não escolhidos:');
                horariosZerados.forEach(([id, horario]) => {
                    console.log(`   • ${horario.horario}`);
                });
            }
        } else {
            console.log('\n📝 Nenhum horário foi escolhido ainda.');
            console.log('\n📋 Horários disponíveis:');
            Object.entries(hourlyStats).forEach(([id, horario]) => {
                console.log(`${id}. ${horario.horario}`);
            });
        }
    } else {
        console.log('\n❌ Dados de horários não disponíveis.');
    }
    
    console.log('\n=====================================');
}

async function clearStatistics(rl) {
    console.log('\n⚠️  ATENÇÃO: Esta ação irá limpar TODOS os dados:');
    console.log('   • Clientes atendidos');
    console.log('   • Clientes convidados');
    console.log('   • Estatísticas de horários escolhidos');
    
    const confirm = await new Promise(resolve => {
        rl.question('\nTem certeza que deseja continuar? (s/n): ', resolve);
    });

    if (confirm.toLowerCase() === 's') {
        const doubleConfirm = await new Promise(resolve => {
            rl.question('Digite "CONFIRMAR" para prosseguir: ', resolve);
        });
        
        if (doubleConfirm === 'CONFIRMAR') {
            indicadoresService.clearStatistics();
            console.log('✅ Todos os dados foram resetados com sucesso!');
        } else {
            console.log('❌ Confirmação incorreta. Operação cancelada.');
        }
    } else {
        console.log('❌ Operação cancelada.');
    }
}

async function exportToTxt() {
    try {
        const filePath = indicadoresService.exportToTxt();
        console.log(`✅ Arquivo exportado com sucesso para: ${filePath}`);
        console.log('📄 O arquivo inclui:');
        console.log('   • Estatísticas gerais');
        console.log('   • Detalhamento de horários escolhidos');
        console.log('   • Percentuais e análises');
    } catch (error) {
        console.error('❌ Erro ao exportar arquivo:', error.message);
    }
}

module.exports = {
    handleIndicadoresMenu
};