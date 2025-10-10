// services/droneService.js
const { getDatabaseConnection } = require("../utils/initialize");
const {
  convertToWhatsAppFormat,
  validateMultipleNumbers,
} = require("../utils/validateNumber");
const { client } = require("../client/client");
const { smartDelay } = require("../utils/delay");
const { processVariables } = require("../utils/messageReader");

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
 * Verifica o status de conexão do cliente WhatsApp
 * @returns {Promise<Object>} - Status do cliente
 */
async function verificarStatusCliente() {
  try {
    const state = await client.getState();

    return {
      success: true,
      connected: state === "CONNECTED",
      state: state,
      info: client.info || null,
    };
  } catch (error) {
    return {
      success: false,
      connected: false,
      state: "UNKNOWN",
      error: error.message,
    };
  }
}

/**
 * Executa disparo de mensagens para uma lista de números
 * @param {number} mensagemId - ID da mensagem no banco
 * @param {Array} numeros - Array de números para disparo
 * @param {Function} onProgress - Callback para atualizar progresso
 * @returns {Promise<Object>} - Resultado do disparo
 */
async function executarDisparo(mensagemId, numeros, onProgress = null) {
  try {
    // Verifica se cliente está conectado
    const status = await verificarStatusCliente();
    if (!status.connected) {
      return {
        success: false,
        error: `Cliente WhatsApp não está conectado. Status: ${status.state}`,
        results: [],
      };
    }

    // Busca a mensagem no banco
    const mensagem = await buscarMensagemPorId(mensagemId);
    if (!mensagem) {
      return {
        success: false,
        error: "Mensagem não encontrada",
        results: [],
      };
    }

    const resultados = {
      success: true,
      message: `Disparo iniciado para ${numeros.length} números`,
      total: numeros.length,
      enviados: 0,
      falhas: 0,
      results: [],
    };

    // Executa disparo para cada número
    for (let i = 0; i < numeros.length; i++) {
      const numero = numeros[i];

      try {
        // Atualiza progresso
        if (onProgress) {
          onProgress({
            atual: i + 1,
            total: numeros.length,
            numero: numero.originalNumber,
            status: "enviando",
          });
        }

        // PRIORIDADE: usa customName do CSV, senão busca do WhatsApp
        let name = numero.customName || "";

        // Se não tem customName, tenta buscar do WhatsApp
        if (!name) {
          try {
            const contact = await client.getContactById(numero.whatsappFormat);
            name = contact.pushname?.split(" ")[0] || "";
          } catch (contactError) {
            console.warn(
              `Não foi possível obter contato para ${numero.whatsappFormat}:`,
              contactError.message
            );
          }
        }

        const mensagemPersonalizada = processVariables(
          mensagem.message_content,
          { name }
        );

        // Envia mensagem personalizada
        await client.sendMessage(numero.whatsappFormat, mensagemPersonalizada);

        resultados.enviados++;
        resultados.results.push({
          numero: numero.originalNumber,
          whatsappFormat: numero.whatsappFormat,
          customName: numero.customName || null,
          status: "enviado",
          timestamp: new Date().toISOString(),
        });

        // Atualiza progresso como enviado
        if (onProgress) {
          onProgress({
            atual: i + 1,
            total: numeros.length,
            numero: numero.originalNumber,
            status: "enviado",
          });
        }

        // Delay aleatório entre 1 minuto e 3 minutos entre envios (exceto no último)
        if (i < numeros.length - 1) {
          await smartDelay({ minMs: 60000, maxMs: 180000 });
        }
      } catch (error) {
        resultados.falhas++;
        resultados.results.push({
          numero: numero.originalNumber,
          whatsappFormat: numero.whatsappFormat,
          customName: numero.customName || null,
          status: "falha",
          error: error.message,
          timestamp: new Date().toISOString(),
        });

        // Atualiza progresso como falha
        if (onProgress) {
          onProgress({
            atual: i + 1,
            total: numeros.length,
            numero: numero.originalNumber,
            status: "falha",
            error: error.message,
          });
        }
      }
    }

    resultados.message = `Disparo concluído: ${resultados.enviados} enviados, ${resultados.falhas} falhas`;
    return resultados;
  } catch (error) {
    return {
      success: false,
      error: "Erro interno durante disparo: " + error.message,
      results: [],
    };
  }
}

/**
 * Executa disparo completo com divisão em batches
 * @param {number} mensagemId - ID da mensagem
 * @param {number} batchSize - Tamanho do batch (padrão 200)
 * @param {Function} onProgress - Callback de progresso
 * @param {Function} onBatchComplete - Callback entre batches
 * @returns {Promise<Object>} - Resultado completo
 */
async function executarDisparoCompleto(
  mensagemId,
  batchSize = 200,
  onProgress = null,
  onBatchComplete = null
) {
  try {
    if (numbersInMemory.length === 0) {
      return {
        success: false,
        error: "Nenhum número cadastrado para disparo",
        results: [],
      };
    }

    const totalNumeros = numbersInMemory.length;
    const totalBatches = Math.ceil(totalNumeros / batchSize);

    const resultadoFinal = {
      success: true,
      message: `Disparo completo iniciado: ${totalNumeros} números em ${totalBatches} batch(es)`,
      totalNumeros: totalNumeros,
      totalBatches: totalBatches,
      batchesProcessados: 0,
      totalEnviados: 0,
      totalFalhas: 0,
      batches: [],
    };

    // Processa cada batch
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const inicio = batchIndex * batchSize;
      const fim = Math.min(inicio + batchSize, totalNumeros);
      const numerosBatch = numbersInMemory.slice(inicio, fim);

      console.log(
        `\n🚀 Processando batch ${batchIndex + 1}/${totalBatches} (${
          numerosBatch.length
        } números)`
      );

      // Executa disparo do batch
      const resultadoBatch = await executarDisparo(
        mensagemId,
        numerosBatch,
        (progress) => {
          // Ajusta progresso para incluir informações do batch
          if (onProgress) {
            onProgress({
              ...progress,
              batch: batchIndex + 1,
              totalBatches: totalBatches,
              progressoGeral: {
                atual: resultadoFinal.totalEnviados + progress.atual,
                total: totalNumeros,
              },
            });
          }
        }
      );

      // Atualiza resultado final
      resultadoFinal.batchesProcessados++;
      resultadoFinal.totalEnviados += resultadoBatch.enviados;
      resultadoFinal.totalFalhas += resultadoBatch.falhas;
      resultadoFinal.batches.push({
        batch: batchIndex + 1,
        numeros: numerosBatch.length,
        enviados: resultadoBatch.enviados,
        falhas: resultadoBatch.falhas,
      });

      // Callback de batch completo
      if (onBatchComplete) {
        const continuarProximo = await onBatchComplete({
          batchAtual: batchIndex + 1,
          totalBatches: totalBatches,
          resultado: resultadoBatch,
          temProximo: batchIndex + 1 < totalBatches,
        });

        if (!continuarProximo) {
          resultadoFinal.message += ` (Interrompido após batch ${
            batchIndex + 1
          })`;
          break;
        }
      }

      // Delay entre batches (exceto no último) - 24 a 26 horas
      if (batchIndex < totalBatches - 1) {
        console.log("⏳ Aguardando delay entre batches (24-26 horas)...");
        // 24 horas = 86400000 ms, 26 horas = 93600000 ms
        await smartDelay({ minMs: 86400000, maxMs: 93600000 });
      }
    }

    resultadoFinal.message = `Disparo completo finalizado: ${resultadoFinal.totalEnviados} enviados, ${resultadoFinal.totalFalhas} falhas em ${resultadoFinal.batchesProcessados} batch(es)`;
    return resultadoFinal;
  } catch (error) {
    return {
      success: false,
      error: "Erro durante disparo completo: " + error.message,
      results: [],
    };
  }
}

/**
 * Busca mensagem por ID no banco
 * @param {number} mensagemId - ID da mensagem
 * @returns {Promise<Object|null>} - Mensagem encontrada
 */
async function buscarMensagemPorId(mensagemId) {
  const db = await getDatabaseConnection();

  return new Promise((resolve, reject) => {
    db.get(
      "SELECT * FROM messages WHERE id = ? AND message_type = ?",
      [mensagemId, "drone"],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      }
    );
  });
}

/**
 * Processa arquivo CSV e retorna dados estruturados
 * @param {string} csvContent - Conteúdo do arquivo CSV
 * @returns {Object} - Dados parseados
 */
function parseCSV(csvContent) {
  try {
    const lines = csvContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      return {
        success: false,
        error: "Arquivo CSV vazio",
        data: [],
      };
    }

    const data = [];
    let startIndex = 0;

    // Detecta se primeira linha é cabeçalho
    const firstLine = lines[0];
    const hasHeader = /^[a-zA-Z\s]+[,;]\s*[a-zA-Z\s]+/i.test(firstLine);

    if (hasHeader) {
      startIndex = 1;
      console.log("Cabeçalho detectado e ignorado:", firstLine);
    }

    // Processa linhas de dados
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];

      // Separa por vírgula ou ponto-e-vírgula
      const parts = line.split(/[,;]/).map((p) => p.trim());

      if (parts.length >= 2) {
        const nome = parts[0];
        const numero = parts[1];

        // Valida se tem conteúdo
        if (numero && numero.length > 0) {
          data.push({
            nome: nome || "",
            numero: numero,
            linhaOriginal: i + 1,
          });
        }
      }
    }

    return {
      success: true,
      data: data,
      totalLinhas: data.length,
      tinhaHeader: hasHeader,
    };
  } catch (error) {
    return {
      success: false,
      error: "Erro ao processar CSV: " + error.message,
      data: [],
    };
  }
}

/**
 * Aplica transformações ao número conforme opções escolhidas
 * @param {string} numero - Número original
 * @param {Object} opcoes - Opções de transformação
 * @returns {string} - Número transformado
 */
function aplicarTransformacoes(numero, opcoes = {}) {
  let numeroProcessado = numero.replace(/\D/g, ""); // Remove tudo que não é dígito

  // Aplica prefixo de país (ex: "55")
  if (opcoes.prefixoPais && opcoes.prefixoPais.trim().length > 0) {
    const prefixo = opcoes.prefixoPais.replace(/\D/g, "");
    // Só adiciona se o número não começar com o prefixo
    if (!numeroProcessado.startsWith(prefixo)) {
      numeroProcessado = prefixo + numeroProcessado;
    }
  }

  // Aplica DDD (ex: "11")
  if (opcoes.ddd && opcoes.ddd.trim().length > 0) {
    const ddd = opcoes.ddd.replace(/\D/g, "");

    // Se tem prefixo país (55) e número não tem DDD ainda
    if (opcoes.prefixoPais) {
      const prefixo = opcoes.prefixoPais.replace(/\D/g, "");
      // Se número começa com prefixo e tem menos que 13 dígitos (55 + 11 + 9XXXX)
      if (
        numeroProcessado.startsWith(prefixo) &&
        numeroProcessado.length < 13
      ) {
        // Insere DDD após o prefixo do país
        numeroProcessado =
          prefixo + ddd + numeroProcessado.substring(prefixo.length);
      }
    } else {
      // Sem prefixo país, apenas adiciona DDD no início
      if (!numeroProcessado.startsWith(ddd)) {
        numeroProcessado = ddd + numeroProcessado;
      }
    }
  }

  // Adiciona 9º dígito (somente para números brasileiros)
  if (opcoes.adicionar9Digito === true) {
    // Detecta se é número brasileiro
    let digitosPosicao;

    if (numeroProcessado.startsWith("55")) {
      // Formato: 55 + DDD (2) + número (8 ou 9)
      digitosPosicao = numeroProcessado.substring(4); // Pula "55" + DDD

      // Se tem 8 dígitos, adiciona o 9
      if (digitosPosicao.length === 8) {
        numeroProcessado =
          numeroProcessado.substring(0, 4) + "9" + digitosPosicao;
      }
    } else if (numeroProcessado.length === 10) {
      // Formato sem código país: DDD (2) + número (8)
      const dddParte = numeroProcessado.substring(0, 2);
      const numeroParte = numeroProcessado.substring(2);

      if (numeroParte.length === 8) {
        numeroProcessado = dddParte + "9" + numeroParte;
      }
    }
  }

  return numeroProcessado;
}

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
          customName: opcoes.usarNomesCSV ? registro.nome : null, // Salva nome se opção ativa
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
      customName: null, // Sem nome personalizado
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
          customName: null, // Sem nome personalizado
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

module.exports = {
  listarMensagensDisponiveis,
  adicionarNumero, // DEPRECATED
  adicionarMultiplosNumeros, // DEPRECATED
  adicionarNumerosDeCSV, // NOVA FUNÇÃO PRINCIPAL
  listarNumeros,
  removerNumero,
  limparListaNumeros,
  obterEstatisticas,
  verificarStatusCliente,
  executarDisparo,
  executarDisparoCompleto,
  buscarMensagemPorId,
  parseCSV, // Exporta para testes/uso externo se necessário
  aplicarTransformacoes, // Exporta para testes/uso externo se necessário
};
