// reminderScheduler.js
//
// Responsável por agendar e executar lembretes no horário configurado.
// Migração: agora executa apenas uma vez por dia, em horários definidos no reminderConfig.
//
// Estratégia:
// - Verifica a cada minuto qual é a hora atual.
// - Se a hora/minuto atual bater com algum horário configurado em reminderConfig,
//   e ainda não tiver rodado nesse dia, executa os lembretes.
// - Armazena em memória a última data em que rodou para cada horário (não persiste em disco).

const reminderConfig = require("../config/reminderConfig");
const reminderService = require("../services/reminderService");

class ReminderScheduler {
  constructor() {
    // lastExecutionDates[hora:minuto] = "YYYY-MM-DD" da última execução
    this.lastExecutionDates = {};
  }

  start() {
    setInterval(() => this.checkScheduledTimes(), 5 * 1000);
  }

  checkScheduledTimes() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const today = now.toISOString().split("T")[0];

    reminderConfig.scheduledTimes.forEach(({ hour, minute }) => {
      const key = `${hour}:${minute}`;
      const lastExecutionDate = this.lastExecutionDates[key];

      if (
        currentHour === hour &&
        currentMinute === minute &&
        lastExecutionDate !== today
      ) {
        this.executeReminders();
        this.lastExecutionDates[key] = today;
      }
    });
  }

  executeReminders() {
    try {
      reminderService.checkAndExecuteReminders();
    } catch (err) {
      console.error("❌ Erro ao executar lembretes:", err);
    }
  }
}

module.exports = ReminderScheduler;
