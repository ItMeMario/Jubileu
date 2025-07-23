const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '../data/devMode.json');

// Função interna: delay fixo
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Função interna: delay aleatório entre min e max
const randomDelay = (minMs, maxMs) => {
    const delayTime = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return new Promise(resolve => setTimeout(resolve, delayTime));
};

// Delay inteligente e unificado
const smartDelay = async ({ ms = null, minMs = null, maxMs = null } = {}) => {
    let isDevMode = false;

    try {
        const configData = fs.readFileSync(CONFIG_FILE, 'utf-8');
        const config = JSON.parse(configData);
        isDevMode = config.isDevMode;
    } catch (err) {
        console.warn('⚠️  Não foi possível ler o arquivo devMode.json. Assumindo devMode = false.');
    }

    if (isDevMode) {
        return delay(3000); // 3 segundos fixo para qualquer caso em modo dev
    }

    if (ms !== null) {
        return delay(ms);
    }

    if (minMs !== null && maxMs !== null) {
        return randomDelay(minMs, maxMs);
    }

    // Padrão: 1 a 3 minutos
    return randomDelay(60000, 180000);
};

module.exports = {
    smartDelay
};
