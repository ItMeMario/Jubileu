// utils/telNumberConversor.js

/**
 * Converte números de telefone para o formato do WhatsApp Web.js
 * Formato de saída: CÓDIGO_PAÍS + DDD + NÚMERO + @c.us
 * Ex: 5511999999999@c.us
 */

/**
 * Remove todos os caracteres não numéricos do número
 * @param {string} number - Número de telefone
 * @returns {string} - Número apenas com dígitos
 */
function cleanNumber(number) {
  return number.toString().replace(/\D/g, "");
}

/**
 * Verifica se um número é válido para o Brasil
 * @param {string} cleanedNumber - Número limpo (apenas dígitos)
 * @returns {boolean}
 */
function isValidBrazilianNumber(cleanedNumber) {
  // Formato: 11 dígitos (DDD + 9 dígitos) ou 10 dígitos (DDD + 8 dígitos para fixo)
  // Com código do país: 13 dígitos (55 + 11) ou 12 dígitos (55 + 10)

  if (cleanedNumber.length === 11) {
    // DDD + celular (9 + 8 dígitos)
    const ddd = cleanedNumber.substring(0, 2);
    const firstDigit = cleanedNumber.substring(2, 3);
    return (
      isValidDDD(ddd) &&
      (firstDigit === "9" || firstDigit === "8" || firstDigit === "7")
    );
  }

  if (cleanedNumber.length === 10) {
    // DDD + fixo (8 dígitos)
    const ddd = cleanedNumber.substring(0, 2);
    const firstDigit = cleanedNumber.substring(2, 3);
    return isValidDDD(ddd) && ["2", "3", "4", "5"].includes(firstDigit);
  }

  if (cleanedNumber.length === 13 && cleanedNumber.startsWith("55")) {
    // 55 + DDD + celular
    const ddd = cleanedNumber.substring(2, 4);
    const firstDigit = cleanedNumber.substring(4, 5);
    return (
      isValidDDD(ddd) &&
      (firstDigit === "9" || firstDigit === "8" || firstDigit === "7")
    );
  }

  if (cleanedNumber.length === 12 && cleanedNumber.startsWith("55")) {
    // 55 + DDD + fixo
    const ddd = cleanedNumber.substring(2, 4);
    const firstDigit = cleanedNumber.substring(4, 5);
    return isValidDDD(ddd) && ["2", "3", "4", "5"].includes(firstDigit);
  }

  return false;
}

/**
 * Verifica se o DDD é válido no Brasil
 * @param {string} ddd - Código de área
 * @returns {boolean}
 */
function isValidDDD(ddd) {
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

  return validDDDs.includes(ddd);
}

/**
 * Detecta se o número é internacional (não brasileiro)
 * @param {string} cleanedNumber - Número limpo
 * @returns {boolean}
 */
function isInternationalNumber(cleanedNumber) {
  // Se tem mais de 13 dígitos ou não começa com 55 (e tem código de país), é internacional
  if (cleanedNumber.length > 13) return true;

  // Se tem entre 7-15 dígitos e não é um padrão brasileiro válido
  if (cleanedNumber.length >= 7 && cleanedNumber.length <= 15) {
    return !isValidBrazilianNumber(cleanedNumber);
  }

  return false;
}

/**
 * Converte número brasileiro para formato WhatsApp
 * @param {string} cleanedNumber - Número limpo
 * @returns {string} - Número no formato WhatsApp
 */
function convertBrazilianNumber(cleanedNumber) {
  // Se já tem código do país (55)
  if (cleanedNumber.startsWith("55")) {
    return cleanedNumber;
  }

  // Adiciona código do país
  return "55" + cleanedNumber;
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
        error: "Número muito curto",
        originalNumber: phoneNumber,
        whatsappFormat: null,
      };
    }

    let finalNumber;
    let numberType = "unknown";

    // Verifica se é internacional
    if (isInternationalNumber(cleaned)) {
      finalNumber = cleaned;
      numberType = "international";
    }
    // Verifica se é brasileiro
    else if (isValidBrazilianNumber(cleaned)) {
      finalNumber = convertBrazilianNumber(cleaned);
      numberType = "brazilian";
    }
    // Tenta assumir como brasileiro se possível
    else {
      // Se tem 10 ou 11 dígitos, assume como brasileiro
      if (cleaned.length === 10 || cleaned.length === 11) {
        finalNumber = convertBrazilianNumber(cleaned);
        numberType = "brazilian_assumed";
      } else {
        return {
          success: false,
          error: "Formato de número não reconhecido",
          originalNumber: phoneNumber,
          whatsappFormat: null,
        };
      }
    }

    const whatsappFormat = finalNumber + "@c.us";

    return {
      success: true,
      error: null,
      originalNumber: phoneNumber,
      cleanedNumber: cleaned,
      finalNumber: finalNumber,
      whatsappFormat: whatsappFormat,
      numberType: numberType,
    };
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
  isValidBrazilianNumber,
};
