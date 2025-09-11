// reminderConfig.js
//
// Configurações para o sistema de lembretes
// O sistema foi migrado para verificação diária em horários fixos.
// Atualmente suporta apenas um horário, mas a estrutura permite múltiplos futuramente.
//
// Formato: 24h (recomendado para evitar ambiguidades).

const reminderConfig = {
  // Lista de horários configurados para checagem diária
  // Inicialmente temos apenas um horário (10:00),
  scheduledTimes: [{ hour: 17, minute: 14 }],

  /**
   * Altera dinamicamente o horário de checagem diária.
   * ⚠️ Substitui o horário atual pelo novo (mantém apenas 1 horário).
   *
   * @param {number} hour - Hora no formato 24h (0–23).
   * @param {number} minute - Minuto (0–59).
   */
  setDailyCheckTime(hour, minute) {
    if (
      typeof hour !== "number" ||
      typeof minute !== "number" ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      throw new Error("Horário inválido: use hora (0–23) e minuto (0–59).");
    }

    this.scheduledTimes = [{ hour, minute }];
    console.log(
      `⏰ Horário de verificação atualizado para ${hour
        .toString()
        .padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
    );
  },
};

module.exports = reminderConfig;
