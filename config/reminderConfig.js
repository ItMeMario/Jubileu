// config/reminderConfig.js - Configurações do sistema de lembretes
const { debug } = require("../services/debugService");

class ReminderConfig {
  constructor() {
    // Configurações dos lembretes
    this.reminderIntervals = [5, 3]; // dias antes do evento
    this.isInitialized = false;

    // Configurações do agendamento
    this.defaultScheduledHour = 9; // 9h da manhã
    this.defaultScheduledMinute = 0;
    this.defaultCheckInterval = 60000; // Verifica a cada 1 minuto

    // Configurações de envio
    this.delayBetweenSends = 2000; // 2 segundos entre envios

    // Configurações de debug
    this.debugEnabled = true;

    // Cache de mensagens usadas por cidade
    this.usedMessages = new Map(); // Para evitar repetição por cidade
  }

  // ========== GETTERS PARA CONFIGURAÇÕES ==========

  // Intervalos de lembretes (dias antes do evento)
  getReminderIntervals() {
    return this.reminderIntervals;
  }

  // Configurações padrão do agendador
  getDefaultScheduleConfig() {
    return {
      hour: this.defaultScheduledHour,
      minute: this.defaultScheduledMinute,
      checkInterval: this.defaultCheckInterval,
    };
  }

  // Delay entre envios
  getDelayBetweenSends() {
    return this.delayBetweenSends;
  }

  // Estado de inicialização
  isSystemInitialized() {
    return this.isInitialized;
  }

  // ========== SETTERS PARA CONFIGURAÇÕES ==========

  // Altera intervalos de lembretes
  setReminderIntervals(intervals) {
    if (!Array.isArray(intervals)) {
      debug("❌ Intervalos devem ser um array");
      return false;
    }

    if (
      !intervals.every((interval) => Number.isInteger(interval) && interval > 0)
    ) {
      debug("❌ Todos os intervalos devem ser números inteiros positivos");
      return false;
    }

    this.reminderIntervals = intervals;
    debug(`✅ Intervalos alterados para: ${intervals.join(", ")} dias`);
    return true;
  }

  // Altera configurações padrão do agendador
  setDefaultScheduleConfig(hour, minute = 0, checkInterval = 60000) {
    if (hour < 0 || hour > 23) {
      debug("❌ Hora inválida (0-23)");
      return false;
    }

    if (minute < 0 || minute > 59) {
      debug("❌ Minuto inválido (0-59)");
      return false;
    }

    if (checkInterval < 1000) {
      debug("❌ Intervalo de verificação deve ser pelo menos 1000ms");
      return false;
    }

    this.defaultScheduledHour = hour;
    this.defaultScheduledMinute = minute;
    this.defaultCheckInterval = checkInterval;

    debug(
      `✅ Configurações padrão alteradas: ${hour}:${minute
        .toString()
        .padStart(2, "0")}h, verificação a cada ${checkInterval / 1000}s`
    );
    return true;
  }

  // Altera delay entre envios
  setDelayBetweenSends(delay) {
    if (!Number.isInteger(delay) || delay < 0) {
      debug("❌ Delay deve ser um número inteiro não negativo");
      return false;
    }

    this.delayBetweenSends = delay;
    debug(`✅ Delay entre envios alterado para: ${delay}ms`);
    return true;
  }

  // ========== CONTROLE DE MENSAGENS USADAS ==========

  // Obtém mensagens usadas para uma cidade
  getUsedMessages(cityId) {
    return this.usedMessages.get(cityId) || [];
  }

  // Adiciona mensagem como usada para uma cidade
  addUsedMessage(cityId, messageId) {
    const used = this.usedMessages.get(cityId) || [];
    if (!used.includes(messageId)) {
      used.push(messageId);
      this.usedMessages.set(cityId, used);
      debug(
        `📝 Mensagem ${messageId} marcada como usada para cidade ${cityId}`
      );
    }
  }

  // Reseta mensagens usadas (útil para testes)
  resetUsedMessages(cityId = null) {
    if (cityId) {
      this.usedMessages.delete(cityId);
      debug(`🔄 Mensagens resetadas para cidade ${cityId}`);
    } else {
      this.usedMessages.clear();
      debug("🔄 Todas as mensagens usadas foram resetadas");
    }
  }

  // Verifica se uma mensagem foi usada para uma cidade
  isMessageUsed(cityId, messageId) {
    const used = this.usedMessages.get(cityId) || [];
    return used.includes(messageId);
  }

  // Obtém estatísticas de mensagens usadas
  getUsedMessagesStats() {
    const stats = {};
    for (const [cityId, messages] of this.usedMessages.entries()) {
      stats[cityId] = messages.length;
    }
    return stats;
  }

  // ========== VALIDAÇÕES ==========

  // Verifica se um dia precisa de lembrete
  needsReminder(daysUntil) {
    return this.reminderIntervals.includes(daysUntil);
  }

  // Valida se as configurações estão corretas
  validateConfig() {
    const issues = [];

    if (
      !Array.isArray(this.reminderIntervals) ||
      this.reminderIntervals.length === 0
    ) {
      issues.push("Intervalos de lembretes não configurados ou vazios");
    }

    if (this.defaultScheduledHour < 0 || this.defaultScheduledHour > 23) {
      issues.push("Hora padrão inválida");
    }

    if (this.defaultScheduledMinute < 0 || this.defaultScheduledMinute > 59) {
      issues.push("Minuto padrão inválido");
    }

    if (this.defaultCheckInterval < 1000) {
      issues.push("Intervalo de verificação muito baixo");
    }

    if (this.delayBetweenSends < 0) {
      issues.push("Delay entre envios inválido");
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  // ========== INICIALIZAÇÃO E STATUS ==========

  // Inicializa as configurações
  initialize() {
    const validation = this.validateConfig();

    if (!validation.isValid) {
      debug("❌ Erro na validação das configurações:");
      validation.issues.forEach((issue) => debug(`  • ${issue}`));
      return false;
    }

    this.isInitialized = true;
    debug("✅ ReminderConfig inicializado com sucesso");
    return true;
  }

  // Reseta configurações para padrões
  resetToDefaults() {
    this.reminderIntervals = [5, 3];
    this.defaultScheduledHour = 9;
    this.defaultScheduledMinute = 0;
    this.defaultCheckInterval = 60000;
    this.delayBetweenSends = 2000;
    this.usedMessages.clear();

    debug("🔄 Configurações resetadas para padrões");
    return this.initialize();
  }

  // Obtém todas as configurações
  getAllConfig() {
    return {
      reminderIntervals: this.reminderIntervals,
      defaultSchedule: {
        hour: this.defaultScheduledHour,
        minute: this.defaultScheduledMinute,
        checkInterval: this.defaultCheckInterval,
      },
      delayBetweenSends: this.delayBetweenSends,
      isInitialized: this.isInitialized,
      usedMessagesCount: this.usedMessages.size,
      debugEnabled: this.debugEnabled,
    };
  }

  // Status das configurações
  getConfigStatus() {
    const config = this.getAllConfig();
    const validation = this.validateConfig();
    const usedStats = this.getUsedMessagesStats();

    return {
      ...config,
      validation,
      usedMessagesStats: usedStats,
      totalUsedMessages: Object.values(usedStats).reduce(
        (sum, count) => sum + count,
        0
      ),
    };
  }

  // Mostra status completo das configurações
  async showConfigStatus() {
    const status = this.getConfigStatus();

    await debug("📊 STATUS DAS CONFIGURAÇÕES:");
    await debug(`• Inicializado: ${status.isInitialized ? "✅" : "❌"}`);
    await debug(`• Intervalos: ${status.reminderIntervals.join(", ")} dias`);
    await debug(
      `• Horário padrão: ${
        status.defaultSchedule.hour
      }:${status.defaultSchedule.minute.toString().padStart(2, "0")}`
    );
    await debug(
      `• Verificação a cada: ${status.defaultSchedule.checkInterval / 1000}s`
    );
    await debug(`• Delay entre envios: ${status.delayBetweenSends}ms`);
    await debug(`• Debug habilitado: ${status.debugEnabled ? "✅" : "❌"}`);

    if (!status.validation.isValid) {
      await debug("⚠️ PROBLEMAS DE CONFIGURAÇÃO:");
      status.validation.issues.forEach((issue) => debug(`  • ${issue}`));
    }

    await debug(`📝 MENSAGENS USADAS:`);
    await debug(
      `• Total de cidades com histórico: ${status.usedMessagesCount}`
    );
    await debug(`• Total de mensagens usadas: ${status.totalUsedMessages}`);

    if (Object.keys(status.usedMessagesStats).length > 0) {
      await debug("• Por cidade:");
      Object.entries(status.usedMessagesStats).forEach(([cityId, count]) => {
        debug(`  - Cidade ${cityId}: ${count} mensagens`);
      });
    }
  }

  // ========== UTILITÁRIOS ==========

  // Calcula dias até o evento
  calculateDaysUntil(dateStr) {
    const eventDate = new Date(dateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const timeDiff = eventDate.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  // Formata horário para display
  formatTime(hour, minute) {
    return `${hour}:${minute.toString().padStart(2, "0")}`;
  }
}

// Instância singleton
const reminderConfig = new ReminderConfig();

// Inicializa automaticamente
reminderConfig.initialize();

module.exports = {
  ReminderConfig,
  reminderConfig,
};
