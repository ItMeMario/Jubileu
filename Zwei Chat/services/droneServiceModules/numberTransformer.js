// services/droneServiceModules/numberTransformer.js

/**
 * Aplica transformações e padronização ao número conforme opções escolhidas
 * Garante que números brasileiros sigam os formatos canônicos sem duplicações de DDD ou prefixo.
 */
function aplicarTransformacoes(numero, opcoes = {}) {
    if (!numero) return "";

    // 1. Remove qualquer caractere que não seja dígito
    let numeroProcessado = numero.toString().replace(/\D/g, "");

    // 2. Remove zero à esquerda comum em discagens locais (ex: "011987654321" -> "11987654321")
    if (numeroProcessado.startsWith("0")) {
        numeroProcessado = numeroProcessado.replace(/^0+/, "");
    }

    const ddd = opcoes.ddd ? opcoes.ddd.toString().replace(/\D/g, "") : "";
    const prefixo = opcoes.prefixoPais ? opcoes.prefixoPais.toString().replace(/\D/g, "") : "";

    // Se o número vier com prefixo de país internacional ("55") mas sem DDD (10 ou 11 dígitos com 55 na frente)
    // ou se vier com 55 e tiver 12/13 dígitos, tratamos os casos:
    let temPrefixoPais = false;
    if (prefixo && prefixo.length > 0) {
        if (numeroProcessado.startsWith(prefixo) && numeroProcessado.length >= 12) {
            temPrefixoPais = true;
        }
    }

    // 3. Aplica DDD se configurado
    // Um número só precisa de DDD se tiver 8 ou 9 dígitos (apenas o número local)
    if (opcoes.addDDD !== false && ddd && ddd.length > 0) {
        if (numeroProcessado.length === 8 || numeroProcessado.length === 9) {
            // Não tem DDD, adiciona
            numeroProcessado = ddd + numeroProcessado;
        }
    }

    // 4. Adiciona 9º dígito (para celulares brasileiros com 8 dígitos)
    if (opcoes.adicionar9Digito === true) {
        if (temPrefixoPais) {
            // Formato: Prefixo (2) + DDD (2) + 8 dígitos = 12 dígitos
            if (numeroProcessado.length === (prefixo.length + 2 + 8)) {
                const header = numeroProcessado.substring(0, prefixo.length + 2);
                const local = numeroProcessado.substring(prefixo.length + 2);
                numeroProcessado = header + "9" + local;
            }
        } else {
            // Formato com DDD: DDD (2) + 8 dígitos = 10 dígitos
            if (numeroProcessado.length === 10) {
                const dddParte = numeroProcessado.substring(0, 2);
                const localParte = numeroProcessado.substring(2);
                numeroProcessado = dddParte + "9" + localParte;
            } else if (numeroProcessado.length === 8) {
                // Apenas local sem DDD (8 dígitos)
                numeroProcessado = "9" + numeroProcessado;
            }
        }
    }

    // 5. Aplica prefixo de país (ex: "55")
    if (opcoes.addCountryPrefix !== false && prefixo && prefixo.length > 0) {
        // Se o número tem 10 ou 11 dígitos (DDD + 8 ou 9 dígitos), ele OBRIGATORIAMENTE precisa do prefixo de país
        // Mesmo que comece com "55" (ex: DDD 55 de Santa Maria/RS: "55998765432" -> "5555998765432")
        if (numeroProcessado.length === 10 || numeroProcessado.length === 11) {
            numeroProcessado = prefixo + numeroProcessado;
        } else if (numeroProcessado.length > 0 && !numeroProcessado.startsWith(prefixo)) {
            numeroProcessado = prefixo + numeroProcessado;
        }
    }

    return numeroProcessado;
}

module.exports = {
    aplicarTransformacoes
};
