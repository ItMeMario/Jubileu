const fs = require('fs');
const path = require('path');
const os = require('os');
const indicadores = require('../utils/indicadores');

function getStatistics() {
    return indicadores.getIndicadores();
}

function clearStatistics() {
    const defaultData = {
        clientesAtendidos: 0,
        clientesConvidados: 0,
        horariosEscolhidos: {
            "1": { horario: "10:00h (Manhã)", count: 0 },
            "2": { horario: "12:00h (Meio-dia)", count: 0 },
            "3": { horario: "14:00h (Depois do almoço)", count: 0 },
            "4": { horario: "15:30h (Tarde)", count: 0 },
            "5": { horario: "17:30h (Final da tarde)", count: 0 },
            "6": { horario: "19:30h (Noite)", count: 0 }
        },
        lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(path.join(__dirname, '../data/indicadoresData.json'), JSON.stringify(defaultData, null, 2));
    return defaultData;
}

function exportToTxt() {
    const stats = getStatistics();
    const desktopPath = path.join(os.homedir(), 'Desktop');
    const filePath = path.join(desktopPath, 'indicadores_bot.txt');
    
    let content = `Estatísticas do Bot - ${new Date().toLocaleString()}\n\n`;
    content += `Clientes Atendidos: ${stats.clientesAtendidos}\n`;
    content += `Clientes Convidados: ${stats.clientesConvidados}\n`;
    content += `Última Atualização: ${stats.lastUpdated || 'N/A'}\n\n`;
    
    // Adiciona estatísticas de horários
    content += `=== ESTATÍSTICAS DE HORÁRIOS ESCOLHIDOS ===\n\n`;
    
    if (stats.horariosEscolhidos) {
        let totalHorarios = 0;
        
        // Calcula o total primeiro
        Object.values(stats.horariosEscolhidos).forEach(horario => {
            totalHorarios += horario.count;
        });
        
        // Lista cada horário com percentual
        Object.entries(stats.horariosEscolhidos).forEach(([id, horario]) => {
            const percentual = totalHorarios > 0 ? ((horario.count / totalHorarios) * 100).toFixed(1) : '0.0';
            content += `${horario.horario}: ${horario.count} escolhas (${percentual}%)\n`;
        });
        
        content += `\nTotal de horários escolhidos: ${totalHorarios}\n`;
        
        // Horário mais popular
        if (totalHorarios > 0) {
            const horarioMaisPopular = Object.entries(stats.horariosEscolhidos)
                .reduce((prev, current) => prev[1].count > current[1].count ? prev : current);
            content += `Horário mais popular: ${horarioMaisPopular[1].horario} (${horarioMaisPopular[1].count} escolhas)\n`;
        }
    } else {
        content += `Nenhum dado de horários disponível.\n`;
    }

    fs.writeFileSync(filePath, content);
    return filePath;
}

// Nova função para obter apenas as estatísticas de horários
function getHourlyStatistics() {
    const stats = getStatistics();
    return stats.horariosEscolhidos || {};
}

module.exports = {
    getStatistics,
    clearStatistics,
    exportToTxt,
    getHourlyStatistics
};