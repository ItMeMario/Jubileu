// services/droneServiceModules/numberTransformDSM.js

/**
 * Aplica transformações ao número conforme opções escolhidas
 * @param {string} numero - Número original
 * @param {Object} opcoes - Opções de transformação
 * @param {string} opcoes.prefixoPais - Prefixo do país (ex: "55")
 * @param {string} opcoes.ddd - DDD a ser adicionado (ex: "11")
 * @param {boolean} opcoes.adicionar9Digito - Se deve adicionar o 9º dígito
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

module.exports = {
  aplicarTransformacoes,
};
