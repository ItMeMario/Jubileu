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
  limparClientesPorStatus: limparClientesPorStatusDB,
  obterEstatisticas: obterEstatisticasDB,
  buscarClientePorTel,
} = require("./clientDatabaseDSM");

/**
 * Adiciona números de arquivo CSV com opções de transformação
 * @param {string} instanceId - ID da instância
 * @param {string} csvContent - Conteúdo do CSV
 * @param {Object} opcoes - Opções de processamento
 * @returns {Promise<Object>} - Resultado do processamento
 */
async function adicionarNumerosDeCSV(instanceId, csvContent, opcoes = {}) {
  if (!instanceId) {
    return {
      success: false,
      error: "instanceId é obrigatório",
      added: [],
      errors: [],
    };
  }

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

    console.log(
      `[${instanceId}] Processando ${data.length} registros do CSV...`
    );
    console.log(`[${instanceId}] Opções:`, opcoes);

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
        instanceId,
        clientesParaAdicionar
      );

      // Prepara lista de sucessos para retorno
      const sucessos = clientesParaAdicionar
        .slice(0, resultadoBanco.adicionados)
        .map((c) => c.dadosOriginais);

      // Estatísticas finais
      const stats = await obterEstatisticasDB(instanceId);

      return {
        success: true,
        message: `CSV processado: ${resultadoBanco.adicionados} adicionados, ${resultadoBanco.jaExistiam} já existiam, ${erros.length} com erro`,
        added: sucessos,
        alreadyExisted: resultadoBanco.jaExistiam,
        errors: erros,
        totalNumbers: stats.success ? stats.stats.total : 0,
        opcoes: opcoes,
        instanceId: instanceId,
      };
    } else {
      return {
        success: false,
        error: "Nenhum número válido para adicionar",
        added: [],
        errors: erros,
        instanceId: instanceId,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: "Erro ao processar CSV: " + error.message,
      added: [],
      errors: [],
      instanceId: instanceId,
    };
  }
}

/**
 * Adiciona um número à lista
 * @param {string} instanceId - ID da instância
 * @param {string} phoneNumber - Número de telefone
 * @returns {Promise<Object>} - Resultado da operação
 */
async function adicionarNumero(instanceId, phoneNumber) {
  if (!instanceId) {
    return {
      success: false,
      error: "instanceId é obrigatório",
      originalNumber: phoneNumber,
    };
  }

  try {
    const result = await convertToWhatsAppFormat(phoneNumber);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        originalNumber: phoneNumber,
      };
    }

    // Verifica se já existe nesta instância
    const existente = await buscarClientePorTel(
      instanceId,
      result.whatsappFormat
    );

    if (existente.found) {
      return {
        success: false,
        error: "Número já está na lista desta instância",
        originalNumber: phoneNumber,
        whatsappFormat: result.whatsappFormat,
        instanceId: instanceId,
      };
    }

    // Adiciona ao banco
    const resultadoBanco = await adicionarClientesEmLote(instanceId, [
      {
        name: "",
        tel: result.whatsappFormat,
      },
    ]);

    if (resultadoBanco.success && resultadoBanco.adicionados > 0) {
      const stats = await obterEstatisticasDB(instanceId);

      return {
        success: true,
        message: "Número adicionado com sucesso",
        number: {
          originalNumber: result.originalNumber,
          whatsappFormat: result.whatsappFormat,
        },
        totalNumbers: stats.success ? stats.stats.total : 0,
        instanceId: instanceId,
      };
    } else {
      return {
        success: false,
        error: "Não foi possível adicionar o número",
        originalNumber: phoneNumber,
        instanceId: instanceId,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: "Erro interno ao adicionar número: " + error.message,
      originalNumber: phoneNumber,
      instanceId: instanceId,
    };
  }
}

/**
 * Adiciona múltiplos números à lista
 * @param {string} instanceId - ID da instância
 * @param {Array<string>} phoneNumbers - Array de números de telefone
 * @returns {Promise<Object>} - Resultado da operação em lote
 */
async function adicionarMultiplosNumeros(instanceId, phoneNumbers) {
  if (!instanceId) {
    return {
      success: false,
      error: "instanceId é obrigatório",
    };
  }

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
        instanceId,
        clientesParaAdicionar
      );

      const stats = await obterEstatisticasDB(instanceId);

      return {
        success: true,
        message: `Processamento concluído: ${resultadoBanco.adicionados} adicionados, ${resultadoBanco.jaExistiam} já existiam, ${erros.length} com erro`,
        added: resultadoBanco.adicionados,
        alreadyExisted: resultadoBanco.jaExistiam,
        errors: erros,
        totalNumbers: stats.success ? stats.stats.total : 0,
        instanceId: instanceId,
      };
    } else {
      return {
        success: false,
        error: "Nenhum número válido para adicionar",
        errors: erros,
        instanceId: instanceId,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: "Erro interno ao processar múltiplos números: " + error.message,
      instanceId: instanceId,
    };
  }
}

/**
 * Lista todos os números de uma instância
 * @param {string} instanceId - ID da instância
 * @param {string|null} status - Filtro de status (opcional)
 * @returns {Promise<Object>} - Lista de números
 */
async function listarNumeros(instanceId, status = null) {
  if (!instanceId) {
    return {
      success: false,
      error: "instanceId é obrigatório",
      numbers: [],
      total: 0,
    };
  }

  try {
    const resultado = await listarClientesPorStatus(instanceId, status);

    if (!resultado.success) {
      return {
        success: false,
        error: resultado.error,
        numbers: [],
        total: 0,
        instanceId: instanceId,
      };
    }

    // Transforma o formato do banco para o formato esperado
    const numbers = resultado.clients.map((client) => ({
      id: client.id,
      originalNumber: client.tel,
      cleanedNumber: client.tel,
      finalNumber: client.tel,
      whatsappFormat: client.tel,
      numberType: "stored",
      customName: client.name || null,
      status: client.status,
      createdAt: client.created_at,
      updatedAt: client.updated_at,
    }));

    return {
      success: true,
      numbers: numbers,
      total: resultado.total,
      instanceId: instanceId,
    };
  } catch (error) {
    return {
      success: false,
      error: "Erro ao listar números: " + error.message,
      numbers: [],
      total: 0,
      instanceId: instanceId,
    };
  }
}

/**
 * Remove um número específico da lista de uma instância
 * @param {string} instanceId - ID da instância
 * @param {number|string} id - ID do número ou número em formato WhatsApp
 * @returns {Promise<Object>} - Resultado da operação
 */
async function removerNumero(instanceId, id) {
  if (!instanceId) {
    return {
      success: false,
      error: "instanceId é obrigatório",
    };
  }

  try {
    const resultado = await removerCliente(instanceId, id);

    if (!resultado.success) {
      return {
        success: false,
        error: resultado.message || "Número não encontrado na lista",
        instanceId: instanceId,
      };
    }

    const stats = await obterEstatisticasDB(instanceId);

    return {
      success: true,
      message: "Número removido com sucesso",
      totalNumbers: stats.success ? stats.stats.total : 0,
      instanceId: instanceId,
    };
  } catch (error) {
    return {
      success: false,
      error: "Erro ao remover número: " + error.message,
      instanceId: instanceId,
    };
  }
}

/**
 * Limpa toda a lista de números de uma instância
 * @param {string} instanceId - ID da instância
 * @returns {Promise<Object>} - Resultado da operação
 */
async function limparListaNumeros(instanceId) {
  if (!instanceId) {
    return {
      success: false,
      error: "instanceId é obrigatório",
    };
  }

  try {
    const resultado = await limparClientes(instanceId);

    if (!resultado.success) {
      return {
        success: false,
        error: resultado.error,
        instanceId: instanceId,
      };
    }

    return {
      success: true,
      message: `Lista limpa com sucesso. ${resultado.totalRemoved} números removidos.`,
      totalRemoved: resultado.totalRemoved,
      instanceId: instanceId,
    };
  } catch (error) {
    return {
      success: false,
      error: "Erro ao limpar lista: " + error.message,
      instanceId: instanceId,
    };
  }
}

/**
 * Limpa números por status específico de uma instância
 * @param {string} instanceId - ID da instância
 * @param {string} status - Status para filtrar ('pending', 'sent', 'failed')
 * @returns {Promise<Object>} - Resultado da operação
 */
async function limparNumerosPorStatus(instanceId, status) {
  if (!instanceId) {
    return {
      success: false,
      error: "instanceId é obrigatório",
    };
  }

  try {
    const resultado = await limparClientesPorStatusDB(instanceId, status);

    if (!resultado.success) {
      return {
        success: false,
        error: resultado.error,
        instanceId: instanceId,
      };
    }

    return {
      success: true,
      message: resultado.message,
      totalRemoved: resultado.totalRemoved,
      status: resultado.status,
      instanceId: instanceId,
    };
  } catch (error) {
    return {
      success: false,
      error: "Erro ao limpar por status: " + error.message,
      instanceId: instanceId,
    };
  }
}

/**
 * Obtém estatísticas da lista de números de uma instância
 * @param {string} instanceId - ID da instância
 * @returns {Promise<Object>} - Estatísticas
 */
async function obterEstatisticas(instanceId) {
  if (!instanceId) {
    return {
      success: false,
      error: "instanceId é obrigatório",
    };
  }

  try {
    const resultado = await obterEstatisticasDB(instanceId);

    if (!resultado.success) {
      return {
        success: false,
        error: resultado.error,
        instanceId: instanceId,
      };
    }

    // Calcula percentuais
    const total = resultado.stats.total || 0;
    const percentuais = {
      pending:
        total > 0
          ? ((resultado.stats.porStatus.pending / total) * 100).toFixed(1)
          : 0,
      sent:
        total > 0
          ? ((resultado.stats.porStatus.sent / total) * 100).toFixed(1)
          : 0,
      failed:
        total > 0
          ? ((resultado.stats.porStatus.failed / total) * 100).toFixed(1)
          : 0,
    };

    // Adapta formato para manter compatibilidade
    const stats = {
      total: resultado.stats.total,
      porStatus: resultado.stats.porStatus,
      percentuais: percentuais,
      comNomePersonalizado: resultado.stats.comNome,
      semNomePersonalizado: resultado.stats.semNome,
    };

    return {
      success: true,
      stats,
      instanceId: instanceId,
    };
  } catch (error) {
    return {
      success: false,
      error: "Erro ao obter estatísticas: " + error.message,
      instanceId: instanceId,
    };
  }
}

/**
 * Obtém a lista de números prontos para disparo de uma instância
 * @param {string} instanceId - ID da instância
 * @returns {Promise<Array>} - Array de números no formato esperado pelo disparo
 */
async function getNumbersForDispatch(instanceId) {
  if (!instanceId) {
    console.error("getNumbersForDispatch: instanceId é obrigatório");
    return [];
  }

  try {
    const resultado = await listarClientesParaDisparo(instanceId);

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

/**
 * @deprecated Use getNumbersForDispatch(instanceId) em vez disso
 */
async function getNumbersInMemory() {
  console.warn(
    "DEPRECATED: getNumbersInMemory() está obsoleto. Use getNumbersForDispatch(instanceId)"
  );
  return [];
}

module.exports = {
  adicionarNumerosDeCSV,
  adicionarNumero,
  adicionarMultiplosNumeros,
  listarNumeros,
  removerNumero,
  limparListaNumeros,
  limparNumerosPorStatus,
  obterEstatisticas,
  getNumbersForDispatch,
  getNumbersInMemory, // Mantido para compatibilidade (deprecated)
};
