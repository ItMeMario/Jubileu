// services/droneServiceModules/csvParserDSM.js

/**
 * Processa arquivo CSV e retorna dados estruturados
 * @param {string} csvContent - Conteúdo do arquivo CSV
 * @returns {Object} - Dados parseados
 */
function parseCSV(csvContent) {
  try {
    const lines = csvContent
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      return {
        success: false,
        error: "Arquivo CSV vazio",
        data: [],
      };
    }

    const data = [];
    let startIndex = 0;

    // Detecta se primeira linha é cabeçalho
    const firstLine = lines[0];
    const hasHeader = /^[a-zA-Z\s]+[,;]\s*[a-zA-Z\s]+/i.test(firstLine);

    if (hasHeader) {
      startIndex = 1;
      console.log("Cabeçalho detectado e ignorado:", firstLine);
    }

    // Processa linhas de dados
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];

      // Separa por vírgula ou ponto-e-vírgula
      const parts = line.split(/[,;]/).map((p) => p.trim());

      if (parts.length >= 2) {
        const nome = parts[0];
        const numero = parts[1];

        // Valida se tem conteúdo
        if (numero && numero.length > 0) {
          data.push({
            nome: nome || "",
            numero: numero,
            linhaOriginal: i + 1,
          });
        }
      }
    }

    return {
      success: true,
      data: data,
      totalLinhas: data.length,
      tinhaHeader: hasHeader,
    };
  } catch (error) {
    return {
      success: false,
      error: "Erro ao processar CSV: " + error.message,
      data: [],
    };
  }
}

module.exports = {
  parseCSV,
};
