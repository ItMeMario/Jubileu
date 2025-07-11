// Delay fixo
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Delay aleatório entre min e max (em milissegundos)
const randomDelay = (minMs, maxMs) => {
    const delayTime = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return new Promise(resolve => setTimeout(resolve, delayTime));
};

// Exemplo de uso:
// delay(3000) → espera exatamente 3 segundos
// randomDelay(60000, 180000) → espera entre 1 e 3 minutos

module.exports = {
    delay,
    randomDelay
};