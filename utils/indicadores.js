const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/indicadoresData.json');

// Garante que o diretório data existe
function ensureDataDirectory() {
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Inicializa ou recupera os dados
function loadData() {
    ensureDataDirectory();
    
    try {
        // Se o arquivo não existe ou está vazio, cria com valores padrão
        if (!fs.existsSync(DATA_PATH) || fs.statSync(DATA_PATH).size === 0) {
            const defaultData = {
                clientesAtendidos: 0,
                clientesConvidados: 0,
                lastUpdated: new Date().toISOString()
            };
            fs.writeFileSync(DATA_PATH, JSON.stringify(defaultData, null, 2));
            return defaultData;
        }

        // Lê e parseia o arquivo existente
        const rawData = fs.readFileSync(DATA_PATH, 'utf-8');
        return JSON.parse(rawData);
    } catch (error) {
        console.error('Erro ao carregar dados, reinicializando...', error);
        const defaultData = {
            clientesAtendidos: 0,
            clientesConvidados: 0,
            lastUpdated: new Date().toISOString()
        };
        fs.writeFileSync(DATA_PATH, JSON.stringify(defaultData, null, 2));
        return defaultData;
    }
}

// Salva os dados de forma segura
function saveData(data) {
    try {
        data.lastUpdated = new Date().toISOString();
        fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Erro ao salvar dados:', error);
    }
}

// Funções de incremento
function incrementarAtendidos() {
    const data = loadData();
    data.clientesAtendidos += 1;
    saveData(data);
    return data.clientesAtendidos;
}

function incrementarConvidados() {
    const data = loadData();
    data.clientesConvidados += 1;
    saveData(data);
    return data.clientesConvidados;
}

function getIndicadores() {
    return loadData();
}

module.exports = {
    incrementarAtendidos,
    incrementarConvidados,
    getIndicadores
};