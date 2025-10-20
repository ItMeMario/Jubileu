// services/droneServiceModules/numberManagementDSM.js
const {
  convertToWhatsAppFormat,
  validateMultipleNumbers,
} = require("../../utils/validateNumber");
const { parseCSV } = require("./csvParserDSM");
const { aplicarTransformacoes } = require("./numberTransformDSM");
const {
  adicionarClientesEmLote,
  listarClientesPorStatus,
  listarClientesParaDisparo,
  removerCliente,
  limparClientes,
  obterEstatisticas: obterEstatisticasDB,
  buscarClientePorTel,
} = require("./clientDatabaseDSM");

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
      };
    }

    const { data } = parseResult;
    const clientesParaAdicionar = [];
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

        // Prepara cliente para adicionar ao banco
        clientesParaAdicionar.push({
          name: opcoes.usarNomesCSV ? registro.nome : "",
          tel: result.whatsappFormat,
          dadosOriginais: {
            linha: registro.linhaOriginal,
            nome: registro.nome,
            numeroOriginal: registro.numero,
            numeroFinal: result.whatsappFormat,
          },
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

    // Adiciona todos os clientes ao banco em lote
    if (clientesParaAdicionar.length > 0) {
      const resultadoBanco = await adicionarClientesEmLote(
        clientesParaAdicionar
      );

      // Prepara lista de sucessos para retorno
      const sucessos = clientesParaAdicionar
        .slice(0, resultadoBanco.adicionados)
        .map((c) => c.dadosOriginais);

      // Estatísticas finais
      const stats = await obterEstatisticasDB();

      return {
        success: true,
        message: `CSV processado: ${resultadoBanco.adicionados} adicionados, ${resultadoBanco.jaExistiam} já existiam, ${erros.length} com erro`,
        added: sucessos,
        alreadyExisted: resultadoBanco.jaExistiam,
        errors: erros,
        totalNumbers: stats.success ? stats.stats.total : 0,
        opcoes: opcoes,
      };
    } else {
      return {
        success: false,
        error: "Nenhum número válido para adicionar",
        added: [],
        errors: erros,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: "Erro ao processar CSV: " + error.message,
      added: [],
      errors: [],
    };
  }
}

/**
 * Adiciona um número à lista (DEPRECATED - manter para compatibilidade)
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

    // Verifica se já existe
    const existente = await buscarClientePorTel(result.whatsappFormat);

    if (existente.found) {
      return {
        success: false,
        error: "Número já está na lista",
        originalNumber: phoneNumber,
        whatsappFormat: result.whatsappFormat,
      };
    }

    // Adiciona ao banco usando a função em lote (mais eficiente)
    const resultadoBanco = await adicionarClientesEmLote([
      {
        name: "",
        tel: result.whatsappFormat,
      },
    ]);

    if (resultadoBanco.success && resultadoBanco.adicionados > 0) {
      const stats = await obterEstatisticasDB();

      return {
        success: true,
        message: "Número adicionado com sucesso",
        number: {
          originalNumber: result.originalNumber,
          whatsappFormat: result.whatsappFormat,
        },
        totalNumbers: stats.success ? stats.stats.total : 0,
      };
    } else {
      return {
        success: false,
        error: "Não foi possível adicionar o número",
        originalNumber: phoneNumber,
      };
    }
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
    const clientesParaAdicionar = [];
    const erros = [];

    // Processa números válidos
    for (const validResult of results.valid) {
      clientesParaAdicionar.push({
        name: "",
        tel: validResult.whatsappFormat,
      });
    }

    // Adiciona erros de validação
    results.invalid.forEach((invalidResult) => {
      erros.push({
        originalNumber: invalidResult.originalNumber,
        error: invalidResult.error,
      });
    });

    // Adiciona ao banco
    if (clientesParaAdicionar.length > 0) {
      const resultadoBanco = await adicionarClientesEmLote(
        clientesParaAdicionar
      );

      const stats = await obterEstatisticasDB();

      return {
        success: true,
        message: `Processamento concluído: ${resultadoBanco.adicionados} adicionados, ${resultadoBanco.jaExistiam} já existiam, ${erros.length} com erro`,
        added: resultadoBanco.adicionados,
        alreadyExisted: resultadoBanco.jaExistiam,
        errors: erros,
        totalNumbers: stats.success ? stats.stats.total : 0,
      };
    } else {
      return {
        success: false,
        error: "Nenhum número válido para adicionar",
        errors: erros,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: "Erro interno ao processar múltiplos números: " + error.message,
    };
  }
}

/**
 * Lista todos os números do banco
 * @returns {Promise<Object>} - Lista de números
 */
async function listarNumeros() {
  try {
    const resultado = await listarClientesPorStatus(null);

    if (!resultado.success) {
      return {
        success: false,
        error: resultado.error,
        numbers: [],
        total: 0,
      };
    }

    // Transforma o formato do banco para o formato esperado
    const numbers = resultado.clients.map((client) => ({
      id: client.id,
      originalNumber: client.tel,
      cleanedNumber: client.tel,
      finalNumber: client.tel,
      whatsappFormat: client.tel,
      numberType: "stored", // Tipo genérico pois já está validado
      customName: client.name || null,
      status: client.status,
    }));

    return {
      success: true,
      numbers: numbers,
      total: resultado.total,
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
    const resultado = await removerCliente(id);

    if (!resultado.success) {
      return {
        success: false,
        error: resultado.message || "Número não encontrado na lista",
      };
    }

    const stats = await obterEstatisticasDB();

    return {
      success: true,
      message: "Número removido com sucesso",
      totalNumbers: stats.success ? stats.stats.total : 0,
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
    const resultado = await limparClientes();

    if (!resultado.success) {
      return {
        success: false,
        error: resultado.error,
      };
    }

    return {
      success: true,
      message: `Lista limpa com sucesso. ${resultado.totalRemoved} números removidos.`,
      totalRemoved: resultado.totalRemoved,
    };
  } catch (error) {
    return {
      success: false,
      error: "Erro ao limpar lista: " + error.message,
    };
  }
}

/**
 * Limpa números por status específico
 * @param {string} status - Status para filtrar ('pending', 'sent', 'failed')
 * @returns {Promise<Object>} - Resultado da operação
 */
async function limparClientesPorStatus(status) {
  try {
    const {
      limparClientesPorStatus: limparPorStatus,
    } = require("./clientDatabaseDSM");
    const resultado = await limparPorStatus(status);

    if (!resultado.success) {
      return {
        success: false,
        error: resultado.error,
      };
    }

    return {
      success: true,
      message: resultado.message,
      totalRemoved: resultado.totalRemoved,
      status: resultado.status,
    };
  } catch (error) {
    return {
      success: false,
      error: "Erro ao limpar por status: " + error.message,
    };
  }
}

/**
 * Obtém estatísticas da lista de números
 * @returns {Promise<Object>} - Estatísticas
 */
async function obterEstatisticas() {
  try {
    const resultado = await obterEstatisticasDB();

    if (!resultado.success) {
      return {
        success: false,
        error: resultado.error,
      };
    }

    // Adapta formato para manter compatibilidade
    const stats = {
      total: resultado.stats.total,
      porStatus: resultado.stats.porStatus,
      comNomePersonalizado: resultado.stats.comNome,
      semNomePersonalizado: resultado.stats.semNome,
    };

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
 * Obtém a lista de números prontos para disparo (para uso interno dos módulos)
 * Substitui o antigo getNumbersInMemory()
 * @returns {Promise<Array>} - Array de números no formato esperado pelo disparo
 */
async function getNumbersInMemory() {
  try {
    const resultado = await listarClientesParaDisparo();

    if (!resultado.success) {
      console.error("Erro ao buscar números para disparo:", resultado.error);
      return [];
    }

    // Transforma para o formato esperado pelo messageDispatchDSM
    return resultado.clients.map((client) => ({
      id: client.id,
      originalNumber: client.tel,
      cleanedNumber: client.tel,
      finalNumber: client.tel,
      whatsappFormat: client.tel,
      numberType: "stored",
      customName: client.name || null,
      status: client.status,
    }));
  } catch (error) {
    console.error("Erro ao obter números para disparo:", error);
    return [];
  }
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
