// services/sentinelaService.js
// Service responsável pelo processamento de CSV e gerenciamento de area_codes

const { getDatabaseConnection } = require("../config/initialize");

/**
 * Parseia conteúdo CSV e retorna dados estruturados
 * Formato esperado: coluna A = nome, coluna B = telefone
 * @param {string} csvContent - Conteúdo bruto do arquivo CSV
 * @returns {Object} - { success, data[], totalLinhas, tinhaHeader }
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
    const hasHeader = /^[a-zA-ZÀ-ÿ\s]+[,;\t]\s*[a-zA-ZÀ-ÿ\s]+/i.test(firstLine);

    if (hasHeader) {
      startIndex = 1;
      console.log("[Sentinela] Cabeçalho detectado e ignorado:", firstLine);
    }

    // Processa linhas de dados
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];

      // Separa por vírgula, ponto-e-vírgula ou tab
      const parts = line.split(/[,;\t]/).map((p) => p.trim());

      if (parts.length >= 2) {
        const nome = parts[0];
        const numero = parts[1];

        data.push({
          nome: nome || "",
          numero: numero || "",
          linhaOriginal: i + 1,
        });
      } else if (parts.length === 1) {
        // Apenas um campo - pode ser só o número
        data.push({
          nome: "",
          numero: parts[0] || "",
          linhaOriginal: i + 1,
        });
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

/**
 * Normaliza um número de telefone removendo caracteres não-numéricos
 * @param {string} raw - Número bruto (ex: "(11) 9999-9999")
 * @returns {string|null} - Número normalizado ou null se inválido
 */
function normalizePhone(raw) {
  if (!raw || typeof raw !== "string") return null;

  // Remove tudo que não é dígito
  const cleaned = raw.replace(/\D/g, "");

  // Número precisa ter pelo menos 3 dígitos (DDD + algum número)
  if (cleaned.length < 3) return null;

  return cleaned;
}

/**
 * Extrai DDD e telefone de um número normalizado
 * DDD = primeiros 2 dígitos
 * Telefone = restante
 * @param {string} normalizedNumber - Número já normalizado (só dígitos)
 * @returns {{ ddd: string, tel: string }}
 */
function extractDDDAndPhone(normalizedNumber) {
  const ddd = normalizedNumber.substring(0, 2);
  const tel = normalizedNumber.substring(2);

  return { ddd, tel };
}

/**
 * Executa uma query SQL e retorna uma Promise
 * @param {Object} db - Conexão com o banco
 * @param {string} sql - Query SQL
 * @param {Array} params - Parâmetros
 * @returns {Promise}
 */
function runQuery(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

/**
 * Busca todos os resultados de uma query SQL
 * @param {Object} db - Conexão com o banco
 * @param {string} sql - Query SQL
 * @param {Array} params - Parâmetros
 * @returns {Promise<Array>}
 */
function allQuery(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/**
 * Busca um resultado de uma query SQL
 * @param {Object} db - Conexão com o banco
 * @param {string} sql - Query SQL
 * @param {Array} params - Parâmetros
 * @returns {Promise<Object>}
 */
function getQuery(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

/**
 * Processa importação completa de CSV para a tabela area_codes
 * 1. Parseia CSV
 * 2. Normaliza e valida cada linha
 * 3. Incrementa prioridade de registros existentes
 * 4. Insere novos / atualiza duplicatas
 * @param {string} csvContent - Conteúdo do arquivo CSV
 * @returns {Promise<Object>} - Resumo da importação
 */
async function processImport(csvContent) {
  let db;

  try {
    // 1. Parseia o CSV
    const parseResult = parseCSV(csvContent);

    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error,
        adicionados: 0,
        atualizados: 0,
        ignorados: 0,
        erros: [],
      };
    }

    if (parseResult.data.length === 0) {
      return {
        success: false,
        error: "Nenhum dado encontrado no CSV",
        adicionados: 0,
        atualizados: 0,
        ignorados: 0,
        erros: [],
      };
    }

    // 2. Processa e valida cada linha
    const registrosValidos = [];
    const erros = [];
    const ignorados = [];

    for (const item of parseResult.data) {
      const normalized = normalizePhone(item.numero);

      if (!normalized) {
        // Número vazio ou inválido - ignora
        ignorados.push({
          linha: item.linhaOriginal,
          nome: item.nome || "(vazio)",
          numero: item.numero || "(vazio)",
          motivo: "Número vazio ou inválido",
        });
        continue;
      }

      const { ddd, tel } = extractDDDAndPhone(normalized);

      if (!tel || tel.length === 0) {
        ignorados.push({
          linha: item.linhaOriginal,
          nome: item.nome || "(vazio)",
          numero: item.numero,
          motivo: "Telefone ficou vazio após extrair DDD",
        });
        continue;
      }

      registrosValidos.push({
        nome: item.nome || "",
        ddd: ddd,
        tel: tel,
        linha: item.linhaOriginal,
        numeroOriginal: item.numero,
      });
    }

    if (registrosValidos.length === 0) {
      return {
        success: false,
        error: "Nenhum número válido encontrado no CSV",
        adicionados: 0,
        atualizados: 0,
        ignorados: ignorados.length,
        detalhesIgnorados: ignorados,
        erros: [],
      };
    }

    // 3. Conecta ao banco e processa
    db = await getDatabaseConnection();

    // Incrementa prioridade de TODOS os registros existentes
    await runQuery(db, "UPDATE area_codes SET priority = priority + 1");
    console.log("[Sentinela] Prioridades existentes incrementadas");

    // 4. Insere novos registros ou atualiza duplicatas
    let adicionados = 0;
    let atualizados = 0;

    for (const reg of registrosValidos) {
      try {
        // Verifica se o número (ddd + tel) já existe
        const fullNumber = reg.ddd + reg.tel;
        const existing = await getQuery(
          db,
          "SELECT id FROM area_codes WHERE ddd = ? AND tel = ?",
          [reg.ddd, reg.tel]
        );

        if (existing) {
          // Atualiza registro existente com novo nome e prioridade 1
          await runQuery(
            db,
            "UPDATE area_codes SET name = ?, priority = 1 WHERE id = ?",
            [reg.nome, existing.id]
          );
          atualizados++;
        } else {
          // Insere novo registro com prioridade 1
          await runQuery(
            db,
            "INSERT INTO area_codes (priority, name, ddd, tel) VALUES (1, ?, ?, ?)",
            [reg.nome, reg.ddd, reg.tel]
          );
          adicionados++;
        }
      } catch (err) {
        erros.push({
          linha: reg.linha,
          nome: reg.nome,
          numero: reg.numeroOriginal,
          erro: err.message,
        });
      }
    }

    db.close();

    const totalProcessados = adicionados + atualizados + erros.length;

    return {
      success: true,
      message: `Import concluído: ${adicionados} adicionados, ${atualizados} atualizados, ${ignorados.length} ignorados, ${erros.length} erros`,
      adicionados,
      atualizados,
      ignorados: ignorados.length,
      detalhesIgnorados: ignorados,
      totalErros: erros.length,
      erros,
      totalProcessados,
      totalLinhasCSV: parseResult.totalLinhas,
      tinhaHeader: parseResult.tinhaHeader,
    };
  } catch (error) {
    if (db) {
      try { db.close(); } catch (e) { /* ignore */ }
    }
    console.error("[Sentinela] Erro no processImport:", error);
    return {
      success: false,
      error: error.message,
      adicionados: 0,
      atualizados: 0,
      ignorados: 0,
      erros: [],
    };
  }
}

/**
 * Lista registros da tabela area_codes com filtros opcionais
 * @param {Object} filters - Filtros opcionais { ddd, priority, limit, offset }
 * @returns {Promise<Object>} - { success, data[], total }
 */
async function getAreaCodes(filters = {}) {
  let db;

  try {
    db = await getDatabaseConnection();

    let sql = "SELECT * FROM area_codes";
    let countSql = "SELECT COUNT(*) as total FROM area_codes";
    const conditions = [];
    const params = [];

    if (filters.ddd) {
      conditions.push("ddd = ?");
      params.push(filters.ddd);
    }

    if (filters.priority) {
      conditions.push("priority = ?");
      params.push(filters.priority);
    }

    if (conditions.length > 0) {
      const whereClause = " WHERE " + conditions.join(" AND ");
      sql += whereClause;
      countSql += whereClause;
    }

    // Ordenar por prioridade (menor = mais recente)
    sql += " ORDER BY priority ASC, id DESC";

    // Paginação
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;
    sql += ` LIMIT ${limit} OFFSET ${offset}`;

    const countParams = [...params];
    const rows = await allQuery(db, sql, params);
    const countResult = await getQuery(db, countSql, countParams);

    db.close();

    return {
      success: true,
      data: rows,
      total: countResult ? countResult.total : 0,
      limit,
      offset,
    };
  } catch (error) {
    if (db) {
      try { db.close(); } catch (e) { /* ignore */ }
    }
    console.error("[Sentinela] Erro ao buscar area_codes:", error);
    return {
      success: false,
      error: error.message,
      data: [],
      total: 0,
    };
  }
}

/**
 * Limpa todos os registros da tabela area_codes
 * @param {Object} filters - Filtros opcionais { ddd, priority, date }
 * @returns {Promise<Object>} - { success, message, removidos }
 */
async function clearAreaCodes(filters = {}) {
  let db;

  try {
    db = await getDatabaseConnection();

    let sql = "DELETE FROM area_codes";
    let countSql = "SELECT COUNT(*) as total FROM area_codes";
    const conditions = [];
    const params = [];

    if (filters.ddd) {
      conditions.push("ddd = ?");
      params.push(filters.ddd);
    }
    if (filters.priority) {
      conditions.push("priority = ?");
      params.push(filters.priority);
    }
    if (filters.date) {
      conditions.push("DATE(created_at) = ?");
      params.push(filters.date);
    }

    if (conditions.length > 0) {
      const whereClause = " WHERE " + conditions.join(" AND ");
      sql += whereClause;
      countSql += whereClause;
    }

    const countResult = await getQuery(db, countSql, params);
    const total = countResult ? countResult.total : 0;

    await runQuery(db, sql, params);

    db.close();

    return {
      success: true,
      message: `${total} registros removidos`,
      removidos: total,
    };
  } catch (error) {
    if (db) {
      try { db.close(); } catch (e) { /* ignore */ }
    }
    console.error("[Sentinela] Erro ao limpar area_codes:", error);
    return {
      success: false,
      error: error.message,
      removidos: 0,
    };
  }
}

/**
 * Obtém estatísticas da tabela area_codes
 * @returns {Promise<Object>} - Estatísticas gerais
 */
async function getImportStats() {
  let db;

  try {
    db = await getDatabaseConnection();

    const totalResult = await getQuery(db, "SELECT COUNT(*) as total FROM area_codes");
    const dddCount = await allQuery(
      db,
      "SELECT ddd, COUNT(*) as count FROM area_codes GROUP BY ddd ORDER BY count DESC"
    );
    const priorityCount = await allQuery(
      db,
      "SELECT priority, COUNT(*) as count FROM area_codes GROUP BY priority ORDER BY priority ASC"
    );

    db.close();

    return {
      success: true,
      total: totalResult ? totalResult.total : 0,
      porDDD: dddCount || [],
      porPrioridade: priorityCount || [],
    };
  } catch (error) {
    if (db) {
      try { db.close(); } catch (e) { /* ignore */ }
    }
    console.error("[Sentinela] Erro ao obter stats:", error);
    return {
      success: false,
      error: error.message,
      total: 0,
      porDDD: [],
      porPrioridade: [],
    };
  }
}

/**
 * Cria um novo evento no calendário
 * @param {Object} eventData - { data, titulo, descricao }
 */
async function createCalendarEvent(eventData) {
  let db;
  try {
    db = await getDatabaseConnection();
    await runQuery(
      db,
      "INSERT INTO calendar (data, titulo, cidade, estado, lat, lng, descricao) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        eventData.data,
        eventData.titulo,
        eventData.cidade || null,
        eventData.estado || null,
        eventData.lat || null,
        eventData.lng || null,
        eventData.descricao || "",
      ]
    );
    db.close();
    return { success: true, message: "Evento criado com sucesso" };
  } catch (error) {
    if (db) {
      try { db.close(); } catch (e) { /* ignore */ }
    }
    console.error("[Sentinela] Erro ao criar evento no calendário:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Busca os eventos do calendário
 * Retorna todos ordenados por data DESC (mais recente primeiro)
 */
async function getCalendarEvents() {
  let db;
  try {
    db = await getDatabaseConnection();
    const rows = await allQuery(db, "SELECT * FROM calendar ORDER BY data DESC", []);
    db.close();
    return { success: true, data: rows };
  } catch (error) {
    if (db) {
      try { db.close(); } catch (e) { /* ignore */ }
    }
    console.error("[Sentinela] Erro ao buscar eventos do calendário:", error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Exclui um evento do calendário
 * @param {number} id - ID do evento
 */
async function deleteCalendarEvent(id) {
  let db;
  try {
    db = await getDatabaseConnection();
    await runQuery(db, "DELETE FROM calendar WHERE id = ?", [id]);
    db.close();
    return { success: true, message: "Evento excluído com sucesso" };
  } catch (error) {
    if (db) {
      try { db.close(); } catch (e) { /* ignore */ }
    }
    console.error("[Sentinela] Erro ao excluir evento do calendário:", error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  parseCSV,
  normalizePhone,
  extractDDDAndPhone,
  processImport,
  getAreaCodes,
  clearAreaCodes,
  getImportStats,
  createCalendarEvent,
  getCalendarEvents,
  deleteCalendarEvent,
};
