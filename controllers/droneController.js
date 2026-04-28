// controllers/droneController.js
const droneService = require("../services/droneService");

async function listarMensagens() {
  try {
    const mensagens = await droneService.listarMensagensDisponiveis();

    if (!mensagens || mensagens.length === 0) {
      return ["Nenhuma mensagem disponível."];
    }

    // monta as mensagens já formatadas para a view
    return mensagens.map(
      (mensagem, index) =>
        `${index + 1}. (${mensagem.locale}) ${mensagem.message_content}`
    );
  } catch (error) {
    console.error("Erro no controller de mensagens:", error);
    return ["Erro ao carregar mensagens."];
  }
}

/**
 * Adiciona número(s) de telefone à lista
 * @param {string|Array<string>} input - Número único ou array de números
 * @returns {Promise<Object>} - Resultado formatado para a view
 */
async function adicionarNumeros(input) {
  try {
    let resultado;

    // Verifica se é um array ou string única
    if (Array.isArray(input)) {
      resultado = await droneService.adicionarMultiplosNumeros(input);
    } else {
      // Se é string única, mas contém vírgulas ou quebras de linha, divide
      const numeros = input
        .split(/[,\n;]/)
        .map((n) => n.trim())
        .filter((n) => n.length > 0);

      if (numeros.length > 1) {
        resultado = await droneService.adicionarMultiplosNumeros(numeros);
      } else {
        const single = await droneService.adicionarNumero(input.trim());
        // Converte resultado single para formato similar ao múltiplo
        if (single.success) {
          resultado = {
            success: true,
            message: single.message,
            added: [single.number],
            errors: [],
            totalNumbers: single.totalNumbers,
          };
        } else {
          resultado = {
            success: false,
            message: single.error,
            added: [],
            errors: [
              { originalNumber: single.originalNumber, error: single.error },
            ],
            totalNumbers: 0,
          };
        }
      }
    }

    return formatarResultadoAdicao(resultado);
  } catch (error) {
    console.error("Erro no controller ao adicionar números:", error);
    return {
      sucesso: false,
      mensagens: [`Erro interno: ${error.message}`],
      detalhes: null,
    };
  }
}

/**
 * Lista os números atualmente em memória
 * @returns {Promise<Object>} - Lista formatada para a view
 */
async function listarNumerosAtuais() {
  try {
    const resultado = await droneService.listarNumeros();

    if (!resultado.success) {
      return {
        sucesso: false,
        mensagens: [resultado.error],
        numeros: [],
        total: 0,
      };
    }

    if (resultado.numbers.length === 0) {
      return {
        sucesso: true,
        mensagens: ["Nenhum número cadastrado."],
        numeros: [],
        total: 0,
      };
    }

    // Formata números para exibição
    const numerosFormatados = resultado.numbers.map((num, index) => {
      const dataFormatada = new Date(num.addedAt).toLocaleString("pt-BR");
      const tipoTexto = getTipoTexto(num.numberType);

      return {
        indice: index + 1,
        id: num.id,
        numeroOriginal: num.originalNumber,
        numeroWhatsapp: num.whatsappFormat,
        tipo: tipoTexto,
        adicionadoEm: dataFormatada,
        textoExibicao: `${index + 1}. ${num.originalNumber} → ${
          num.whatsappFormat
        } [${tipoTexto}]`,
      };
    });

    return {
      sucesso: true,
      mensagens: [`Total de números: ${resultado.total}`],
      numeros: numerosFormatados,
      total: resultado.total,
    };
  } catch (error) {
    console.error("Erro no controller ao listar números:", error);
    return {
      sucesso: false,
      mensagens: [`Erro interno: ${error.message}`],
      numeros: [],
      total: 0,
    };
  }
}

/**
 * Remove um número específico da lista
 * @param {number|string} identificador - ID do número ou índice da lista
 * @returns {Promise<Object>} - Resultado da remoção
 */
async function removerNumero(identificador) {
  try {
    // Se for um índice (número da lista exibida), precisa converter para ID
    const listaAtual = await droneService.listarNumeros();

    if (!listaAtual.success || listaAtual.numbers.length === 0) {
      return {
        sucesso: false,
        mensagem: "Nenhum número disponível para remoção.",
      };
    }

    let idParaRemover;

    // Se identificador é um número e menor/igual ao total, trata como índice
    if (
      !isNaN(identificador) &&
      identificador > 0 &&
      identificador <= listaAtual.numbers.length
    ) {
      const indice = parseInt(identificador) - 1; // Converte para índice base 0
      idParaRemover = listaAtual.numbers[indice].id;
    } else {
      // Caso contrário, trata como ID direto
      idParaRemover = identificador;
    }

    const resultado = await droneService.removerNumero(idParaRemover);

    if (resultado.success) {
      return {
        sucesso: true,
        mensagem: `Número removido: ${resultado.removedNumber.originalNumber}`,
        numeroRemovido: resultado.removedNumber,
        totalRestante: resultado.totalNumbers,
      };
    } else {
      return {
        sucesso: false,
        mensagem: resultado.error,
      };
    }
  } catch (error) {
    console.error("Erro no controller ao remover número:", error);
    return {
      sucesso: false,
      mensagem: `Erro interno: ${error.message}`,
    };
  }
}

/**
 * Limpa toda a lista de números
 * @returns {Promise<Object>} - Resultado da operação
 */
async function limparListaCompleta() {
  try {
    const resultado = await droneService.limparListaNumeros();

    if (resultado.success) {
      return {
        sucesso: true,
        mensagem: resultado.message,
        totalRemovidos: resultado.totalRemoved,
      };
    } else {
      return {
        sucesso: false,
        mensagem: resultado.error,
      };
    }
  } catch (error) {
    console.error("Erro no controller ao limpar lista:", error);
    return {
      sucesso: false,
      mensagem: `Erro interno: ${error.message}`,
    };
  }
}

/**
 * Obtém estatísticas dos números cadastrados
 * @returns {Promise<Object>} - Estatísticas formatadas
 */
async function obterEstatisticasNumeros() {
  try {
    const resultado = await droneService.obterEstatisticas();

    if (!resultado.success) {
      return {
        sucesso: false,
        mensagem: resultado.error,
      };
    }

    const stats = resultado.stats;
    const resumo = [
      `Total de números: ${stats.total}`,
      `Brasileiros: ${stats.porTipo.brazilian}`,
      `Internacionais: ${stats.porTipo.international}`,
      `Assumidos como BR: ${stats.porTipo.brazilian_assumed}`,
    ];

    if (stats.maisAntigo) {
      const dataAntiga = new Date(stats.maisAntigo.addedAt).toLocaleString(
        "pt-BR"
      );
      resumo.push(
        `Mais antigo: ${stats.maisAntigo.originalNumber} (${dataAntiga})`
      );
    }

    if (stats.maisRecente) {
      const dataRecente = new Date(stats.maisRecente.addedAt).toLocaleString(
        "pt-BR"
      );
      resumo.push(
        `Mais recente: ${stats.maisRecente.originalNumber} (${dataRecente})`
      );
    }

    return {
      sucesso: true,
      estatisticas: stats,
      resumoTexto: resumo,
    };
  } catch (error) {
    console.error("Erro no controller ao obter estatísticas:", error);
    return {
      sucesso: false,
      mensagem: `Erro interno: ${error.message}`,
    };
  }
}

/**
 * Obtém status de conexão do WhatsApp
 * @returns {Promise<Object>} - Status formatado para a view
 */
async function obterStatusCliente() {
  try {
    const status = await droneService.verificarStatusCliente();

    const statusTexto = {
      CONNECTED: "✅ Conectado",
      OPENING: "🔄 Conectando...",
      QRCODE: "📱 Aguardando QR Code",
      LOADING_SCREEN: "⏳ Carregando...",
      UNPAIRED: "❌ Desconectado",
      UNPAIRED_IDLE: "😴 Inativo",
      UNKNOWN: "❓ Status desconhecido",
    };

    return {
      sucesso: status.success,
      conectado: status.connected,
      status: status.state,
      statusTexto: statusTexto[status.state] || `❓ ${status.state}`,
      info: status.info,
      erro: status.error,
    };
  } catch (error) {
    return {
      sucesso: false,
      conectado: false,
      statusTexto: "❌ Erro ao verificar status",
      erro: error.message,
    };
  }
}

/**
 * Executa disparo de drone com mensagem selecionada
 * @param {number} mensagemIndex - Índice da mensagem (baseado em 1)
 * @param {number} batchSize - Tamanho do batch
 * @param {Function} onProgress - Callback de progresso
 * @param {Function} onBatchComplete - Callback entre batches
 * @returns {Promise<Object>} - Resultado do disparo
 */
async function executarDisparoDrone(
  instanceId,
  mensagemIndex,
  batchSize = 200,
  onProgress = null,
  onBatchComplete = null
) {
  try {
    // Verifica se há números cadastrados
    const listaNumeros = await droneService.listarNumeros();
    if (!listaNumeros.success || listaNumeros.numbers.length === 0) {
      return {
        sucesso: false,
        mensagem:
          "Nenhum número cadastrado para disparo. Adicione números primeiro.",
      };
    }

    // Busca mensagens disponíveis
    const mensagens = await droneService.listarMensagensDisponiveis();
    if (!mensagens || mensagens.length === 0) {
      return {
        sucesso: false,
        mensagem: "Nenhuma mensagem disponível para disparo.",
      };
    }

    let mensagemSelecionada = null;
    
    if (mensagemIndex !== null && mensagemIndex !== undefined) {
      const mensagemIndex0 = mensagemIndex - 1; // Converte para índice base 0
      if (mensagemIndex0 >= 0 && mensagemIndex0 < mensagens.length) {
        mensagemSelecionada = mensagens[mensagemIndex0];
      }
    }
    
    // Se não houver índice válido, escolhe aleatório
    if (!mensagemSelecionada) {
      mensagemSelecionada = mensagens[Math.floor(Math.random() * mensagens.length)];
    }

    const resultado = await droneService.executarDisparoCompleto(
      "drone_global", // Ignora instanceId passado, força global
      mensagemSelecionada.id,
      batchSize,
      onProgress,
      onBatchComplete
    );

    return {
      sucesso: resultado.success,
      mensagem: resultado.message || "Disparo finalizado",
      detalhes: {
        mensagemUsada: {
          id: mensagemSelecionada.id,
          conteudo: mensagemSelecionada.message_content,
          locale: mensagemSelecionada.locale,
        },
        totalNumeros: resultado.totalNumeros,
        totalBatches: resultado.totalBatches,
        batchesProcessados: resultado.batchesProcessados,
        totalEnviados: resultado.totalEnviados,
        totalFalhas: resultado.totalFalhas,
        batches: resultado.batches,
      },
      erro: resultado.error,
    };
  } catch (error) {
    console.error("Erro no controller ao executar disparo:", error);
    return {
      sucesso: false,
      mensagem: `Erro interno: ${error.message}`,
    };
  }
}

// Funções auxiliares

/**
 * Formata o resultado da adição de números para a view
 * @param {Object} resultado - Resultado do service
 * @returns {Object} - Resultado formatado
 */
function formatarResultadoAdicao(resultado) {
  const mensagens = [];

  if (resultado.success) {
    mensagens.push(resultado.message);

    if (resultado.added.length > 0) {
      mensagens.push("Números adicionados:");
      resultado.added.forEach((num, index) => {
        const tipoTexto = getTipoTexto(num.numberType);
        mensagens.push(
          `  ${index + 1}. ${num.originalNumber} → ${
            num.whatsappFormat
          } [${tipoTexto}]`
        );
      });
    }

    if (resultado.errors.length > 0) {
      mensagens.push("Erros encontrados:");
      resultado.errors.forEach((erro, index) => {
        mensagens.push(`  ${index + 1}. ${erro.originalNumber}: ${erro.error}`);
      });
    }

    mensagens.push(`Total de números na lista: ${resultado.totalNumbers}`);
  } else {
    mensagens.push(resultado.message || "Erro desconhecido");
  }

  return {
    sucesso: resultado.success,
    mensagens: mensagens,
    detalhes: {
      adicionados: resultado.added || [],
      erros: resultado.errors || [],
      total: resultado.totalNumbers || 0,
    },
  };
}

/**
 * Converte o tipo do número para texto legível
 * @param {string} numberType - Tipo do número
 * @returns {string} - Texto descritivo
 */
function getTipoTexto(numberType) {
  const tipos = {
    brazilian: "BR",
    international: "INT",
    brazilian_assumed: "BR*",
    unknown: "?",
  };

  return tipos[numberType] || "?";
}

module.exports = {
  listarMensagens,
  adicionarNumeros,
  listarNumerosAtuais,
  removerNumero,
  limparListaCompleta,
  obterEstatisticasNumeros,
  obterStatusCliente,
  executarDisparoDrone,
};
