// services/droneServiceModules/messageDispatchDSM.js
const { instanceManager } = require("../instanceManager");
const { smartDelay } = require("../../utils/delay");
const { processVariables } = require("../../utils/messageReader");
const { getNumbersForDispatch } = require("./numberManagementDSM");
const { buscarMensagemPorId } = require("./messageDatabaseDSM");
const { verificarStatusCliente } = require("./clientStatusDSM");
const {
  atualizarStatusCliente,
  atualizarStatusClientePorId,
} = require("./clientDatabaseDSM");

/**
 * Obtém o cliente de uma instância específica
 * @param {string} instanceId - ID da instância
 * @returns {Object|null} - Cliente WhatsApp ou null
 */
function getClient(instanceId) {
  return instanceManager.getClient(instanceId);
}

/**
 * Executa disparo de mensagens para uma lista de números
 * @param {string} instanceId - ID da instância a ser usada
 * @param {number} mensagemId - ID da mensagem no banco
 * @param {Array} numeros - Array de números para disparo
 * @param {Function} onProgress - Callback para atualizar progresso
 * @returns {Promise<Object>} - Resultado do disparo
 */
async function executarDisparo(
  instanceId,
  mensagemId,
  numeros,
  onProgress = null
) {
  try {
    // Valida instanceId
    if (!instanceId) {
      return {
        success: false,
        error: "instanceId é obrigatório para executar disparo",
        results: [],
      };
    }

    // Verifica se cliente está conectado
    const status = await verificarStatusCliente(instanceId);
    if (!status.connected) {
      return {
        success: false,
        error: `Cliente WhatsApp não está conectado. Status: ${status.state}`,
        results: [],
        instanceId: instanceId,
      };
    }

    // Obtém o cliente da instância
    const client = getClient(instanceId);
    if (!client) {
      return {
        success: false,
        error: "Cliente não encontrado para a instância selecionada",
        results: [],
        instanceId: instanceId,
      };
    }

    // Busca a mensagem no banco
    const mensagem = await buscarMensagemPorId(mensagemId);
    if (!mensagem) {
      return {
        success: false,
        error: "Mensagem não encontrada",
        results: [],
        instanceId: instanceId,
      };
    }

    const resultados = {
      success: true,
      message: `Disparo iniciado para ${numeros.length} números`,
      total: numeros.length,
      enviados: 0,
      falhas: 0,
      results: [],
      instanceId: instanceId,
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
            instanceId: instanceId,
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
              `[${instanceId}] Não foi possível obter contato para ${numero.whatsappFormat}:`,
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

        // ✅ ATUALIZA STATUS NO BANCO COMO 'sent' (usando ID para garantir instância correta)
        if (numero.id) {
          await atualizarStatusClientePorId(numero.id, "sent");
        } else {
          await atualizarStatusCliente(
            instanceId,
            numero.whatsappFormat,
            "sent"
          );
        }

        resultados.enviados++;
        resultados.results.push({
          numero: numero.originalNumber,
          whatsappFormat: numero.whatsappFormat,
          customName: numero.customName || null,
          status: "enviado",
          timestamp: new Date().toISOString(),
          instanceId: instanceId,
        });

        // Atualiza progresso como enviado
        if (onProgress) {
          onProgress({
            atual: i + 1,
            total: numeros.length,
            numero: numero.originalNumber,
            status: "enviado",
            instanceId: instanceId,
          });
        }

        // Delay aleatório entre 1 minuto e 3 minutos entre envios (exceto no último)
        if (i < numeros.length - 1) {
          await smartDelay({ minMs: 60000, maxMs: 180000 });
        }
      } catch (error) {
        // ❌ ATUALIZA STATUS NO BANCO COMO 'failed' (usando ID para garantir instância correta)
        if (numero.id) {
          await atualizarStatusClientePorId(numero.id, "failed");
        } else {
          await atualizarStatusCliente(
            instanceId,
            numero.whatsappFormat,
            "failed"
          );
        }

        resultados.falhas++;
        resultados.results.push({
          numero: numero.originalNumber,
          whatsappFormat: numero.whatsappFormat,
          customName: numero.customName || null,
          status: "falha",
          error: error.message,
          timestamp: new Date().toISOString(),
          instanceId: instanceId,
        });

        // Atualiza progresso como falha
        if (onProgress) {
          onProgress({
            atual: i + 1,
            total: numeros.length,
            numero: numero.originalNumber,
            status: "falha",
            error: error.message,
            instanceId: instanceId,
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
      instanceId: instanceId,
    };
  }
}

/**
 * Executa disparo completo com divisão em batches
 * @param {string} instanceId - ID da instância a ser usada
 * @param {number} mensagemId - ID da mensagem
 * @param {number} batchSize - Tamanho do batch (padrão 200)
 * @param {Function} onProgress - Callback de progresso
 * @param {Function} onBatchComplete - Callback entre batches
 * @returns {Promise<Object>} - Resultado completo
 */
async function executarDisparoCompleto(
  instanceId,
  mensagemId,
  batchSize = 200,
  onProgress = null,
  onBatchComplete = null
) {
  try {
    // Valida instanceId
    if (!instanceId) {
      return {
        success: false,
        error: "instanceId é obrigatório para executar disparo",
        results: [],
      };
    }

    // Verifica se a instância está conectada antes de começar
    const status = await verificarStatusCliente(instanceId);
    if (!status.connected) {
      return {
        success: false,
        error: `Instância não está conectada. Status: ${status.state}`,
        results: [],
        instanceId: instanceId,
      };
    }

    // 🔄 BUSCA NÚMEROS DO BANCO DA INSTÂNCIA (pending + failed)
    const numbersForDispatch = await getNumbersForDispatch(instanceId);

    if (numbersForDispatch.length === 0) {
      return {
        success: false,
        error: "Nenhum número cadastrado para disparo nesta instância",
        results: [],
        instanceId: instanceId,
      };
    }

    const totalNumeros = numbersForDispatch.length;
    const totalBatches = Math.ceil(totalNumeros / batchSize);

    console.log(
      `[${instanceId}] 📊 Iniciando disparo: ${totalNumeros} números em ${totalBatches} batch(es)`
    );

    const resultadoFinal = {
      success: true,
      message: `Disparo completo iniciado: ${totalNumeros} números em ${totalBatches} batch(es)`,
      totalNumeros: totalNumeros,
      totalBatches: totalBatches,
      batchesProcessados: 0,
      totalEnviados: 0,
      totalFalhas: 0,
      batches: [],
      instanceId: instanceId,
    };

    // Processa cada batch
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      // Verifica se a instância ainda está conectada antes de cada batch
      const statusAtual = await verificarStatusCliente(instanceId);
      if (!statusAtual.connected) {
        resultadoFinal.success = false;
        resultadoFinal.message = `Disparo interrompido: instância desconectada no batch ${
          batchIndex + 1
        }`;
        resultadoFinal.error = `Instância desconectou. Status: ${statusAtual.state}`;
        break;
      }

      const inicio = batchIndex * batchSize;
      const fim = Math.min(inicio + batchSize, totalNumeros);
      const numerosBatch = numbersForDispatch.slice(inicio, fim);

      console.log(
        `\n[${instanceId}] 🚀 Processando batch ${
          batchIndex + 1
        }/${totalBatches} (${numerosBatch.length} números)`
      );

      // Executa disparo do batch
      const resultadoBatch = await executarDisparo(
        instanceId,
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
              instanceId: instanceId,
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
        instanceId: instanceId,
      });

      // Callback de batch completo
      if (onBatchComplete) {
        const continuarProximo = await onBatchComplete({
          batchAtual: batchIndex + 1,
          totalBatches: totalBatches,
          resultado: resultadoBatch,
          temProximo: batchIndex + 1 < totalBatches,
          instanceId: instanceId,
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
        console.log(
          `[${instanceId}] ⏳ Aguardando delay entre batches (24-26 horas)...`
        );
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
      instanceId: instanceId,
    };
  }
}

module.exports = {
  executarDisparo,
  executarDisparoCompleto,
};
