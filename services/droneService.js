// services/droneService.js
const { getDatabaseConnection } = require("../utils/initialize");
const {
  convertToWhatsAppFormat,
  validateMultipleNumbers,
} = require("../utils/validateNumber");
const { client } = require("../client/client");
const { smartDelay } = require("../utils/delay");

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

        // Envia mensagem
        await client.sendMessage(
          numero.whatsappFormat,
          mensagem.message_content
        );

        resultados.enviados++;
        resultados.results.push({
          numero: numero.originalNumber,
          whatsappFormat: numero.whatsappFormat,
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

        // Delay entre envios (exceto no último)
        if (i < numeros.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 3000)); // 3 segundos fixo
        }
      } catch (error) {
        resultados.falhas++;
        resultados.results.push({
          numero: numero.originalNumber,
          whatsappFormat: numero.whatsappFormat,
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

      // Delay entre batches (exceto no último)
      if (batchIndex < totalBatches - 1) {
        console.log("⏳ Aguardando delay entre batches...");
        await smartDelay(); // Usa o delay inteligente
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
  verificarStatusCliente,
  executarDisparo,
  executarDisparoCompleto,
  buscarMensagemPorId,
};
