async function randomDelay(minSeconds, maxSeconds) {
  const minMs = minSeconds * 1000;
  const maxMs = maxSeconds * 1000;
  const delayTime = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  await new Promise(resolve => setTimeout(resolve, delayTime));
}

// Uso:
async function exemplo() {
  console.log("Iniciando delay aleatório...");
  await randomDelay(60, 180); // Entre 1 e 3 minutos
  console.log("Delay concluído!");
}

module.exports = randomDelay;