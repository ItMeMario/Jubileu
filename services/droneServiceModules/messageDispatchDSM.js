// services/droneServiceModules/messageDispatchDSM.js
const { smartDelay } = require("../../utils/delay");
const { debug } = require("../debugService");
const { processVariables } = require("../../utils/messageReader");
const { getNumbersForDispatch } = require("./numberManagementDSM");
const { buscarMensagemPorId, listarMensagensDisponiveis } = require("./messageDatabaseDSM");
const { verificarStatusCliente } = require("./clientStatusDSM");
const {
  atualizarStatusCliente,
  atualizarStatusClientePorId,
} = require("./clientDatabaseDSM");
const { sendMessageOptions } = require("../../config/compatibility/whatsappCompatibility");

const { droneInstanceManager } = require("./droneInstanceManagerDSM");

/**
 * Obtém o cliente de uma instância específica
 * @param {string} instanceId - ID da instância
 * @returns {Object|null} - Cliente WhatsApp ou null
 */
function getClient(instanceId) {
  return droneInstanceManager.getClient(instanceId);
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

    // Busca todas as mensagens disponíveis no banco
    const mensagensDisponiveis = await listarMensagensDisponiveis();
    if (!mensagensDisponiveis || mensagensDisponiveis.length === 0) {
      return {
        success: false,
        error: "Nenhuma mensagem disponível para envio",
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

        // Escolhe uma mensagem aleatória
        const mensagemSorteada = mensagensDisponiveis[Math.floor(Math.random() * mensagensDisponiveis.length)];

        const mensagemPersonalizada = processVariables(
          mensagemSorteada.message_content,
          { name }
        );

        // Envia mensagem personalizada
        await client.sendMessage(numero.whatsappFormat, mensagemPersonalizada, sendMessageOptions);

        // ✅ ATUALIZA STATUS NO BANCO COMO 'sent' (usando ID)
        if (numero.id) {
          await atualizarStatusClientePorId(numero.id, "sent");
        } else {
          await atualizarStatusCliente(
            "drone_global",
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
        // ❌ ATUALIZA STATUS NO BANCO COMO 'failed' (usando ID)
        if (numero.id) {
          await atualizarStatusClientePorId(numero.id, "failed");
        } else {
          await atualizarStatusCliente(
            "drone_global",
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
 * @param {string} ignore_instanceId - (Ignorado, agora é global)
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
    // Obtém todas as instâncias conectadas
    const allInstances = droneInstanceManager.getAllInstancesStatus();
    const connectedInstances = allInstances.filter((i) => i.status === "connected");

    if (connectedInstances.length === 0) {
      return {
        success: false,
        error: "Nenhuma instância do Drone está conectada.",
        results: [],
        instanceId: "drone_global",
      };
    }

    // 🔄 BUSCA NÚMEROS DO BANCO GLOBAL (pending + failed)
    const numbersForDispatch = await getNumbersForDispatch("drone_global");

    if (numbersForDispatch.length === 0) {
      return {
        success: false,
        error: "Nenhum número cadastrado para disparo",
        results: [],
        instanceId: "drone_global",
      };
    }

    const totalNumeros = numbersForDispatch.length;
    const totalBatches = Math.ceil(totalNumeros / batchSize);

    console.log(
      `[Global] 📊 Iniciando disparo distribuído: ${totalNumeros} números em ${totalBatches} batch(es) para ${connectedInstances.length} instâncias.`
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
      instanceId: "drone_global",
    };

    // Processa cada batch
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      // Re-verifica instâncias conectadas antes de cada batch
      const currentAllInstances = droneInstanceManager.getAllInstancesStatus();
      let currentConnectedInstances = currentAllInstances.filter((i) => i.status === "connected");

      // Embaralha (Shuffle) as instâncias conectadas para que a distribuição não seja estritamente determinística
      for (let i = currentConnectedInstances.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [currentConnectedInstances[i], currentConnectedInstances[j]] = [currentConnectedInstances[j], currentConnectedInstances[i]];
      }

      if (currentConnectedInstances.length === 0) {
        resultadoFinal.success = false;
        resultadoFinal.message = `Disparo interrompido: todas as instâncias desconectaram no batch ${
          batchIndex + 1
        }`;
        resultadoFinal.error = `Sem instâncias conectadas.`;
        break;
      }

      const inicio = batchIndex * batchSize;
      const fim = Math.min(inicio + batchSize, totalNumeros);
      const numerosBatch = numbersForDispatch.slice(inicio, fim);

      console.log(
        `\n[Global] 🚀 Processando batch ${
          batchIndex + 1
        }/${totalBatches} (${numerosBatch.length} números)`
      );

      // Divide o batch entre as instâncias conectadas (Round-Robin)
      const instanceBatches = {};
      currentConnectedInstances.forEach(i => instanceBatches[i.instanceId] = []);
      
      for (let i = 0; i < numerosBatch.length; i++) {
        const instanceToUse = currentConnectedInstances[i % currentConnectedInstances.length];
        instanceBatches[instanceToUse.instanceId].push(numerosBatch[i]);
      }

      // Logs de Auditoria da Distribuição
      await debug(`\n[Global - AUDITORIA] Resultado da distribuição (Round-Robin) para o Batch ${batchIndex + 1}:`);
      for (const i of currentConnectedInstances) {
        const numbersForInstance = instanceBatches[i.instanceId];
        await debug(`  -> Instância [${i.instanceId}]: Recebeu ${numbersForInstance.length} número(s).`);
        if (numbersForInstance.length > 0) {
          // Mostra preview de até 3 números para auditoria visual
          const preview = numbersForInstance.slice(0, 3).map(n => n.whatsappFormat || n.originalNumber).join(', ');
          const previewSuffix = numbersForInstance.length > 3 ? '...' : '';
          await debug(`      Exemplos: ${preview}${previewSuffix}`);
        }
      }

      // Prepara as execuções para rodarem em paralelo por instância
      const executionPromises = currentConnectedInstances.map(instance => {
        const numbersForInstance = instanceBatches[instance.instanceId];
        if (numbersForInstance.length === 0) return Promise.resolve(null);
        
        return executarDisparo(
          instance.instanceId,
          mensagemId,
          numbersForInstance,
          (progress) => {
            // Ajusta progresso para incluir informações do batch e instância
            if (onProgress) {
              onProgress({
                ...progress,
                batch: batchIndex + 1,
                totalBatches: totalBatches,
                progressoGeral: {
                  atual: resultadoFinal.totalEnviados + progress.atual, // Note: Isso pode ficar impreciso com chamadas paralelas
                  total: totalNumeros,
                },
              });
            }
          }
        );
      });

      // Executa o batch aguardando todas as instâncias concluírem sua parte
      const batchResults = await Promise.all(executionPromises);
      
      let batchEnviados = 0;
      let batchFalhas = 0;

      for (const res of batchResults) {
        if (res) {
          batchEnviados += res.enviados || 0;
          batchFalhas += res.falhas || 0;
        }
      }

      // Atualiza resultado final
      resultadoFinal.batchesProcessados++;
      resultadoFinal.totalEnviados += batchEnviados;
      resultadoFinal.totalFalhas += batchFalhas;
      resultadoFinal.batches.push({
        batch: batchIndex + 1,
        numeros: numerosBatch.length,
        enviados: batchEnviados,
        falhas: batchFalhas,
        instanceId: "drone_global",
      });

      // Callback de batch completo
      if (onBatchComplete) {
        const continuarProximo = await onBatchComplete({
          batchAtual: batchIndex + 1,
          totalBatches: totalBatches,
          resultado: { enviados: batchEnviados, falhas: batchFalhas },
          temProximo: batchIndex + 1 < totalBatches,
          instanceId: "drone_global",
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
          `[Global] ⏳ Aguardando delay entre batches (24-26 horas)...`
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
