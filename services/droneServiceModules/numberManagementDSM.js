// services/droneServiceModules/numberManagementDSM.js
const {
  convertToWhatsAppFormat,
  validateMultipleNumbers,
} = require("../../utils/validateNumber");
const { parseCSV } = require("./csvParserDSM");
const { aplicarTransformacoes } = require("./numberTransformDSM");

// Array em memória para armazenar os números
let numbersInMemory = [];

/**
 * Adiciona números de arquivo CSV com opções de transformação
 * @param {string} csvContent - Conteúdo do CSV
 * @param {Object} opcoes - Opções de processamento
 * @returns {Promise<Object>} - Resultado do processamento
 */
async function adicionarNumerosDeCSV(csvContent, opcoes = {}) {
  try {
    // Parse do CSV
    const parseResult = parseCSV(csvContent);

    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error,
        added: [],
        errors: [],
        totalNumbers: numbersInMemory.length,
      };
    }

    const { data } = parseResult;
    const sucessos = [];
    const erros = [];

    console.log(`Processando ${data.length} registros do CSV...`);
    console.log("Opções:", opcoes);

    // Processa cada linha do CSV
    for (const registro of data) {
      try {
        // Aplica transformações ao número
        const numeroTransformado = aplicarTransformacoes(registro.numero, {
          prefixoPais: opcoes.prefixoPais || "",
          ddd: opcoes.ddd || "",
          adicionar9Digito: opcoes.adicionar9Digito || false,
        });

        // Converte para formato WhatsApp
        const result = await convertToWhatsAppFormat(numeroTransformado);

        if (!result.success) {
          erros.push({
            linha: registro.linhaOriginal,
            nome: registro.nome,
            numeroOriginal: registro.numero,
            numeroTransformado: numeroTransformado,
            error: result.error,
          });
          continue;
        }

        // Verifica se número já existe
        const numeroJaExiste = numbersInMemory.some(
          (item) => item.whatsappFormat === result.whatsappFormat
        );

        if (numeroJaExiste) {
          erros.push({
            linha: registro.linhaOriginal,
            nome: registro.nome,
            numeroOriginal: registro.numero,
            numeroTransformado: numeroTransformado,
            error: "Número já existe na lista",
          });
          continue;
        }

        // Adiciona à memória com nome personalizado
        const numeroParaAdicionar = {
          id: Date.now() + Math.random(),
          originalNumber: result.originalNumber,
          cleanedNumber: result.cleanedNumber,
          finalNumber: result.finalNumber,
          whatsappFormat: result.whatsappFormat,
          numberType: result.numberType,
          customName: opcoes.usarNomesCSV ? registro.nome : null,
          addedAt: new Date().toISOString(),
        };

        numbersInMemory.push(numeroParaAdicionar);
        sucessos.push({
          linha: registro.linhaOriginal,
          nome: registro.nome,
          numeroOriginal: registro.numero,
          numeroFinal: numeroParaAdicionar.whatsappFormat,
        });
      } catch (error) {
        erros.push({
          linha: registro.linhaOriginal,
          nome: registro.nome,
          numeroOriginal: registro.numero,
          error: error.message,
        });
      }
    }

    return {
      success: true,
      message: `CSV processado: ${sucessos.length} adicionados, ${erros.length} com erro`,
      added: sucessos,
      errors: erros,
      totalNumbers: numbersInMemory.length,
      opcoes: opcoes,
    };
  } catch (error) {
    return {
      success: false,
      error: "Erro ao processar CSV: " + error.message,
      added: [],
      errors: [],
      totalNumbers: numbersInMemory.length,
    };
  }
}

/**
 * Adiciona um número à lista em memória (DEPRECATED - manter para compatibilidade)
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
      id: Date.now(),
      originalNumber: result.originalNumber,
      cleanedNumber: result.cleanedNumber,
      finalNumber: result.finalNumber,
      whatsappFormat: result.whatsappFormat,
      numberType: result.numberType,
      customName: null,
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
 * Adiciona múltiplos números à lista (DEPRECATED - usar adicionarNumerosDeCSV)
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
          id: Date.now() + Math.random(),
          originalNumber: validResult.originalNumber,
          cleanedNumber: validResult.cleanedNumber,
          finalNumber: validResult.finalNumber,
          whatsappFormat: validResult.whatsappFormat,
          numberType: validResult.numberType,
          customName: null,
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
      numbers: [...numbersInMemory],
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
      comNomePersonalizado: 0,
      semNomePersonalizado: 0,
      maisRecente: null,
      maisAntigo: null,
    };

    if (numbersInMemory.length > 0) {
      // Conta por tipo e nomes
      numbersInMemory.forEach((num) => {
        if (stats.porTipo[num.numberType] !== undefined) {
          stats.porTipo[num.numberType]++;
        } else {
          stats.porTipo.unknown++;
        }

        if (num.customName) {
          stats.comNomePersonalizado++;
        } else {
          stats.semNomePersonalizado++;
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

/**
 * Obtém a lista de números em memória (para uso interno dos módulos)
 * @returns {Array} - Array de números
 */
function getNumbersInMemory() {
  return numbersInMemory;
}

module.exports = {
  adicionarNumerosDeCSV,
  adicionarNumero,
  adicionarMultiplosNumeros,
  listarNumeros,
  removerNumero,
  limparListaNumeros,
  obterEstatisticas,
  getNumbersInMemory,
};
