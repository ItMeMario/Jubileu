const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const randomDelay = (minMinutes, maxMinutes) => {
    const minMs = minMinutes * 60 * 1000;
    const maxMs = maxMinutes * 60 * 1000;
    const randomMs = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return new Promise(resolve => setTimeout(resolve, randomMs));
};

// Exportando ambas as funções
module.exports = {
    delay,
    randomDelay
};