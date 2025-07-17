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
        lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(path.join(__dirname, '../data/indicadoresData.json'), JSON.stringify(defaultData, null, 2));
    return defaultData;
}

function exportToTxt() {
    const stats = getStatistics();
    const desktopPath = path.join(os.homedir(), 'Desktop');
    const filePath = path.join(desktopPath, 'indicadores_bot.txt');
    
    const content = `Estatísticas do Bot - ${new Date().toLocaleString()}\n\n` +
                   `Clientes Atendidos: ${stats.clientesAtendidos}\n` +
                   `Clientes Convidados: ${stats.clientesConvidados}\n` +
                   `Última Atualização: ${stats.lastUpdated || 'N/A'}\n`;

    fs.writeFileSync(filePath, content);
    return filePath;
}

module.exports = {
    getStatistics,
    clearStatistics,
    exportToTxt
};