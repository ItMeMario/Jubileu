// utils/reminderScheduler.js - Sistema de agendamento automático de lembretes
const { debug } = require("../services/debugService");

class ReminderScheduler {
  constructor() {
    // Configurações do agendamento automático
    this.isSchedulerRunning = false;
    this.scheduledHour = 9; // 9h da manhã
    this.scheduledMinute = 0;
    this.checkInterval = 60000; // Verifica a cada 1 minuto
    this.intervalId = null;
    this.lastExecutionDate = null;
    this.client = null;
    this.reminderProcessor = null; // Referência para o processador de lembretes
  }

  // Define o processador de lembretes (injeção de dependência)
  setReminderProcessor(processor) {
    this.reminderProcessor = processor;
  }

  // Inicia o sistema de lembretes automáticos
  startAutomaticReminders(client) {
    if (this.isSchedulerRunning) {
      debug("⚠️ Sistema de lembretes automáticos já está rodando");
      return;
    }

    if (!client) {
      debug("❌ Client não fornecido para o sistema automático");
      return;
    }

    this.client = client;
    this.isSchedulerRunning = true;

    // Executa verificação imediatamente e depois a cada minuto
    this.checkAndExecuteReminders();
    this.intervalId = setInterval(() => {
      this.checkAndExecuteReminders();
    }, this.checkInterval);

    debug(
      `✅ Sistema automático iniciado - Lembretes às ${
        this.scheduledHour
      }:${this.scheduledMinute.toString().padStart(2, "0")}h`
    );
  }

  // Para o sistema automático
  stopAutomaticReminders() {
    if (!this.isSchedulerRunning) {
      debug("⚠️ Sistema automático já está parado");
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isSchedulerRunning = false;
    debug("🛑 Sistema automático parado");
  }

  // Verifica se é hora de executar lembretes
  async checkAndExecuteReminders() {
    const now = new Date();

    // Verifica se é o horário correto (9h por padrão)
    if (
      now.getHours() !== this.scheduledHour ||
      now.getMinutes() !== this.scheduledMinute
    ) {
      return;
    }

    // Verifica se já executou hoje
    const today = now.toDateString();
    if (this.lastExecutionDate === today) {
      return;
    }

    await debug(
      `⏰ Hora de verificar lembretes: ${now.toLocaleString("pt-BR")}`
    );

    try {
      // Executa processamento de lembretes através do processor
      if (!this.reminderProcessor) {
        await debug("❌ Processador de lembretes não configurado");
        return;
      }

      const success = await this.reminderProcessor.processReminders(
        this.client
      );

      if (success) {
        this.lastExecutionDate = today;
        await debug("✅ Processamento automático executado com sucesso");
      } else {
        await debug("⚠️ Falha no processamento automático");
      }
    } catch (error) {
      await debug(`❌ Erro no processamento agendado: ${error.message}`);
    }
  }

  // Executa lembretes agora (para testes)
  async executeRemindersNow() {
    if (!this.client) {
      await debug("❌ Client não disponível para execução manual");
      return false;
    }

    if (!this.reminderProcessor) {
      await debug("❌ Processador de lembretes não configurado");
      return false;
    }

    await debug("🔧 Execução manual iniciada...");

    try {
      const success = await this.reminderProcessor.processReminders(
        this.client
      );

      if (success) {
        await debug("✅ Execução manual concluída com sucesso");
        return true;
      } else {
        await debug("⚠️ Execução manual teve problemas");
        return false;
      }
    } catch (error) {
      await debug(`❌ Erro na execução manual: ${error.message}`);
      return false;
    }
  }

  // Configura novo horário para lembretes automáticos
  setReminderScheduleTime(hour, minute = 0) {
    if (hour < 0 || hour > 23) {
      debug("❌ Hora inválida (0-23)");
      return false;
    }

    if (minute < 0 || minute > 59) {
      debug("❌ Minuto inválido (0-59)");
      return false;
    }

    this.scheduledHour = hour;
    this.scheduledMinute = minute;

    debug(
      `🕘 Horário alterado para ${hour}:${minute.toString().padStart(2, "0")}h`
    );
    return true;
  }

  // Força reset da data de execução (para testes)
  resetExecutionDate() {
    this.lastExecutionDate = null;
    debug("🔄 Data de execução resetada");
  }

  // Calcula próxima execução
  getNextExecutionTime() {
    const now = new Date();
    const next = new Date();

    next.setHours(this.scheduledHour, this.scheduledMinute, 0, 0);

    // Se já passou da hora hoje, agenda para amanhã
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    return next.toLocaleString("pt-BR");
  }

  // Status do agendador
  getSchedulerStatus() {
    return {
      isRunning: this.isSchedulerRunning,
      scheduledTime: `${this.scheduledHour}:${this.scheduledMinute
        .toString()
        .padStart(2, "0")}`,
      lastExecution: this.lastExecutionDate,
      nextExecution: this.getNextExecutionTime(),
      checkInterval: this.checkInterval,
      hasClient: !!this.client,
      hasProcessor: !!this.reminderProcessor,
    };
  }

  // Mostra status do agendador
  async showSchedulerStatus() {
    const status = this.getSchedulerStatus();

    await debug("📊 STATUS DO AGENDADOR:");
    await debug(`• Sistema: ${status.isRunning ? "🟢 Ativo" : "🔴 Parado"}`);
    await debug(`• Horário: ${status.scheduledTime}`);
    await debug(`• Última execução: ${status.lastExecution || "Nunca"}`);
    await debug(`• Próxima execução: ${status.nextExecution}`);
    await debug(`• Verificando a cada: ${status.checkInterval / 1000}s`);
    await debug(`• Client configurado: ${status.hasClient ? "✅" : "❌"}`);
    await debug(
      `• Processador configurado: ${status.hasProcessor ? "✅" : "❌"}`
    );
  }
}

// Instância singleton
const reminderScheduler = new ReminderScheduler();

module.exports = {
  ReminderScheduler,
  reminderScheduler,
};
