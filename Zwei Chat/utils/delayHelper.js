// utils/delayHelper.js

/**
 * Calcula o atraso em milissegundos com base na configuração fornecida.
 * Suporta formatos legados (número simples representando segundos) e o novo formato de objeto.
 * 
 * @param {number|string|object} config - Configuração do delay
 * @param {number} defaultValMs - Valor padrão em milissegundos caso a config seja inválida/ausente
 * @returns {number} Atraso calculado em milissegundos
 */
function calculateDelayMs(config, defaultValMs = 0) {
  if (config === undefined || config === null) {
    return defaultValMs;
  }

  // Se for número simples (legado), trata como segundos
  if (typeof config === "number") {
    return config * 1000;
  }
  
  if (typeof config === "string") {
    const parsed = parseFloat(config);
    if (!isNaN(parsed)) {
      return parsed * 1000;
    }
    return defaultValMs;
  }

  if (typeof config === "object") {
    const type = config.type || "fixed"; // "fixed" ou "range"
    const unit = config.unit || "seconds"; // "seconds", "minutes", "hours"
    
    let multiplier = 1000;
    if (unit === "minutes") {
      multiplier = 60 * 1000;
    } else if (unit === "hours") {
      multiplier = 60 * 60 * 1000;
    }

    if (type === "fixed") {
      const val = parseFloat(config.value !== undefined ? config.value : config.min);
      return (isNaN(val) ? 0 : val) * multiplier;
    } else if (type === "range") {
      const minVal = parseFloat(config.min);
      const maxVal = parseFloat(config.max);
      
      const minMs = (isNaN(minVal) ? 0 : minVal) * multiplier;
      const maxMs = (isNaN(maxVal) ? 0 : maxVal) * multiplier;
      
      if (minMs >= maxMs) {
        return minMs;
      }
      
      return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    }
  }

  return defaultValMs;
}

module.exports = {
  calculateDelayMs,
};
