// reminderService.js - Sistema completo de lembretes automáticos
const db = require("../config/db");
const { debug } = require("../services/debugService");

class ReminderSystem {
  constructor() {
    // Configurações dos lembretes
    this.reminderIntervals = [5, 3]; // dias antes do evento
    this.isInitialized = false;
    this.usedMessages = new Map(); // Para evitar repetição por cidade

    // Configurações do agendamento automático
    this.isSchedulerRunning = false;
    this.scheduledHour = 9; // 9h da manhã
    this.scheduledMinute = 0;
    this.checkInterval = 60000; // Verifica a cada 1 minuto
    this.intervalId = null;
    this.lastExecutionDate = null;
    this.client = null;
  }

  // ========== COMANDOS MANUAIS ==========

  // Verifica se é comando de reminder
  static isReminderCommand(msg) {
    const text = msg.body.toLowerCase().trim();
    return text === "!reminder" || text === "!lembrete";
  }

  // Processa comando !reminder manual
  async handleReminderCommand(client, msg) {
    try {
      await debug("🤖 Comando !reminder recebido");

      const chat = await msg.getChat();
      if (!chat.isGroup) {
        await msg.reply("⚠️ Este comando só funciona em grupos!");
        return false;
      }

      await debug(`📱 Grupo: ${chat.name}`);

      // Busca cidade pelo nome do grupo
      const city = await this.findCityByGroupName(chat.name);
      if (!city) {
        await msg.reply("⚠️ Este grupo não está cadastrado no sistema!");
        return false;
      }

      const daysUntil = this.calculateDaysUntil(city.date);
      await debug(
        `🏙️ Cidade: ${city.name} | Evento: ${city.date} | Dias restantes: ${daysUntil}`
      );

      // Busca e seleciona mensagem de reminder
      const reminderMessage = await this.selectReminderMessage(city.id);
      if (!reminderMessage) {
        await msg.reply("⚠️ Nenhuma mensagem de reminder cadastrada!");
        return false;
      }

      // Monta mensagem final com dias restantes
      const finalMessage = `⏰ Faltam ${daysUntil} dias!\n\n${reminderMessage}`;

      await msg.reply(finalMessage);
      await debug(
        `✅ Lembrete manual enviado para ${city.name} (${daysUntil} dias)`
      );

      return true;
    } catch (error) {
      await debug(`⚠️ Erro no comando !reminder: ${error.message}`);
      return false;
    }
  }

  // ========== PROCESSAMENTO DE LEMBRETES ==========

  // Processamento automático de lembretes
  async processReminders(client) {
    if (!client) return false;

    try {
      await debug("🔍 Verificando lembretes automáticos...");

      const cities = await this.getCitiesNeedingReminders();
      if (cities.length === 0) {
        await debug("✅ Nenhum lembrete para enviar hoje");
        return true;
      }

      await debug(`📋 ${cities.length} cidade(s) precisam de lembrete`);

      for (const city of cities) {
        const daysUntil = this.calculateDaysUntil(city.date);
        const reminderMessage = await this.selectReminderMessage(city.id);

        if (reminderMessage) {
          const finalMessage = `⏰ Faltam ${daysUntil} dias!\n\n${reminderMessage}`;
          await this.sendAutomaticReminder(
            client,
            city,
            finalMessage,
            daysUntil
          );
        }

        await new Promise((resolve) => setTimeout(resolve, 2000)); // 2s entre envios
      }

      await debug("✅ Processamento automático concluído");
      return true;
    } catch (error) {
      await debug(`⚠️ Erro no processamento automático: ${error.message}`);
      return false;
    }
  }

  // Seleciona mensagem de reminder sem repetir
  async selectReminderMessage(cityId) {
    const allMessages = await this.getAllReminderMessages();
    if (allMessages.length === 0) return null;

    // Se só tem uma mensagem, usa ela
    if (allMessages.length === 1) {
      return allMessages[0].message_content;
    }

    // Pega mensagens já usadas para esta cidade
    const usedIds = this.usedMessages.get(cityId) || [];

    // Filtra mensagens não usadas
    const availableMessages = allMessages.filter(
      (msg) => !usedIds.includes(msg.id)
    );

    // Se todas foram usadas, reseta a lista
    if (availableMessages.length === 0) {
      await debug(`🔄 Resetando mensagens usadas para cidade ${cityId}`);
      this.usedMessages.set(cityId, []);
      return this.selectReminderMessage(cityId); // Recursão para selecionar novamente
    }

    // Seleciona mensagem aleatória das disponíveis
    const randomIndex = Math.floor(Math.random() * availableMessages.length);
    const selectedMessage = availableMessages[randomIndex];

    // Marca como usada
    const updatedUsed = [...usedIds, selectedMessage.id];
    this.usedMessages.set(cityId, updatedUsed);

    await debug(
      `🎲 Mensagem selecionada: ID ${selectedMessage.id} (${updatedUsed.length}/${allMessages.length} usadas)`
    );

    return selectedMessage.message_content;
  }

  // Envia lembrete automático
  async sendAutomaticReminder(client, city, message, daysUntil) {
    try {
      await client.sendMessage(city.link, message);
      await debug(
        `✅ Lembrete automático enviado para ${city.name} (${daysUntil} dias)`
      );
      return true;
    } catch (error) {
      await debug(`⚠️ Erro ao enviar para ${city.name}: ${error.message}`);
      return false;
    }
  }

  // ========== AGENDAMENTO AUTOMÁTICO ==========

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
      // Executa processamento de lembretes
      const success = await this.processReminders(this.client);

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

    await debug("🔧 Execução manual iniciada...");

    try {
      const success = await this.processReminders(this.client);

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

  // ========== MÉTODOS DE BANCO DE DADOS ==========

  // Busca todas as mensagens de reminder
  async getAllReminderMessages() {
    return new Promise((resolve, reject) => {
      db.all(
        "SELECT id, message_content FROM messages WHERE message_type = 'reminder' ORDER BY id",
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  // Busca cidade pelo nome do grupo
  async findCityByGroupName(groupName) {
    return new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM cities WHERE LOWER(name) = LOWER(?)",
        [groupName.trim()],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  // Busca cidades que precisam de lembrete hoje
  async getCitiesNeedingReminders() {
    const cities = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM cities WHERE link IS NOT NULL", [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    return cities.filter((city) => {
      const daysUntil = this.calculateDaysUntil(city.date);
      return this.reminderIntervals.includes(daysUntil);
    });
  }

  // Busca cidades para status (versão simplificada)
  async getCitiesForStatus() {
    return new Promise((resolve, reject) => {
      db.all(
        "SELECT id, name, date FROM cities ORDER BY date ASC",
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  // ========== MÉTODOS UTILITÁRIOS ==========

  // Calcula dias até o evento
  calculateDaysUntil(dateStr) {
    const eventDate = new Date(dateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const timeDiff = eventDate.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  // Status do sistema completo
  getSystemStatus() {
    return {
      isInitialized: this.isInitialized,
      isAutomaticRunning: this.isSchedulerRunning,
      scheduledTime: `${this.scheduledHour}:${this.scheduledMinute
        .toString()
        .padStart(2, "0")}`,
      lastExecution: this.lastExecutionDate,
      nextExecution: this.getNextExecutionTime(),
      reminderIntervals: this.reminderIntervals,
    };
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

  // Força reset da data de execução (para testes)
  resetExecutionDate() {
    this.lastExecutionDate = null;
    debug("🔄 Data de execução resetada");
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

  // ========== MÉTODOS DE DEBUG E STATUS ==========

  // Debug - lista informações do sistema
  async listInfo() {
    await debug("📊 INFORMAÇÕES DO SISTEMA DE LEMBRETES:");

    const status = this.getSystemStatus();
    await debug(
      `• Estado: ${
        status.isInitialized ? "✅ Inicializado" : "❌ Não inicializado"
      }`
    );
    await debug(
      `• Automático: ${status.isAutomaticRunning ? "🟢 Ativo" : "🔴 Parado"}`
    );
    await debug(`• Horário: ${status.scheduledTime}`);
    await debug(`• Última execução: ${status.lastExecution || "Nunca"}`);
    await debug(`• Próxima execução: ${status.nextExecution}`);
    await debug(`• Intervalos: ${status.reminderIntervals.join(", ")} dias`);

    const cities = await new Promise((resolve, reject) => {
      db.all(
        "SELECT id, name, date, link FROM cities ORDER BY date ASC",
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    await debug(`🏙️ CIDADES: ${cities.length}`);
    for (const city of cities) {
      const days = this.calculateDaysUntil(city.date);
      const needsReminder = this.reminderIntervals.includes(days);
      const usedCount = this.usedMessages.get(city.id)?.length || 0;
      await debug(
        `  • ${city.name}: ${days} dias ${
          needsReminder ? "🔔" : ""
        } | Msgs usadas: ${usedCount}`
      );
    }

    const messages = await this.getAllReminderMessages();
    await debug(`💬 MENSAGENS REMINDER: ${messages.length}`);

    messages.forEach((msg, i) => {
      const preview = msg.message_content.substring(0, 40);
      debug(`  ${i + 1}. ID: ${msg.id} - "${preview}..."`);
    });
  }

  // Mostra status completo
  async showSystemStatus() {
    const status = this.getSystemStatus();

    await debug("📊 STATUS DO SISTEMA DE LEMBRETES:");
    await debug(`• Inicializado: ${status.isInitialized ? "✅" : "❌"}`);
    await debug(
      `• Automático: ${status.isAutomaticRunning ? "🟢 Ativo" : "🔴 Parado"}`
    );
    await debug(`• Horário: ${status.scheduledTime}`);
    await debug(`• Última execução: ${status.lastExecution || "Nunca"}`);
    await debug(`• Próxima execução: ${status.nextExecution}`);
    await debug(
      `• Intervalos de lembrete: ${status.reminderIntervals.join(", ")} dias`
    );

    if (status.isAutomaticRunning) {
      await debug(`• Verificando a cada: ${this.checkInterval / 1000}s`);
    }
  }

  // Inicializa o sistema
  initialize() {
    this.isInitialized = true;
    debug("✅ ReminderSystem inicializado");
  }
}

// Instância global
const reminderSystem = new ReminderSystem();
reminderSystem.initialize();

module.exports = {
  ReminderSystem,
  reminderSystem,
  // Métodos de compatibilidade/debug
  testReminder: () => reminderSystem.listInfo(),
  showInfo: () => reminderSystem.listInfo(),
  showStatus: () => reminderSystem.showSystemStatus(),
};

// Teste se executado diretamente
if (require.main === module) {
  reminderSystem.listInfo().catch(console.error);
}
