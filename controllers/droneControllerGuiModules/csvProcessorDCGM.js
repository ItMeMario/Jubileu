// controllers/droneControllerGuiModules/csvProcessorDCGM.js
const droneService = require("../../services/droneService");

class CsvProcessorDCGM {
  constructor() {
    console.log("CsvProcessorDCGM inicializado");
  }

  /**
   * Processa arquivo CSV e adiciona números com opções de transformação
   * @param {string} instanceId - ID da instância
   * @param {string} csvContent - Conteúdo do arquivo CSV
   * @param {Object} opcoes - Opções de processamento
   * @returns {Promise<Object>} - Resultado formatado
   */
  async processarArquivoCSV(instanceId, csvContent, opcoes = {}) {
    try {
      // Valida instanceId
      if (!instanceId) {
        return {
          success: false,
          error:
            "Nenhuma instância selecionada. Selecione uma instância antes de importar.",
          adicionados: [],
          erros: [],
          totalNumeros: 0,
        };
      }

      console.log(`[${instanceId}] Processando arquivo CSV...`);
      console.log(`[${instanceId}] Opções recebidas:`, opcoes);

      // Valida conteúdo
      if (!csvContent || csvContent.trim().length === 0) {
        return {
          success: false,
          error: "Arquivo CSV vazio ou inválido",
          adicionados: [],
          erros: [],
          totalNumeros: 0,
          instanceId: instanceId,
        };
      }

      // Valida e prepara opções
      const opcoesProcessamento = {
        prefixoPais: opcoes.prefixoPais?.trim() || "",
        ddd: opcoes.ddd?.trim() || "",
        adicionar9Digito: opcoes.adicionar9Digito === true,
        usarNomesCSV: opcoes.usarNomesCSV === true,
      };

      console.log(
        `[${instanceId}] Opções de processamento:`,
        opcoesProcessamento
      );

      // Processa CSV através do service (passa instanceId)
      const resultado = await droneService.adicionarNumerosDeCSV(
        instanceId,
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
          instanceId: instanceId,
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
        jaExistiam: resultado.alreadyExisted || 0,
        erros: errosFormatados,
        totalNumeros: resultado.totalNumbers,
        instanceId: instanceId,
        resumo: {
          totalProcessados: resultado.added.length + resultado.errors.length,
          totalAdicionados: resultado.added.length,
          totalJaExistiam: resultado.alreadyExisted || 0,
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
      console.error(`[${instanceId}] Erro ao processar CSV:`, error);
      return {
        success: false,
        error: error.message,
        adicionados: [],
        erros: [],
        totalNumeros: 0,
        instanceId: instanceId,
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
}

module.exports = new CsvProcessorDCGM();
