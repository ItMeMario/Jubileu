// utils/validateNumber.js
const { client } = require("../whatsapp/client");
const { convertToWhatsAppFormat } = require("./telNumberConversor");

/**
 * Verifica se um número existe no WhatsApp
 * @param {string} whatsappFormat - Número no formato do WhatsApp (ex: 5511999999999@c.us)
 * @returns {Promise<Object>} - Resultado da verificação
 */
async function verificarNumeroExisteWhatsApp(whatsappFormat) {
  try {
    // Remove @c.us se estiver presente para usar getNumberId
    const numeroLimpo = whatsappFormat.replace("@c.us", "");

    // Usa a função getNumberId do WhatsApp Web.js
    const numberId = await client.getNumberId(numeroLimpo);

    return {
      existe: numberId !== null,
      numberId: numberId,
      numeroTestado: whatsappFormat,
    };
  } catch (error) {
    return {
      existe: false,
      numberId: null,
      numeroTestado: whatsappFormat,
      erro: error.message,
    };
  }
}

/**
 * Para números brasileiros de 11 dígitos, testa com e sem o 9º dígito
 * @param {string} numeroOriginal - Número original inserido pelo usuário
 * @returns {Promise<Object>} - Resultado da validação com ambas as variações
 */
async function validarNumeroBrasileiro11Digitos(numeroOriginal) {
  try {
    const resultado = {
      numeroOriginal: numeroOriginal,
      variacoes: [],
      numeroValido: null,
      multiplosValidos: false,
      erro: null,
    };

    // Converte o número original
    const conversaoOriginal = await convertToWhatsAppFormat(numeroOriginal);

    if (!conversaoOriginal.success) {
      resultado.erro = `Erro na conversão: ${conversaoOriginal.error}`;
      return resultado;
    }

    // Se não for brasileiro de 11 dígitos, retorna conversão simples
    if (
      conversaoOriginal.numberType !== "brazilian" &&
      conversaoOriginal.numberType !== "brazilian_assumed"
    ) {
      const verificacao = await verificarNumeroExisteWhatsApp(
        conversaoOriginal.whatsappFormat
      );
      resultado.variacoes.push({
        numeroConvertido: conversaoOriginal,
        verificacao: verificacao,
      });

      if (verificacao.existe) {
        resultado.numeroValido = conversaoOriginal;
      } else {
        resultado.erro = "Número não existe no WhatsApp";
      }

      return resultado;
    }

    // Para números brasileiros, verifica se tem 11 dígitos (DDD + 9 dígitos)
    const numeroLimpo = conversaoOriginal.cleanedNumber;
    const numeroBrasileiroSemPais = numeroLimpo.startsWith("55")
      ? numeroLimpo.substring(2)
      : numeroLimpo;

    if (numeroBrasileiroSemPais.length !== 11) {
      // Se não tem 11 dígitos, testa apenas a conversão original
      const verificacao = await verificarNumeroExisteWhatsApp(
        conversaoOriginal.whatsappFormat
      );
      resultado.variacoes.push({
        numeroConvertido: conversaoOriginal,
        verificacao: verificacao,
      });

      if (verificacao.existe) {
        resultado.numeroValido = conversaoOriginal;
      } else {
        resultado.erro = "Número não existe no WhatsApp";
      }

      return resultado;
    }

    // Testa a versão original primeiro
    const verificacaoOriginal = await verificarNumeroExisteWhatsApp(
      conversaoOriginal.whatsappFormat
    );
    resultado.variacoes.push({
      tipo: "original",
      numeroConvertido: conversaoOriginal,
      verificacao: verificacaoOriginal,
    });

    // Gera a versão alternativa (com ou sem 9)
    let numeroAlternativo;
    const ddd = numeroBrasileiroSemPais.substring(0, 2);
    const restante = numeroBrasileiroSemPais.substring(2);

    if (restante.startsWith("9")) {
      // Remove o 9 (celular novo -> celular antigo)
      numeroAlternativo = ddd + restante.substring(1);
    } else if (
      restante.length === 8 &&
      !["2", "3", "4", "5"].includes(restante[0])
    ) {
      // Adiciona o 9 (celular antigo -> celular novo)
      numeroAlternativo = ddd + "9" + restante;
    } else {
      // Não é um padrão reconhecido para alternativa
      if (verificacaoOriginal.existe) {
        resultado.numeroValido = conversaoOriginal;
      } else {
        resultado.erro = "Número não existe no WhatsApp";
      }
      return resultado;
    }

    // Converte a versão alternativa
    const numeroComPais = "55" + numeroAlternativo;
    const conversaoAlternativa = {
      success: true,
      originalNumber: numeroOriginal,
      cleanedNumber: numeroComPais,
      finalNumber: numeroComPais,
      whatsappFormat: numeroComPais + "@c.us",
      numberType: "brazilian",
    };

    // Verifica se a versão alternativa existe
    const verificacaoAlternativa = await verificarNumeroExisteWhatsApp(
      conversaoAlternativa.whatsappFormat
    );
    resultado.variacoes.push({
      tipo: "alternativa",
      numeroConvertido: conversaoAlternativa,
      verificacao: verificacaoAlternativa,
    });

    // Determina qual versão usar
    const originalExiste = verificacaoOriginal.existe;
    const alternativaExiste = verificacaoAlternativa.existe;

    if (originalExiste && alternativaExiste) {
      resultado.multiplosValidos = true;
      resultado.numeroValido = conversaoOriginal; // Prefere o original
      resultado.erro =
        "ATENÇÃO: Ambas as versões (com e sem 9) existem no WhatsApp! Usando versão original.";
    } else if (originalExiste) {
      resultado.numeroValido = conversaoOriginal;
    } else if (alternativaExiste) {
      resultado.numeroValido = conversaoAlternativa;
    } else {
      resultado.erro =
        "Número não existe no WhatsApp em nenhuma das variações testadas";
    }

    return resultado;
  } catch (error) {
    return {
      numeroOriginal: numeroOriginal,
      variacoes: [],
      numeroValido: null,
      multiplosValidos: false,
      erro: `Erro durante validação: ${error.message}`,
    };
  }
}

/**
 * Valida uma lista de números em lote
 * @param {Array<Object>} numerosLista - Array de objetos com números da memória
 * @param {Function} onProgress - Callback de progresso
 * @returns {Promise<Object>} - Resultado da validação em lote
 */
async function validarListaNumerosWhatsApp(numerosLista, onProgress = null) {
  const resultado = {
    totalProcessados: 0,
    numerosValidos: [],
    numerosInvalidos: [],
    numerosComAlternativa: [],
    multiplosValidos: [],
    erros: [],
  };

  for (let i = 0; i < numerosLista.length; i++) {
    const numeroObj = numerosLista[i];

    try {
      if (onProgress) {
        onProgress({
          atual: i + 1,
          total: numerosLista.length,
          numero: numeroObj.originalNumber,
          status: "validando",
        });
      }

      const validacao = await validarNumeroBrasileiro11Digitos(
        numeroObj.originalNumber
      );
      resultado.totalProcessados++;

      if (validacao.numeroValido) {
        const numeroAtualizado = {
          ...numeroObj,
          // Atualiza com a versão validada
          whatsappFormat: validacao.numeroValido.whatsappFormat,
          finalNumber: validacao.numeroValido.finalNumber,
          validado: true,
          versaoAlternativaUsada:
            validacao.numeroValido !== validacao.variacoes[0]?.numeroConvertido,
        };

        resultado.numerosValidos.push(numeroAtualizado);

        if (validacao.multiplosValidos) {
          resultado.multiplosValidos.push({
            numero: numeroObj.originalNumber,
            aviso: validacao.erro,
          });
        }

        if (numeroAtualizado.versaoAlternativaUsada) {
          resultado.numerosComAlternativa.push({
            original: numeroObj.whatsappFormat,
            corrigido: validacao.numeroValido.whatsappFormat,
            numeroOriginal: numeroObj.originalNumber,
          });
        }
      } else {
        resultado.numerosInvalidos.push({
          ...numeroObj,
          motivoInvalido: validacao.erro,
        });
      }

      if (onProgress) {
        onProgress({
          atual: i + 1,
          total: numerosLista.length,
          numero: numeroObj.originalNumber,
          status: validacao.numeroValido ? "valido" : "invalido",
        });
      }

      // Pequeno delay entre validações para não sobrecarregar
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      resultado.erros.push({
        numero: numeroObj.originalNumber,
        erro: error.message,
      });

      if (onProgress) {
        onProgress({
          atual: i + 1,
          total: numerosLista.length,
          numero: numeroObj.originalNumber,
          status: "erro",
          erro: error.message,
        });
      }
    }
  }

  return resultado;
}

/**
 * Aplica correções na lista de números em memória
 * @param {Array<Object>} numerosValidos - Números validados
 * @param {Array<Object>} numbersInMemory - Referência para o array em memória
 * @returns {Object} - Resultado da aplicação
 */
function aplicarCorrecoes(numerosValidos, numbersInMemory) {
  try {
    // Limpa a lista atual
    numbersInMemory.length = 0;

    // Adiciona apenas os números válidos
    numbersInMemory.push(...numerosValidos);

    return {
      success: true,
      message: `Lista atualizada com ${numerosValidos.length} números válidos`,
      totalCorrigidos: numerosValidos.filter((n) => n.versaoAlternativaUsada)
        .length,
    };
  } catch (error) {
    return {
      success: false,
      error: `Erro ao aplicar correções: ${error.message}`,
    };
  }
}

module.exports = {
  verificarNumeroExisteWhatsApp,
  validarNumeroBrasileiro11Digitos,
  validarListaNumerosWhatsApp,
  aplicarCorrecoes,
};
