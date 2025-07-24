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
            fs.writeFileSync(DATA_PATH, JSON.stringify(defaultData, null, 2));
            return defaultData;
        }

        // Lê e parseia o arquivo existente
        const rawData = fs.readFileSync(DATA_PATH, 'utf-8');
        const data = JSON.parse(rawData);
        
        // Verifica se já existe a estrutura de horários, se não, adiciona
        if (!data.horariosEscolhidos) {
            data.horariosEscolhidos = {
                "1": { horario: "10:00h (Manhã)", count: 0 },
                "2": { horario: "12:00h (Meio-dia)", count: 0 },
                "3": { horario: "14:00h (Depois do almoço)", count: 0 },
                "4": { horario: "15:30h (Tarde)", count: 0 },
                "5": { horario: "17:30h (Final da tarde)", count: 0 },
                "6": { horario: "19:30h (Noite)", count: 0 }
            };
            saveData(data);
        }
        
        return data;
    } catch (error) {
        console.error('Erro ao carregar dados, reinicializando...', error);
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

// Funções de incremento existentes
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

// Nova função para incrementar horários escolhidos
function incrementarHorario(horarioId) {
    const data = loadData();
    
    // Converte para string caso seja passado como número
    const id = String(horarioId);
    
    if (data.horariosEscolhidos[id]) {
        data.horariosEscolhidos[id].count += 1;
        saveData(data);
        return data.horariosEscolhidos[id].count;
    } else {
        console.warn(`Horário com ID ${id} não encontrado`);
        return 0;
    }
}

// Função para obter estatísticas de horários
function getEstatisticasHorarios() {
    const data = loadData();
    return data.horariosEscolhidos || {};
}

function getIndicadores() {
    return loadData();
}

module.exports = {
    incrementarAtendidos,
    incrementarConvidados,
    incrementarHorario,
    getEstatisticasHorarios,
    getIndicadores
};