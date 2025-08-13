const path = require("path");
const os = require("os");
const fs = require("fs");
const indicadores = require("../utils/indicadores");

async function getStatistics() {
  try {
    return await indicadores.getIndicadores();
  } catch (error) {
    console.error("Erro ao obter estatísticas:", error);
    // Retorna dados padrão em caso de erro
    return {
      clientesAtendidos: 0,
      clientesConvidados: 0,
      horariosEscolhidos: {
        1: { horario: "10:00h (Manhã)", count: 0 },
        2: { horario: "12:00h (Meio-dia)", count: 0 },
        3: { horario: "14:00h (Depois do almoço)", count: 0 },
        4: { horario: "15:30h (Tarde)", count: 0 },
        5: { horario: "17:30h (Final da tarde)", count: 0 },
        6: { horario: "19:30h (Noite)", count: 0 },
      },
      lastUpdated: new Date().toISOString(),
    };
  }
}

async function clearStatistics() {
  try {
    await indicadores.clearAllData();

    // Retorna os dados zerados
    return {
      clientesAtendidos: 0,
      clientesConvidados: 0,
      horariosEscolhidos: {
        1: { horario: "10:00h (Manhã)", count: 0 },
        2: { horario: "12:00h (Meio-dia)", count: 0 },
        3: { horario: "14:00h (Depois do almoço)", count: 0 },
        4: { horario: "15:30h (Tarde)", count: 0 },
        5: { horario: "17:30h (Final da tarde)", count: 0 },
        6: { horario: "19:30h (Noite)", count: 0 },
      },
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Erro ao limpar estatísticas:", error);
    throw error;
  }
}

async function exportToTxt() {
  try {
    const stats = await getStatistics();
    const desktopPath = path.join(os.homedir(), "Desktop");
    const filePath = path.join(desktopPath, "indicadores_bot.txt");

    let content = `Estatísticas do Bot - ${new Date().toLocaleString()}\n\n`;
    content += `Clientes Atendidos: ${stats.clientesAtendidos}\n`;
    content += `Clientes Convidados: ${stats.clientesConvidados}\n`;

    // Calcula taxa de conversão
    const taxaConversao =
      stats.clientesAtendidos > 0
        ? ((stats.clientesConvidados / stats.clientesAtendidos) * 100).toFixed(
            1
          )
        : "0.0";
    content += `Taxa de Conversão: ${taxaConversao}%\n`;
    content += `Última Atualização: ${stats.lastUpdated || "N/A"}\n\n`;

    // Adiciona estatísticas de horários
    content += `=== ESTATÍSTICAS DE HORÁRIOS ESCOLHIDOS ===\n\n`;

    if (stats.horariosEscolhidos) {
      let totalHorarios = 0;

      // Calcula o total primeiro
      Object.values(stats.horariosEscolhidos).forEach((horario) => {
        totalHorarios += horario.count;
      });

      if (totalHorarios > 0) {
        // Lista cada horário com percentual
        Object.entries(stats.horariosEscolhidos).forEach(([id, horario]) => {
          const percentual = ((horario.count / totalHorarios) * 100).toFixed(1);
          content += `${horario.horario}: ${horario.count} escolhas (${percentual}%)\n`;
        });

        content += `\nTotal de horários escolhidos: ${totalHorarios}\n`;

        // Horário mais popular
        const horarioMaisPopular = Object.entries(
          stats.horariosEscolhidos
        ).reduce((prev, current) =>
          prev[1].count > current[1].count ? prev : current
        );
        content += `Horário mais popular: ${horarioMaisPopular[1].horario} (${horarioMaisPopular[1].count} escolhas)\n`;

        // Horário menos popular (com pelo menos 1 escolha)
        const horariosComEscolhas = Object.entries(
          stats.horariosEscolhidos
        ).filter(([_, horario]) => horario.count > 0);

        if (horariosComEscolhas.length > 1) {
          const horarioMenosPopular = horariosComEscolhas.reduce(
            (prev, current) =>
              prev[1].count < current[1].count ? prev : current
          );
          content += `Horário menos popular: ${horarioMenosPopular[1].horario} (${horarioMenosPopular[1].count} escolhas)\n`;
        }

        // Horários não escolhidos
        const horariosNaoEscolhidos = Object.entries(stats.horariosEscolhidos)
          .filter(([_, horario]) => horario.count === 0)
          .map(([_, horario]) => horario.horario);

        if (horariosNaoEscolhidos.length > 0) {
          content += `\nHorários não escolhidos:\n`;
          horariosNaoEscolhidos.forEach((horario) => {
            content += `• ${horario}\n`;
          });
        }
      } else {
        content += `Nenhum horário foi escolhido ainda.\n\n`;
        content += `Horários disponíveis:\n`;
        Object.entries(stats.horariosEscolhidos).forEach(([id, horario]) => {
          content += `${id}. ${horario.horario}\n`;
        });
      }
    } else {
      content += `Nenhum dado de horários disponível.\n`;
    }

    // Adiciona informações adicionais
    content += `\n=== INFORMAÇÕES ADICIONAIS ===\n`;
    content += `Gerado em: ${new Date().toLocaleString()}\n`;
    content += `Sistema: Bot de Atendimento\n`;
    content += `Fonte: Banco de dados SQLite\n`;

    fs.writeFileSync(filePath, content);
    return filePath;
  } catch (error) {
    console.error("Erro ao exportar para TXT:", error);
    throw error;
  }
}

// Função para obter apenas as estatísticas de horários
async function getHourlyStatistics() {
  try {
    const stats = await getStatistics();
    return stats.horariosEscolhidos || {};
  } catch (error) {
    console.error("Erro ao obter estatísticas de horários:", error);
    return {};
  }
}

// Função adicional para obter estatísticas resumidas
async function getSummaryStatistics() {
  try {
    const basicStats = await indicadores.getBasicStats();
    const stats = await getStatistics();

    return {
      totalRegistros: basicStats.totalRegistros,
      totalAtendidos: basicStats.totalAtendidos,
      totalConvidados: basicStats.totalConvidados,
      totalHorarios: basicStats.totalHorarios,
      taxaConversao:
        basicStats.totalAtendidos > 0
          ? (
              (basicStats.totalConvidados / basicStats.totalAtendidos) *
              100
            ).toFixed(1)
          : "0.0",
      lastUpdated: stats.lastUpdated,
    };
  } catch (error) {
    console.error("Erro ao obter estatísticas resumidas:", error);
    return {
      totalRegistros: 0,
      totalAtendidos: 0,
      totalConvidados: 0,
      totalHorarios: 0,
      taxaConversao: "0.0",
      lastUpdated: new Date().toISOString(),
    };
  }
}

module.exports = {
  getStatistics,
  clearStatistics,
  exportToTxt,
  getHourlyStatistics,
  getSummaryStatistics,
};
