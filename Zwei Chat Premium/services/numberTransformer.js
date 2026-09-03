// services/numberTransformer.js
// Utilitário de Normalização e Transformação de Telefones para Meta WhatsApp Cloud API

/**
 * Aplica transformações e padronização ao número de telefone conforme as configurações
 * @param {string} numero - Telefone em formato bruto
 * @param {object} [opcoes={}] - Opções de formatação
 * @param {boolean} [opcoes.add9thDigit=false] - Adicionar 9º dígito em celulares BR de 8 dígitos
 * @param {boolean} [opcoes.adicionar9Digito=false] - Alias em pt
 * @param {boolean} [opcoes.addDDD=false] - Inserir DDD padrão se ausente
 * @param {string} [opcoes.defaultDDD=""] - Valor do DDD (ex: "11", "47")
 * @param {string} [opcoes.ddd=""] - Alias do DDD
 * @param {boolean} [opcoes.addCountryPrefix=true] - Adicionar código do país se faltar
 * @param {string} [opcoes.defaultCountryPrefix="55"] - Código do país (ex: "55")
 * @param {string} [opcoes.prefixoPais="55"] - Alias do código do país
 * @returns {string} Telefone normalizado para o padrão E.164 (apenas dígitos)
 */
function aplicarTransformacoes(numero, opcoes = {}) {
  if (!numero) return "";

  // Remove qualquer caractere que não seja dígito
  let numeroProcessado = String(numero).replace(/\D/g, "");
  if (!numeroProcessado) return "";

  const addCountryPrefix =
    opcoes.addCountryPrefix !== undefined
      ? !!opcoes.addCountryPrefix
      : opcoes.prefixoPais !== undefined
      ? true
      : false;

  const countryPrefix = String(
    opcoes.defaultCountryPrefix || opcoes.prefixoPais || "55"
  ).replace(/\D/g, "");

  const addDDD =
    opcoes.addDDD !== undefined
      ? !!opcoes.addDDD
      : opcoes.ddd !== undefined
      ? true
      : false;

  const defaultDDD = String(
    opcoes.defaultDDD || opcoes.ddd || ""
  ).replace(/\D/g, "");

  const add9thDigit =
    opcoes.add9thDigit !== undefined
      ? !!opcoes.add9thDigit
      : !!opcoes.adicionar9Digito;

  // 1. Aplica Prefixo de País (se ativado e se o número ainda não começar com ele)
  if (addCountryPrefix && countryPrefix.length > 0) {
    // Se o número tiver menos de 12 dígitos e não começar com o código do país
    if (!numeroProcessado.startsWith(countryPrefix)) {
      numeroProcessado = countryPrefix + numeroProcessado;
    }
  }

  // 2. Aplica DDD (se ativado e se o número estiver sem DDD)
  if (addDDD && defaultDDD.length > 0) {
    if (addCountryPrefix && countryPrefix.length > 0) {
      // Formato com prefixo de país (ex: 55 + 8 ou 9 dígitos = 10 ou 11 dígitos no total)
      if (
        numeroProcessado.startsWith(countryPrefix) &&
        numeroProcessado.length < 13
      ) {
        // Se após o prefixo restarem menos de 10 dígitos (isto é, só o número sem DDD)
        const resto = numeroProcessado.substring(countryPrefix.length);
        if (resto.length <= 9) {
          numeroProcessado = countryPrefix + defaultDDD + resto;
        }
      }
    } else {
      // Sem prefixo de país, número local tem 8 ou 9 dígitos
      if (numeroProcessado.length <= 9 && !numeroProcessado.startsWith(defaultDDD)) {
        numeroProcessado = defaultDDD + numeroProcessado;
      }
    }
  }

  // 3. Adiciona 9º Dígito (para números brasileiros)
  if (add9thDigit) {
    if (numeroProcessado.startsWith("55")) {
      // Formato esperado: 55 + DDD (2 dígitos) + Número (8 ou 9 dígitos)
      // Total com 8 dígitos: 55 + 2 + 8 = 12 dígitos
      if (numeroProcessado.length === 12) {
        const dddParte = numeroProcessado.substring(0, 4); // "55" + DDD (2)
        const corpoNumero = numeroProcessado.substring(4); // 8 dígitos
        numeroProcessado = dddParte + "9" + corpoNumero;
      }
    } else if (numeroProcessado.length === 10) {
      // Formato sem prefixo: DDD (2) + Número (8) = 10 dígitos
      const dddParte = numeroProcessado.substring(0, 2);
      const corpoNumero = numeroProcessado.substring(2);
      numeroProcessado = dddParte + "9" + corpoNumero;
    }
  }

  return numeroProcessado;
}

module.exports = {
  aplicarTransformacoes,
};
