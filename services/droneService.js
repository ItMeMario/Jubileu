// services/droneService.js
const { getDatabaseConnection } = require("../utils/initialize");
const {
  convertToWhatsAppFormat,
  validateMultipleNumbers,
} = require("../utils/telNumberConversor");

// Array em memória para armazenar os números
let numbersInMemory = [];

async function listarMensagensDisponiveis() {
  const db = await getDatabaseConnection();

  return new Promise((resolve, reject) => {
    db.all(
      "SELECT * FROM messages WHERE message_type = ?",
      ["drone"],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      }
    );
  });
}

/**
 * Adiciona um número à lista em memória
 * @param {string} phoneNumber - Número de telefone
 * @returns {Promise<Object>} - Resultado da operação
 */
async function adicionarNumero(phoneNumber) {
  try {
    const result = await convertToWhatsAppFormat(phoneNumber);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        originalNumber: phoneNumber,
      };
    }

    // Verifica se o número já existe na lista
    const numeroJaExiste = numbersInMemory.some(
      (item) => item.whatsappFormat === result.whatsappFormat
    );

    if (numeroJaExiste) {
      return {
        success: false,
        error: "Número já está na lista",
        originalNumber: phoneNumber,
        whatsappFormat: result.whatsappFormat,
      };
    }

    // Adiciona o número à lista com timestamp
    const numeroParaAdicionar = {
      id: Date.now(), // ID único baseado em timestamp
      originalNumber: result.originalNumber,
      cleanedNumber: result.cleanedNumber,
      finalNumber: result.finalNumber,
      whatsappFormat: result.whatsappFormat,
      numberType: result.numberType,
      addedAt: new Date().toISOString(),
    };

    numbersInMemory.push(numeroParaAdicionar);

    return {
      success: true,
      message: "Número adicionado com sucesso",
      number: numeroParaAdicionar,
      totalNumbers: numbersInMemory.length,
    };
  } catch (error) {
    return {
      success: false,
      error: "Erro interno ao adicionar número: " + error.message,
      originalNumber: phoneNumber,
    };
  }
}

/**
 * Adiciona múltiplos números à lista
 * @param {Array<string>} phoneNumbers - Array de números de telefone
 * @returns {Promise<Object>} - Resultado da operação em lote
 */
async function adicionarMultiplosNumeros(phoneNumbers) {
  try {
    const results = await validateMultipleNumbers(phoneNumbers);
    const sucessos = [];
    const erros = [];

    // Processa números válidos
    for (const validResult of results.valid) {
      // Verifica se já existe
      const numeroJaExiste = numbersInMemory.some(
        (item) => item.whatsappFormat === validResult.whatsappFormat
      );

      if (!numeroJaExiste) {
        const numeroParaAdicionar = {
          id: Date.now() + Math.random(), // ID único
          originalNumber: validResult.originalNumber,
          cleanedNumber: validResult.cleanedNumber,
          finalNumber: validResult.finalNumber,
          whatsappFormat: validResult.whatsappFormat,
          numberType: validResult.numberType,
          addedAt: new Date().toISOString(),
        };

        numbersInMemory.push(numeroParaAdicionar);
        sucessos.push(numeroParaAdicionar);
      } else {
        erros.push({
          originalNumber: validResult.originalNumber,
          error: "Número já existe na lista",
        });
      }
    }

    // Adiciona erros de validação
    results.invalid.forEach((invalidResult) => {
      erros.push({
        originalNumber: invalidResult.originalNumber,
        error: invalidResult.error,
      });
    });

    return {
      success: true,
      message: `Processamento concluído: ${sucessos.length} adicionados, ${erros.length} com erro`,
      added: sucessos,
      errors: erros,
      totalNumbers: numbersInMemory.length,
    };
  } catch (error) {
    return {
      success: false,
      error: "Erro interno ao processar múltiplos números: " + error.message,
    };
  }
}

/**
 * Lista todos os números em memória
 * @returns {Promise<Array>} - Lista de números
 */
async function listarNumeros() {
  try {
    return {
      success: true,
      numbers: [...numbersInMemory], // Retorna cópia do array
      total: numbersInMemory.length,
    };
  } catch (error) {
    return {
      success: false,
      error: "Erro ao listar números: " + error.message,
      numbers: [],
      total: 0,
    };
  }
}

/**
 * Remove um número específico da lista
 * @param {number|string} id - ID do número ou número em formato WhatsApp
 * @returns {Promise<Object>} - Resultado da operação
 */
async function removerNumero(id) {
  try {
    const indexToRemove = numbersInMemory.findIndex(
      (item) => item.id == id || item.whatsappFormat === id
    );

    if (indexToRemove === -1) {
      return {
        success: false,
        error: "Número não encontrado na lista",
      };
    }

    const numeroRemovido = numbersInMemory.splice(indexToRemove, 1)[0];

    return {
      success: true,
      message: "Número removido com sucesso",
      removedNumber: numeroRemovido,
      totalNumbers: numbersInMemory.length,
    };
  } catch (error) {
    return {
      success: false,
      error: "Erro ao remover número: " + error.message,
    };
  }
}

/**
 * Limpa toda a lista de números
 * @returns {Promise<Object>} - Resultado da operação
 */
async function limparListaNumeros() {
  try {
    const totalRemovidos = numbersInMemory.length;
    numbersInMemory = [];

    return {
      success: true,
      message: `Lista limpa com sucesso. ${totalRemovidos} números removidos.`,
      totalRemoved: totalRemovidos,
    };
  } catch (error) {
    return {
      success: false,
      error: "Erro ao limpar lista: " + error.message,
    };
  }
}

/**
 * Obtém estatísticas da lista de números
 * @returns {Promise<Object>} - Estatísticas
 */
async function obterEstatisticas() {
  try {
    const stats = {
      total: numbersInMemory.length,
      porTipo: {
        brazilian: 0,
        international: 0,
        brazilian_assumed: 0,
        unknown: 0,
      },
      maisRecente: null,
      maisAntigo: null,
    };

    if (numbersInMemory.length > 0) {
      // Conta por tipo
      numbersInMemory.forEach((num) => {
        if (stats.porTipo[num.numberType] !== undefined) {
          stats.porTipo[num.numberType]++;
        } else {
          stats.porTipo.unknown++;
        }
      });

      // Encontra mais recente e mais antigo
      const sorted = [...numbersInMemory].sort(
        (a, b) => new Date(a.addedAt) - new Date(b.addedAt)
      );

      stats.maisAntigo = sorted[0];
      stats.maisRecente = sorted[sorted.length - 1];
    }

    return {
      success: true,
      stats,
    };
  } catch (error) {
    return {
      success: false,
      error: "Erro ao obter estatísticas: " + error.message,
    };
  }
}

module.exports = {
  listarMensagensDisponiveis,
  adicionarNumero,
  adicionarMultiplosNumeros,
  listarNumeros,
  removerNumero,
  limparListaNumeros,
  obterEstatisticas,
};
