/**
 * Normaliza o texto removendo acentos, pontuação, convertendo para minúsculas
 * e removendo espaços sobressalentes.
 */
function normalizeText(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^\w\s]/g, "")         // remove caracteres especiais e pontuação
    .replace(/\s+/g, " ")            // remove múltiplos espaços
    .trim();
}

/**
 * Calcula a similaridade entre duas strings usando o coeficiente de Dice.
 * Retorna um valor entre 0.0 (totalmente diferente) e 1.0 (idêntico).
 */
function getDiceSimilarity(str1, str2) {
  const s1 = str1.replace(/\s+/g, "");
  const s2 = str2.replace(/\s+/g, "");

  if (s1 === s2) return 1.0;
  if (s1.length < 2 || s2.length < 2) return 0.0;

  const bigrams1 = new Map();
  for (let i = 0; i < s1.length - 1; i++) {
    const bigram = s1.substring(i, i + 2);
    const count = bigrams1.has(bigram) ? bigrams1.get(bigram) + 1 : 1;
    bigrams1.set(bigram, count);
  }

  let intersection = 0;
  for (let i = 0; i < s2.length - 1; i++) {
    const bigram = s2.substring(i, i + 2);
    const count = bigrams1.has(bigram) ? bigrams1.get(bigram) : 0;
    if (count > 0) {
      bigrams1.set(bigram, count - 1);
      intersection++;
    }
  }

  return (2.0 * intersection) / (s1.length + s2.length - 2);
}

/**
 * Tenta extrair um número de opção válido a partir do texto do usuário.
 * Ex: "1", "1 - Joinville", "opção 2", "nº 3".
 */
function extractOptionNumber(text, maxOptions) {
  const clean = text.trim().toLowerCase();
  
  // 1. Tenta parsear diretamente como inteiro
  const directNum = parseInt(clean, 10);
  if (!isNaN(directNum) && directNum >= 1 && directNum <= maxOptions) {
    return directNum;
  }
  
  // 2. Padrões comuns em português
  const patterns = [
    /^opc[aã]o\s*(\d+)$/i,
    /^n[uú]mero\s*(\d+)$/i,
    /^opc\s*(\d+)$/i,
    /^n[ºo]\s*(\d+)$/i,
    /^n\s*(\d+)$/i,
  ];
  
  for (const pattern of patterns) {
    const match = clean.match(pattern);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= 1 && num <= maxOptions) {
        return num;
      }
    }
  }
  
  // 3. Verifica se contém apenas dígitos e se é curto (para não confundir com telefones/datas)
  const onlyDigits = clean.replace(/[^\d]/g, "");
  if (onlyDigits && onlyDigits.length <= 2) {
    const num = parseInt(onlyDigits, 10);
    if (num >= 1 && num <= maxOptions) {
      return num;
    }
  }
  
  return null;
}

/**
 * Encontra a melhor opção correspondente para a mensagem do cliente.
 * @param {string} bodyText - Mensagem digitada pelo cliente
 * @param {Array} options - Lista de opções do menu: [{ keyword, reply }]
 * @returns {object|null} A opção correspondente ou null
 */
function matchMenuOption(bodyText, options) {
  if (!bodyText || !options || options.length === 0) {
    return null;
  }

  const cleanInput = bodyText.trim();
  const normalizedInput = normalizeText(cleanInput);

  // 1. Busca Exata (com e sem normalização) em qualquer palavra-chave
  for (const opt of options) {
    const rawKeywords = (opt.keyword || "").split(",").map(k => k.trim());
    
    // Sem normalização (apenas case-insensitive)
    if (rawKeywords.some(k => k.toLowerCase() === cleanInput.toLowerCase())) {
      return opt;
    }
    
    // Com normalização
    const normalizedKeywords = rawKeywords.map(k => normalizeText(k)).filter(Boolean);
    if (normalizedKeywords.some(k => k === normalizedInput)) {
      return opt;
    }
  }

  // 2. Busca por Número (Índice da opção)
  const optionNum = extractOptionNumber(cleanInput, options.length);
  if (optionNum !== null) {
    return options[optionNum - 1];
  }

  // 3. Busca Parcial/Substring (mínimo de 3 caracteres)
  if (normalizedInput.length >= 3) {
    for (const opt of options) {
      const rawKeywords = (opt.keyword || "").split(",").map(k => k.trim());
      const normalizedKeywords = rawKeywords.map(k => normalizeText(k)).filter(Boolean);
      
      for (const kw of normalizedKeywords) {
        // Se o usuário digitou parte da palavra-chave (ex: "joinv" para "joinville")
        if (kw.length >= 3 && kw.includes(normalizedInput)) {
          return opt;
        }
        
        // Se a entrada contém a palavra-chave como palavra inteira (ex: "quero joinville" contendo "joinville")
        // Evita falsos positivos como "479999999" combinando com "4"
        if (kw.length >= 2) {
          const escapedKw = kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const regex = new RegExp(`\\b${escapedKw}\\b`, 'i');
          if (regex.test(normalizedInput)) {
            return opt;
          }
        }
      }
    }
  }

  // 4. Busca Fuzzy (Coeficiente de Dice)
  let bestMatch = null;
  let highestScore = 0;
  
  // Limiar de similaridade dinâmico baseado no tamanho da entrada
  let minSimilarity = 0.5;
  if (normalizedInput.length <= 3) {
    minSimilarity = 0.85;
  } else if (normalizedInput.length <= 6) {
    minSimilarity = 0.65;
  }

  for (const opt of options) {
    const rawKeywords = (opt.keyword || "").split(",").map(k => k.trim());
    const normalizedKeywords = rawKeywords.map(k => normalizeText(k)).filter(Boolean);
    
    for (const kw of normalizedKeywords) {
      const similarity = getDiceSimilarity(normalizedInput, kw);
      if (similarity > highestScore) {
        highestScore = similarity;
        bestMatch = opt;
      }
    }
  }

  if (highestScore >= minSimilarity) {
    return bestMatch;
  }

  return null;
}

module.exports = {
  normalizeText,
  getDiceSimilarity,
  extractOptionNumber,
  matchMenuOption
};
