/**
 * Utilitários para conversão e validação de números de telefone
 * para o formato aceito pela WhatsApp Web.js
 */

/**
 * Remove todos os caracteres não numéricos de um número
 * @param {string} number Número com formatação
 * @returns {string} Apenas os dígitos numéricos
 */
function cleanNumber(number) {
  if (!number || typeof number !== "string") {
    return "";
  }

  // Remove tudo que não é número
  return number.replace(/\D/g, "");
}

/**
 * Valida se um número de telefone é válido
 * @param {string} number Número para validar
 * @returns {boolean} True se válido
 */
function validatePhoneNumber(number) {
  try {
    const cleaned = cleanNumber(number);

    // Número vazio
    if (!cleaned) {
      return false;
    }

    // Muito curto (mínimo 10 dígitos para BR)
    if (cleaned.length < 10) {
      return false;
    }

    // Muito longo (máximo 15 dígitos - padrão internacional)
    if (cleaned.length > 15) {
      return false;
    }

    // Se começar com 55 (Brasil), validar formato brasileiro
    if (cleaned.startsWith("55")) {
      return validateBrazilianNumber(cleaned);
    }

    // Se não tem código do país, assumir que é brasileiro
    if (cleaned.length <= 11) {
      return validateBrazilianNumber("55" + cleaned);
    }

    // Para outros países, validação básica
    return cleaned.length >= 10 && cleaned.length <= 15;
  } catch (error) {
    return false;
  }
}

/**
 * Valida especificamente números brasileiros
 * @param {string} number Número limpo para validar
 * @returns {boolean} True se válido
 */
function validateBrazilianNumber(number) {
  // Número brasileiro deve ter 13 dígitos (55 + DDD + número)
  if (number.length !== 13) {
    return false;
  }

  // Deve começar com 55
  if (!number.startsWith("55")) {
    return false;
  }

  // Extrair DDD (dois dígitos após o 55)
  const ddd = number.substring(2, 4);
  const phoneNumber = number.substring(4);

  // DDDs válidos no Brasil
  const validDDDs = [
    "11",
    "12",
    "13",
    "14",
    "15",
    "16",
    "17",
    "18",
    "19", // SP
    "21",
    "22",
    "24", // RJ
    "27",
    "28", // ES
    "31",
    "32",
    "33",
    "34",
    "35",
    "37",
    "38", // MG
    "41",
    "42",
    "43",
    "44",
    "45",
    "46", // PR
    "47",
    "48",
    "49", // SC
    "51",
    "53",
    "54",
    "55", // RS
    "61", // DF
    "62",
    "64", // GO
    "63", // TO
    "65",
    "66", // MT
    "67", // MS
    "68", // AC
    "69", // RO
    "71",
    "73",
    "74",
    "75",
    "77", // BA
    "79", // SE
    "81",
    "87", // PE
    "82", // AL
    "83", // PB
    "84", // RN
    "85",
    "88", // CE
    "86",
    "89", // PI
    "91",
    "93",
    "94", // PA
    "92",
    "97", // AM
    "95", // RR
    "96", // AP
    "98",
    "99", // MA
  ];

  if (!validDDDs.includes(ddd)) {
    return false;
  }

  // Número deve ter 9 dígitos (celular) ou 8 dígitos (fixo)
  if (phoneNumber.length !== 9 && phoneNumber.length !== 8) {
    return false;
  }

  // Se tem 9 dígitos, deve começar com 9 (celular)
  if (phoneNumber.length === 9 && !phoneNumber.startsWith("9")) {
    return false;
  }

  // Se tem 8 dígitos, não pode começar com 9 (fixo)
  if (phoneNumber.length === 8 && phoneNumber.startsWith("9")) {
    return false;
  }

  return true;
}

/**
 * Converte número para o formato aceito pela WhatsApp Web.js
 * @param {string} number Número em qualquer formato
 * @returns {string} Número no formato WhatsApp (5547999999999@c.us)
 */
function convertToWhatsAppFormat(number) {
  try {
    let cleaned = cleanNumber(number);

    if (!cleaned) {
      throw new Error("Número vazio ou inválido");
    }

    // Se não tem código do país e parece ser brasileiro, adicionar 55
    if (cleaned.length <= 11 && !cleaned.startsWith("55")) {
      cleaned = "55" + cleaned;
    }

    // Validar antes de converter
    if (!validatePhoneNumber(cleaned)) {
      throw new Error(`Número inválido: ${number}`);
    }

    // Retornar no formato WhatsApp
    return cleaned + "@c.us";
  } catch (error) {
    throw new Error(`Erro ao converter número "${number}": ${error.message}`);
  }
}

/**
 * Converte múltiplos números para formato WhatsApp
 * @param {Array} numbers Array de números em vários formatos
 * @returns {Object} Resultado com números convertidos e erros
 */
function convertMultipleNumbers(numbers) {
  const result = {
    converted: [],
    errors: [],
    stats: {
      total: numbers.length,
      success: 0,
      failed: 0,
    },
  };

  for (const number of numbers) {
    try {
      const whatsappNumber = convertToWhatsAppFormat(number);
      result.converted.push({
        original: number,
        whatsapp: whatsappNumber,
        clean: whatsappNumber.replace("@c.us", ""),
      });
      result.stats.success++;
    } catch (error) {
      result.errors.push({
        number: number,
        error: error.message,
      });
      result.stats.failed++;
    }
  }

  return result;
}

/**
 * Formata número para exibição amigável
 * @param {string} whatsappNumber Número no formato WhatsApp
 * @returns {string} Número formatado para exibição
 */
function formatNumberForDisplay(whatsappNumber) {
  try {
    // Remove o @c.us
    const cleanNumber = whatsappNumber.replace("@c.us", "");

    // Se é brasileiro (13 dígitos começando com 55)
    if (cleanNumber.length === 13 && cleanNumber.startsWith("55")) {
      const countryCode = cleanNumber.substring(0, 2);
      const ddd = cleanNumber.substring(2, 4);
      const phoneNumber = cleanNumber.substring(4);

      // Se é celular (9 dígitos)
      if (phoneNumber.length === 9) {
        const firstPart = phoneNumber.substring(0, 5);
        const secondPart = phoneNumber.substring(5);
        return `+${countryCode} (${ddd}) ${firstPart}-${secondPart}`;
      }

      // Se é fixo (8 dígitos)
      if (phoneNumber.length === 8) {
        const firstPart = phoneNumber.substring(0, 4);
        const secondPart = phoneNumber.substring(4);
        return `+${countryCode} (${ddd}) ${firstPart}-${secondPart}`;
      }
    }

    // Para outros formatos, retorna com + apenas
    return "+" + cleanNumber;
  } catch (error) {
    return whatsappNumber; // Retorna original se der erro
  }
}

/**
 * Extrai informações do número
 * @param {string} whatsappNumber Número no formato WhatsApp
 * @returns {Object} Informações do número
 */
function getNumberInfo(whatsappNumber) {
  try {
    const cleanNumber = whatsappNumber.replace("@c.us", "");

    const info = {
      original: whatsappNumber,
      clean: cleanNumber,
      formatted: formatNumberForDisplay(whatsappNumber),
      country: "unknown",
      type: "unknown",
      valid: validatePhoneNumber(cleanNumber),
    };

    // Se é brasileiro
    if (cleanNumber.length === 13 && cleanNumber.startsWith("55")) {
      info.country = "Brazil";
      info.countryCode = "55";
      info.areaCode = cleanNumber.substring(2, 4);
      info.number = cleanNumber.substring(4);

      if (info.number.length === 9) {
        info.type = "mobile";
      } else if (info.number.length === 8) {
        info.type = "landline";
      }
    }

    return info;
  } catch (error) {
    return {
      original: whatsappNumber,
      error: error.message,
      valid: false,
    };
  }
}

module.exports = {
  cleanNumber,
  validatePhoneNumber,
  validateBrazilianNumber,
  convertToWhatsAppFormat,
  convertMultipleNumbers,
  formatNumberForDisplay,
  getNumberInfo,
};
