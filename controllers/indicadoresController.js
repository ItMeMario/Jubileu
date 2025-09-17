const indicadoresService = require("../services/indicadoresService");
const indicadoresView = require("../views/indicadoresView");

// ===============================
// MÉTODOS PARA CLI
// ===============================

async function handleIndicadoresMenu(rl) {
  while (true) {
    indicadoresView.showMenu();

    const choice = await new Promise((resolve) => {
      rl.question("Escolha uma opção: ", resolve);
    });

    switch (choice) {
      case "1":
        await showCompleteStatistics();
        break;
      case "2":
        await showHourlyStatistics();
        break;
      case "3":
        await clearStatistics(rl);
        break;
      case "4":
        await exportToTxt();
        break;
      case "0":
        return;
      default:
        indicadoresView.showInvalidOption();
    }
  }
}

async function showCompleteStatistics() {
  const stats = await indicadoresService.getStatistics();
  const processedStats = processCompleteStatistics(stats);
  indicadoresView.showCompleteStatistics(processedStats);
}

async function showHourlyStatistics() {
  const hourlyStats = await indicadoresService.getHourlyStatistics();
  const processedStats = processHourlyStatistics(hourlyStats);
  indicadoresView.showHourlyStatistics(processedStats);
}

async function clearStatistics(rl) {
  const shouldProceed = await indicadoresView.showClearConfirmation(rl);

  if (shouldProceed) {
    const isDoubleConfirmed = await indicadoresView.showDoubleConfirmation(rl);

    if (isDoubleConfirmed) {
      indicadoresService.clearStatistics();
      indicadoresView.showClearSuccess();
    } else {
      indicadoresView.showIncorrectConfirmation();
    }
  } else {
    indicadoresView.showOperationCancelled();
  }
}

async function exportToTxt() {
  try {
    const filePath = indicadoresService.exportToTxt();
    indicadoresView.showExportSuccess(filePath);
  } catch (error) {
    indicadoresView.showExportError(error.message);
  }
}

// ===============================
// FUNÇÕES AUXILIARES
// ===============================

function processCompleteStatistics(stats) {
  const taxaConversao =
    stats.clientesAtendidos > 0
      ? ((stats.clientesConvidados / stats.clientesAtendidos) * 100).toFixed(1)
      : "0.0";

  let horarioStats = null;

  if (stats.horariosEscolhidos) {
    let totalHorarios = 0;
    Object.values(stats.horariosEscolhidos).forEach((horario) => {
      totalHorarios += horario.count;
    });

    if (totalHorarios > 0) {
      const horariosProcessados = Object.entries(stats.horariosEscolhidos).map(
        ([id, horario]) => {
          const percentual = ((horario.count / totalHorarios) * 100).toFixed(1);
          const barra = "█".repeat(
            Math.round((horario.count / totalHorarios) * 20)
          );
          return {
            id,
            horario: horario.horario,
            count: horario.count,
            percentual,
            barra,
          };
        }
      );

      // Horário mais popular
      const horarioMaisPopular = Object.entries(
        stats.horariosEscolhidos
      ).reduce((prev, current) =>
        prev[1].count > current[1].count ? prev : current
      );

      // Horário menos popular (com pelo menos 1 escolha)
      const horariosComEscolhas = Object.entries(
        stats.horariosEscolhidos
      ).filter(([_, horario]) => horario.count > 0);

      let horarioMenosPopular = null;
      if (horariosComEscolhas.length > 1) {
        horarioMenosPopular = horariosComEscolhas.reduce((prev, current) =>
          prev[1].count < current[1].count ? prev : current
        );
      }

      horarioStats = {
        horariosProcessados,
        totalHorarios,
        horarioMaisPopular: {
          horario: horarioMaisPopular[1].horario,
          count: horarioMaisPopular[1].count,
        },
        horarioMenosPopular: horarioMenosPopular
          ? {
              horario: horarioMenosPopular[1].horario,
              count: horarioMenosPopular[1].count,
            }
          : null,
      };
    }
  }

  return {
    clientesAtendidos: stats.clientesAtendidos,
    clientesConvidados: stats.clientesConvidados,
    taxaConversao,
    lastUpdated: stats.lastUpdated || "N/A",
    horarioStats,
  };
}

function processHourlyStatistics(hourlyStats) {
  if (Object.keys(hourlyStats).length === 0) {
    return { hasData: false };
  }

  let totalHorarios = 0;
  Object.values(hourlyStats).forEach((horario) => {
    totalHorarios += horario.count;
  });

  if (totalHorarios === 0) {
    const horariosDisponiveis = Object.entries(hourlyStats).map(
      ([id, horario]) => ({
        id,
        horario: horario.horario,
      })
    );

    return {
      hasData: false,
      hasHorarios: true,
      horariosDisponiveis,
    };
  }

  // Ordena por popularidade (maior para menor)
  const horariosOrdenados = Object.entries(hourlyStats)
    .sort(([, a], [, b]) => b.count - a.count)
    .map(([id, horario], index) => {
      const percentual = ((horario.count / totalHorarios) * 100).toFixed(1);
      const barra = "█".repeat(
        Math.round((horario.count / totalHorarios) * 30)
      );
      return {
        posicao: index + 1,
        id,
        horario: horario.horario,
        count: horario.count,
        percentual,
        barra,
      };
    });

  const horariosComEscolhas = horariosOrdenados.filter((h) => h.count > 0);
  const horariosZerados = horariosOrdenados.filter((h) => h.count === 0);

  return {
    hasData: true,
    horariosOrdenados,
    totalHorarios,
    horariosComEscolhas: horariosComEscolhas.length,
    horariosZerados: horariosZerados.length,
    totalHorarios: 6,
    horariosNaoEscolhidos: horariosZerados.map((h) => h.horario),
  };
}

module.exports = {
  handleIndicadoresMenu,
  processCompleteStatistics,
  processHourlyStatistics,
};
