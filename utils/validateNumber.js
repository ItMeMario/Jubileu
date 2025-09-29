// utils/validateNumber.js
const { isValidDDD } = require("../aliases/dddAliases");

/**
 * Remove todos os caracteres não numéricos do número
 * @param {string} number - Número de telefone
 * @returns {string} - Número apenas com dígitos
 */
function cleanNumber(number) {
  return number.toString().replace(/\D/g, "");
}

/**
 * Valida se número tem formato brasileiro válido
 * @param {string} cleanedNumber - Número limpo (apenas dígitos)
 * @returns {Object} - Resultado da validação
 */
function validateBrazilianFormat(cleanedNumber) {
  // Deve começar com 55 (código do país obrigatório)
  if (!cleanedNumber.startsWith("55")) {
    return {
      valid: false,
      error: "Número brasileiro deve começar com código do país 55",
    };
  }

  // Remove o código do país
  const withoutCountryCode = cleanedNumber.substring(2);

  // Deve ter 10 ou 11 dígitos após o 55
  if (withoutCountryCode.length !== 10 && withoutCountryCode.length !== 11) {
    return {
      valid: false,
      error: `Número brasileiro deve ter 10 ou 11 dígitos após o código 55. Encontrados: ${withoutCountryCode.length}`,
    };
  }

  const ddd = withoutCountryCode.substring(0, 2);
  const restante = withoutCountryCode.substring(2);

  // Valida DDD
  if (!isValidDDD(ddd)) {
    return {
      valid: false,
      error: `DDD ${ddd} não é válido no Brasil`,
    };
  }

  // Para números de 11 dígitos (celular) - DEVE começar com 9
  if (withoutCountryCode.length === 11) {
    const firstDigit = restante[0];
    if (firstDigit !== "9") {
      return {
        valid: false,
        error: `Celular com 11 dígitos deve começar com 9. Encontrado: ${firstDigit}`,
      };
    }
  }

  // Para números de 10 dígitos (pode ser fixo OU celular antigo sem 9)
  if (withoutCountryCode.length === 10) {
    const firstDigit = restante[0];
    // Aceita fixo (2-5) ou celular antigo (6-9)
    if (!["2", "3", "4", "5", "6", "7", "8", "9"].includes(firstDigit)) {
      return {
        valid: false,
        error: `Número com 10 dígitos deve começar com 2-9. Encontrado: ${firstDigit}`,
      };
    }
  }

  return {
    valid: true,
    ddd: ddd,
    number: restante,
    isCelular:
      withoutCountryCode.length === 11 ||
      (withoutCountryCode.length === 10 &&
        ["6", "7", "8", "9"].includes(restante[0])),
  };
}

/**
 * Valida formato internacional (não brasileiro)
 * @param {string} cleanedNumber - Número limpo
 * @returns {Object} - Resultado da validação
 */
function validateInternationalFormat(cleanedNumber) {
  // Básico: deve ter entre 7 e 15 dígitos e não começar com 55
  if (cleanedNumber.length < 7 || cleanedNumber.length > 15) {
    return {
      valid: false,
      error: `Número internacional deve ter entre 7 e 15 dígitos. Encontrados: ${cleanedNumber.length}`,
    };
  }

  if (cleanedNumber.startsWith("55")) {
    return {
      valid: false,
      error: "Número com código 55 deve seguir formato brasileiro",
    };
  }

  return {
    valid: true,
  };
}

/**
 * Função principal para converter número de telefone
 * @param {string} phoneNumber - Número de telefone em qualquer formato
 * @returns {Promise<Object>} - Objeto com resultado da conversão
 */
async function convertToWhatsAppFormat(phoneNumber) {
  try {
    if (!phoneNumber || phoneNumber.trim() === "") {
      return {
        success: false,
        error: "Número de telefone não pode ser vazio",
        originalNumber: phoneNumber,
        whatsappFormat: null,
      };
    }

    const cleaned = cleanNumber(phoneNumber);

    if (cleaned.length < 7) {
      return {
        success: false,
        error: "Número muito curto (menos de 7 dígitos)",
        originalNumber: phoneNumber,
        whatsappFormat: null,
      };
    }

    // Verifica se é brasileiro (código 55)
    if (cleaned.startsWith("55")) {
      const validation = validateBrazilianFormat(cleaned);

      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          originalNumber: phoneNumber,
          whatsappFormat: null,
        };
      }

      const whatsappFormat = cleaned + "@c.us";

      return {
        success: true,
        error: null,
        originalNumber: phoneNumber,
        cleanedNumber: cleaned,
        finalNumber: cleaned,
        whatsappFormat: whatsappFormat,
        numberType: validation.isCelular
          ? "brazilian_mobile"
          : "brazilian_fixed",
        ddd: validation.ddd,
      };
    } else {
      // Número internacional
      const validation = validateInternationalFormat(cleaned);

      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          originalNumber: phoneNumber,
          whatsappFormat: null,
        };
      }

      const whatsappFormat = cleaned + "@c.us";

      return {
        success: true,
        error: null,
        originalNumber: phoneNumber,
        cleanedNumber: cleaned,
        finalNumber: cleaned,
        whatsappFormat: whatsappFormat,
        numberType: "international",
      };
    }
  } catch (error) {
    return {
      success: false,
      error: "Erro interno na conversão: " + error.message,
      originalNumber: phoneNumber,
      whatsappFormat: null,
    };
  }
}

/**
 * Valida múltiplos números de uma vez
 * @param {Array<string>} phoneNumbers - Array de números
 * @returns {Promise<Object>} - Resultado da validação em lote
 */
async function validateMultipleNumbers(phoneNumbers) {
  const results = {
    valid: [],
    invalid: [],
    total: phoneNumbers.length,
  };

  for (const number of phoneNumbers) {
    const result = await convertToWhatsAppFormat(number);
    if (result.success) {
      results.valid.push(result);
    } else {
      results.invalid.push(result);
    }
  }

  return results;
}

module.exports = {
  convertToWhatsAppFormat,
  validateMultipleNumbers,
  cleanNumber,
};
