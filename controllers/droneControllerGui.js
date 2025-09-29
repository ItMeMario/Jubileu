// controllers/droneControllerGui.js
const droneService = require("../services/droneService");

class DroneControllerGui {
  constructor() {
    console.log("DroneControllerGui inicializado");
  }

  /**
   * Lista todas as mensagens disponíveis
   * @returns {Promise<Object>} - Lista de mensagens formatadas
   */
  async listarMensagens() {
    try {
      console.log("Listando mensagens disponíveis...");
      const mensagens = await droneService.listarMensagensDisponiveis();

      if (!mensagens || mensagens.length === 0) {
        return {
          success: true,
          mensagens: [],
          total: 0,
        };
      }

      // Formata mensagens para a GUI
      const mensagensFormatadas = mensagens.map((mensagem, index) => ({
        indice: index + 1,
        id: mensagem.id,
        locale: mensagem.locale,
        conteudo: mensagem.message_content,
        textoExibicao: `${index + 1}. (${mensagem.locale}) ${
          mensagem.message_content
        }`,
      }));

      return {
        success: true,
        mensagens: mensagensFormatadas,
        total: mensagens.length,
      };
    } catch (error) {
      console.error("Erro ao listar mensagens:", error);
      return {
        success: false,
        error: error.message,
        mensagens: [],
        total: 0,
      };
    }
  }

  /**
   * Adiciona número(s) de telefone à lista
   * @param {string|Array<string>} input - Número único ou array de números
   * @returns {Promise<Object>} - Resultado formatado
   */
  async adicionarNumeros(input) {
    try {
      console.log("Adicionando números...");
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

      return {
        success: resultado.success,
        message: resultado.message,
        adicionados: resultado.added || [],
        erros: resultado.errors || [],
        totalNumeros: resultado.totalNumbers || 0,
      };
    } catch (error) {
      console.error("Erro ao adicionar números:", error);
      return {
        success: false,
        error: error.message,
        adicionados: [],
        erros: [],
        totalNumeros: 0,
      };
    }
  }

  /**
   * Lista os números atualmente em memória
   * @returns {Promise<Object>} - Lista formatada
   */
  async listarNumerosAtuais() {
    try {
      console.log("Listando números atuais...");
      const resultado = await droneService.listarNumeros();

      if (!resultado.success) {
        return {
          success: false,
          error: resultado.error,
          numeros: [],
          total: 0,
        };
      }

      if (resultado.numbers.length === 0) {
        return {
          success: true,
          numeros: [],
          total: 0,
        };
      }

      // Formata números para exibição na GUI
      const numerosFormatados = resultado.numbers.map((num, index) => ({
        indice: index + 1,
        id: num.id,
        numeroOriginal: num.originalNumber,
        numeroWhatsapp: num.whatsappFormat,
        tipo: this.getTipoTexto(num.numberType),
        tipoCompleto: num.numberType,
        adicionadoEm: num.addedAt,
        dataFormatada: new Date(num.addedAt).toLocaleString("pt-BR"),
      }));

      return {
        success: true,
        numeros: numerosFormatados,
        total: resultado.total,
      };
    } catch (error) {
      console.error("Erro ao listar números:", error);
      return {
        success: false,
        error: error.message,
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
  async removerNumero(identificador) {
    try {
      console.log(`Removendo número: ${identificador}`);

      // Se for um índice (número da lista exibida), precisa converter para ID
      const listaAtual = await droneService.listarNumeros();

      if (!listaAtual.success || listaAtual.numbers.length === 0) {
        return {
          success: false,
          error: "Nenhum número disponível para remoção.",
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
          success: true,
          message: `Número removido: ${resultado.removedNumber.originalNumber}`,
          numeroRemovido: resultado.removedNumber,
          totalRestante: resultado.totalNumbers,
        };
      } else {
        return {
          success: false,
          error: resultado.error,
        };
      }
    } catch (error) {
      console.error("Erro ao remover número:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Limpa toda a lista de números
   * @returns {Promise<Object>} - Resultado da operação
   */
  async limparListaCompleta() {
    try {
      console.log("Limpando lista completa de números...");
      const resultado = await droneService.limparListaNumeros();

      if (resultado.success) {
        return {
          success: true,
          message: resultado.message,
          totalRemovidos: resultado.totalRemoved,
        };
      } else {
        return {
          success: false,
          error: resultado.error,
        };
      }
    } catch (error) {
      console.error("Erro ao limpar lista:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Obtém estatísticas dos números cadastrados
   * @returns {Promise<Object>} - Estatísticas formatadas
   */
  async obterEstatisticasNumeros() {
    try {
      console.log("Obtendo estatísticas dos números...");
      const resultado = await droneService.obterEstatisticas();

      if (!resultado.success) {
        return {
          success: false,
          error: resultado.error,
        };
      }

      const stats = resultado.stats;

      return {
        success: true,
        estatisticas: {
          total: stats.total,
          porTipo: stats.porTipo,
          maisAntigo: stats.maisAntigo
            ? {
                ...stats.maisAntigo,
                dataFormatada: new Date(
                  stats.maisAntigo.addedAt
                ).toLocaleString("pt-BR"),
              }
            : null,
          maisRecente: stats.maisRecente
            ? {
                ...stats.maisRecente,
                dataFormatada: new Date(
                  stats.maisRecente.addedAt
                ).toLocaleString("pt-BR"),
              }
            : null,
        },
      };
    } catch (error) {
      console.error("Erro ao obter estatísticas:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Obtém status de conexão do WhatsApp
   * @returns {Promise<Object>} - Status formatado
   */
  async obterStatusCliente() {
    try {
      console.log("Verificando status do cliente WhatsApp...");
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
        success: status.success,
        conectado: status.connected,
        status: status.state,
        statusTexto: statusTexto[status.state] || `❓ ${status.state}`,
        info: status.info,
        error: status.error,
      };
    } catch (error) {
      console.error("Erro ao verificar status:", error);
      return {
        success: false,
        conectado: false,
        status: "ERROR",
        statusTexto: "❌ Erro ao verificar status",
        error: error.message,
      };
    }
  }

  /**
   * Executa disparo de drone com mensagem selecionada
   * @param {number} mensagemIndex - Índice da mensagem (baseado em 1)
   * @param {number} batchSize - Tamanho do batch
   * @returns {Promise<Object>} - Resultado do disparo
   */
  async executarDisparoDrone(mensagemIndex, batchSize = 200) {
    try {
      console.log(
        `Executando disparo - Mensagem: ${mensagemIndex}, Batch: ${batchSize}`
      );

      // Verifica se há números cadastrados
      const listaNumeros = await droneService.listarNumeros();
      if (!listaNumeros.success || listaNumeros.numbers.length === 0) {
        return {
          success: false,
          error:
            "Nenhum número cadastrado para disparo. Adicione números primeiro.",
        };
      }

      // Busca mensagens disponíveis
      const mensagens = await droneService.listarMensagensDisponiveis();
      if (!mensagens || mensagens.length === 0) {
        return {
          success: false,
          error: "Nenhuma mensagem disponível para disparo.",
        };
      }

      // Valida índice da mensagem
      const mensagemIndex0 = mensagemIndex - 1; // Converte para índice base 0
      if (mensagemIndex0 < 0 || mensagemIndex0 >= mensagens.length) {
        return {
          success: false,
          error: "Mensagem selecionada inválida.",
        };
      }

      const mensagemSelecionada = mensagens[mensagemIndex0];

      // Executa disparo completo
      const resultado = await droneService.executarDisparoCompleto(
        mensagemSelecionada.id,
        batchSize
      );

      return {
        success: resultado.success,
        message: resultado.message || "Disparo finalizado",
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
        error: resultado.error,
      };
    } catch (error) {
      console.error("Erro ao executar disparo:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Funções auxiliares

  /**
   * Converte o tipo do número para texto legível
   * @param {string} numberType - Tipo do número
   * @returns {string} - Texto descritivo
   */
  getTipoTexto(numberType) {
    const tipos = {
      brazilian: "BR",
      international: "INT",
      brazilian_assumed: "BR*",
      unknown: "?",
    };

    return tipos[numberType] || "?";
  }
}

module.exports = new DroneControllerGui();
