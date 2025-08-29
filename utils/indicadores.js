const db = require("../config/db");
const { debug } = require("../services/debugService");

// Função para executar queries com Promise
function runQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
}

// Função para buscar dados com Promise
function getQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

// Função para buscar múltiplos dados com Promise
function allQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Função para incrementar clientes atendidos
async function incrementarAtendidos() {
  try {
    await runQuery(
      `INSERT INTO indicators (clientes_atendidos, clientes_convidados) VALUES (1, 0)`
    );

    // Retorna o total atual de clientes atendidos
    const result = await getQuery(
      `SELECT COALESCE(SUM(clientes_atendidos), 0) as total FROM indicators`
    );

    return result.total;
  } catch (error) {
    console.error("Erro ao incrementar atendidos:", error);
    throw error;
  }
}

// Função para incrementar clientes convidados
async function incrementarConvidados() {
  try {
    await runQuery(
      `INSERT INTO indicators (clientes_atendidos, clientes_convidados) VALUES (0, 1)`
    );

    // Retorna o total atual de clientes convidados
    const result = await getQuery(
      `SELECT COALESCE(SUM(clientes_convidados), 0) as total FROM indicators`
    );

    return result.total;
  } catch (error) {
    console.error("Erro ao incrementar convidados:", error);
    throw error;
  }
}

// Função para incrementar horário escolhido
async function incrementarHorario(horarioId) {
  try {
    const id = parseInt(horarioId);

    // Valida se o horário ID está no range correto (1-6)
    if (id < 1 || id > 6) {
      console.warn(`Horário com ID ${id} inválido. Deve estar entre 1 e 6.`);
      return 0;
    }

    await runQuery(
      `INSERT INTO indicators (clientes_atendidos, clientes_convidados, horario_escolhido) VALUES (0, 0, ?)`,
      [id]
    );

    // Retorna o total de escolhas para este horário
    const result = await getQuery(
      `SELECT COUNT(*) as count FROM indicators WHERE horario_escolhido = ?`,
      [id]
    );

    return result.count;
  } catch (error) {
    console.error(`Erro ao incrementar horário ${horarioId}:`, error);
    throw error;
  }
}

// Função para obter estatísticas de horários
async function getEstatisticasHorarios() {
  try {
    // Mapeamento dos horários disponíveis
    const horarios = {
      1: { horario: "10:00h (Manhã)", count: 0 },
      2: { horario: "12:00h (Meio-dia)", count: 0 },
      3: { horario: "14:00h (Depois do almoço)", count: 0 },
      4: { horario: "15:30h (Tarde)", count: 0 },
      5: { horario: "17:30h (Final da tarde)", count: 0 },
      6: { horario: "19:30h (Noite)", count: 0 },
    };

    // Busca os dados do banco
    const results = await allQuery(
      `SELECT horario_escolhido, COUNT(*) as count 
       FROM indicators 
       WHERE horario_escolhido IS NOT NULL 
       GROUP BY horario_escolhido`
    );

    // Atualiza os contadores com os dados do banco
    results.forEach((row) => {
      if (horarios[row.horario_escolhido]) {
        horarios[row.horario_escolhido].count = row.count;
      }
    });

    return horarios;
  } catch (error) {
    console.error("Erro ao obter estatísticas de horários:", error);
    throw error;
  }
}

// Função para obter todos os indicadores
async function getIndicadores() {
  try {
    // Busca totais de clientes
    const totalsResult = await getQuery(`
      SELECT 
        COALESCE(SUM(clientes_atendidos), 0) as clientesAtendidos,
        COALESCE(SUM(clientes_convidados), 0) as clientesConvidados,
        MAX(updated_at) as lastUpdated
      FROM indicators
    `);

    // Busca estatísticas de horários
    const horariosEscolhidos = await getEstatisticasHorarios();

    return {
      clientesAtendidos: totalsResult.clientesAtendidos,
      clientesConvidados: totalsResult.clientesConvidados,
      horariosEscolhidos: horariosEscolhidos,
      lastUpdated: totalsResult.lastUpdated || new Date().toISOString(),
    };
  } catch (error) {
    console.error("Erro ao obter indicadores:", error);
    throw error;
  }
}

// Função para limpar todos os dados (usada pelo sistema de reset)
async function clearAllData() {
  try {
    await runQuery(`DELETE FROM indicators`);
    debug("✅ Todos os dados de indicadores foram limpos do banco");
    return true;
  } catch (error) {
    console.error("Erro ao limpar dados dos indicadores:", error);
    throw error;
  }
}

// Função para obter estatísticas básicas de contagem
async function getBasicStats() {
  try {
    const result = await getQuery(`
      SELECT 
        COUNT(*) as totalRegistros,
        COALESCE(SUM(clientes_atendidos), 0) as totalAtendidos,
        COALESCE(SUM(clientes_convidados), 0) as totalConvidados,
        COUNT(CASE WHEN horario_escolhido IS NOT NULL THEN 1 END) as totalHorarios
      FROM indicators
    `);

    return result;
  } catch (error) {
    console.error("Erro ao obter estatísticas básicas:", error);
    throw error;
  }
}

module.exports = {
  incrementarAtendidos,
  incrementarConvidados,
  incrementarHorario,
  getEstatisticasHorarios,
  getIndicadores,
  clearAllData,
  getBasicStats,
};
