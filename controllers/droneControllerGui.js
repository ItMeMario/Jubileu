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
   * Processa arquivo CSV e adiciona números com opções de transformação
   * @param {string} csvContent - Conteúdo do arquivo CSV
   * @param {Object} opcoes - Opções de processamento
   * @returns {Promise<Object>} - Resultado formatado
   */
  async processarArquivoCSV(csvContent, opcoes = {}) {
    try {
      console.log("Processando arquivo CSV...");
      console.log("Opções recebidas:", opcoes);

      // Valida conteúdo
      if (!csvContent || csvContent.trim().length === 0) {
        return {
          success: false,
          error: "Arquivo CSV vazio ou inválido",
          adicionados: [],
          erros: [],
          totalNumeros: 0,
        };
      }

      // Valida e prepara opções
      const opcoesProcessamento = {
        prefixoPais: opcoes.prefixoPais?.trim() || "",
        ddd: opcoes.ddd?.trim() || "",
        adicionar9Digito: opcoes.adicionar9Digito === true,
        usarNomesCSV: opcoes.usarNomesCSV === true,
      };

      console.log("Opções de processamento:", opcoesProcessamento);

      // Processa CSV através do service
      const resultado = await droneService.adicionarNumerosDeCSV(
        csvContent,
        opcoesProcessamento
      );

      if (!resultado.success) {
        return {
          success: false,
          error: resultado.error,
          adicionados: [],
          erros: [],
          totalNumeros: resultado.totalNumbers || 0,
        };
      }

      // Formata resultados para GUI
      const adicionadosFormatados = resultado.added.map((item) => ({
        linha: item.linha,
        nome: item.nome,
        numeroOriginal: item.numeroOriginal,
        numeroFinal: item.numeroFinal,
        status: "✅ Adicionado",
      }));

      const errosFormatados = resultado.errors.map((item) => ({
        linha: item.linha,
        nome: item.nome || "-",
        numeroOriginal: item.numeroOriginal,
        numeroTransformado: item.numeroTransformado || "-",
        erro: item.error,
        status: "❌ Erro",
      }));

      return {
        success: true,
        message: resultado.message,
        adicionados: adicionadosFormatados,
        erros: errosFormatados,
        totalNumeros: resultado.totalNumbers,
        resumo: {
          totalProcessados: resultado.added.length + resultado.errors.length,
          totalAdicionados: resultado.added.length,
          totalErros: resultado.errors.length,
          opcoesAplicadas: {
            prefixoPais: opcoesProcessamento.prefixoPais || "Nenhum",
            ddd: opcoesProcessamento.ddd || "Nenhum",
            adicionar9Digito: opcoesProcessamento.adicionar9Digito
              ? "Sim"
              : "Não",
            usarNomesCSV: opcoesProcessamento.usarNomesCSV ? "Sim" : "Não",
          },
        },
      };
    } catch (error) {
      console.error("Erro ao processar CSV:", error);
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
   * Valida opções antes do processamento (útil para preview)
   * @param {Object} opcoes - Opções a validar
   * @returns {Object} - Resultado da validação
   */
  validarOpcoes(opcoes) {
    const erros = [];
    const avisos = [];

    // Valida prefixo país
    if (opcoes.prefixoPais) {
      const prefixo = opcoes.prefixoPais.trim().replace(/\D/g, "");
      if (prefixo.length === 0) {
        avisos.push("Prefixo de país será ignorado (vazio após limpeza)");
      } else if (prefixo.length > 3) {
        erros.push("Prefixo de país muito longo (máximo 3 dígitos)");
      }
    }

    // Valida DDD
    if (opcoes.ddd) {
      const ddd = opcoes.ddd.trim().replace(/\D/g, "");
      if (ddd.length === 0) {
        avisos.push("DDD será ignorado (vazio após limpeza)");
      } else if (ddd.length > 2) {
        avisos.push("DDD com mais de 2 dígitos pode gerar números inválidos");
      }
    }

    // Verifica combinações
    if (opcoes.adicionar9Digito && !opcoes.prefixoPais && !opcoes.ddd) {
      avisos.push(
        "9º dígito será adicionado, mas sem prefixo/DDD a detecção pode falhar"
      );
    }

    return {
      valido: erros.length === 0,
      erros: erros,
      avisos: avisos,
    };
  }

  /**
   * Preview do CSV antes de processar (mostra primeiras linhas)
   * @param {string} csvContent - Conteúdo do CSV
   * @param {number} linhas - Quantidade de linhas para preview (padrão 5)
   * @returns {Object} - Preview formatado
   */
  previewCSV(csvContent, linhas = 5) {
    try {
      const parseResult = droneService.parseCSV(csvContent);

      if (!parseResult.success) {
        return {
          success: false,
          error: parseResult.error,
        };
      }

      const preview = parseResult.data.slice(0, linhas).map((item) => ({
        linha: item.linhaOriginal,
        nome: item.nome || "(vazio)",
        numero: item.numero,
      }));

      return {
        success: true,
        preview: preview,
        totalLinhas: parseResult.totalLinhas,
        tinhaHeader: parseResult.tinhaHeader,
        mensagem: `Preview: ${preview.length} de ${parseResult.totalLinhas} linha(s)`,
      };
    } catch (error) {
      return {
        success: false,
        error: "Erro ao gerar preview: " + error.message,
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
        nome: num.customName || "-",
        temNomePersonalizado: !!num.customName,
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
          numeroRemovido: {
            ...resultado.removedNumber,
            nome: resultado.removedNumber.customName || "-",
          },
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
          comNomePersonalizado: stats.comNomePersonalizado || 0,
          semNomePersonalizado: stats.semNomePersonalizado || 0,
          percentualComNome:
            stats.total > 0
              ? ((stats.comNomePersonalizado / stats.total) * 100).toFixed(1)
              : 0,
          maisAntigo: stats.maisAntigo
            ? {
                ...stats.maisAntigo,
                nome: stats.maisAntigo.customName || "-",
                dataFormatada: new Date(
                  stats.maisAntigo.addedAt
                ).toLocaleString("pt-BR"),
              }
            : null,
          maisRecente: stats.maisRecente
            ? {
                ...stats.maisRecente,
                nome: stats.maisRecente.customName || "-",
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

  /**
   * Gera relatório de números com nomes personalizados
   * @returns {Promise<Object>} - Relatório formatado
   */
  async gerarRelatorioNomes() {
    try {
      const lista = await droneService.listarNumeros();

      if (!lista.success) {
        return {
          success: false,
          error: lista.error,
        };
      }

      const comNome = lista.numbers.filter((n) => n.customName);
      const semNome = lista.numbers.filter((n) => !n.customName);

      return {
        success: true,
        total: lista.numbers.length,
        comNome: {
          quantidade: comNome.length,
          lista: comNome.map((n) => ({
            numero: n.whatsappFormat,
            nome: n.customName,
          })),
        },
        semNome: {
          quantidade: semNome.length,
          lista: semNome.map((n) => ({
            numero: n.whatsappFormat,
          })),
        },
      };
    } catch (error) {
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
