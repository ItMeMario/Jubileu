// reminderService.js - Sistema de lembretes automáticos (Refatorado)
const db = require("../config/db");
const { debug } = require("../services/debugService");
const { reminderConfig } = require("../config/reminderConfig");
const { reminderScheduler } = require("../utils/reminderScheduler");

class ReminderSystem {
  constructor() {
    this.isInitialized = false;

    // Configura o scheduler para usar este sistema como processador
    reminderScheduler.setReminderProcessor(this);
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

      const daysUntil = reminderConfig.calculateDaysUntil(city.date);
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
        const daysUntil = reminderConfig.calculateDaysUntil(city.date);
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

        // Usa delay configurado
        const delay = reminderConfig.getDelayBetweenSends();
        await new Promise((resolve) => setTimeout(resolve, delay));
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

    // Pega mensagens já usadas para esta cidade do config
    const usedIds = reminderConfig.getUsedMessages(cityId);

    // Filtra mensagens não usadas
    const availableMessages = allMessages.filter(
      (msg) => !usedIds.includes(msg.id)
    );

    // Se todas foram usadas, reseta a lista
    if (availableMessages.length === 0) {
      await debug(`🔄 Resetando mensagens usadas para cidade ${cityId}`);
      reminderConfig.resetUsedMessages(cityId);
      return this.selectReminderMessage(cityId); // Recursão para selecionar novamente
    }

    // Seleciona mensagem aleatória das disponíveis
    const randomIndex = Math.floor(Math.random() * availableMessages.length);
    const selectedMessage = availableMessages[randomIndex];

    // Marca como usada no config
    reminderConfig.addUsedMessage(cityId, selectedMessage.id);

    const updatedUsed = reminderConfig.getUsedMessages(cityId);
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

  // ========== MÉTODOS DE INTEGRAÇÃO COM SCHEDULER ==========

  // Inicia sistema automático (delega para o scheduler)
  startAutomaticReminders(client) {
    return reminderScheduler.startAutomaticReminders(client);
  }

  // Para sistema automático (delega para o scheduler)
  stopAutomaticReminders() {
    return reminderScheduler.stopAutomaticReminders();
  }

  // Executa lembretes agora (delega para o scheduler)
  async executeRemindersNow() {
    return reminderScheduler.executeRemindersNow();
  }

  // Configura horário (delega para o scheduler)
  setReminderScheduleTime(hour, minute = 0) {
    return reminderScheduler.setReminderScheduleTime(hour, minute);
  }

  // Reset da data de execução (delega para o scheduler)
  resetExecutionDate() {
    return reminderScheduler.resetExecutionDate();
  }

  // ========== MÉTODOS DE INTEGRAÇÃO COM CONFIG ==========

  // Reseta mensagens usadas (delega para o config)
  resetUsedMessages(cityId = null) {
    return reminderConfig.resetUsedMessages(cityId);
  }

  // Configura intervalos de lembretes (delega para o config)
  setReminderIntervals(intervals) {
    return reminderConfig.setReminderIntervals(intervals);
  }

  // Obtém intervalos de lembretes (delega para o config)
  getReminderIntervals() {
    return reminderConfig.getReminderIntervals();
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

    const intervals = reminderConfig.getReminderIntervals();
    return cities.filter((city) => {
      const daysUntil = reminderConfig.calculateDaysUntil(city.date);
      return intervals.includes(daysUntil);
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

  // ========== STATUS DO SISTEMA COMPLETO ==========

  // Status do sistema completo
  getSystemStatus() {
    const configStatus = reminderConfig.getConfigStatus();
    const schedulerStatus = reminderScheduler.getSchedulerStatus();

    return {
      isInitialized: this.isInitialized,
      config: {
        isValid: configStatus.validation.isValid,
        reminderIntervals: configStatus.reminderIntervals,
        usedMessagesCount: configStatus.usedMessagesCount,
        totalUsedMessages: configStatus.totalUsedMessages,
      },
      scheduler: {
        isRunning: schedulerStatus.isRunning,
        scheduledTime: schedulerStatus.scheduledTime,
        lastExecution: schedulerStatus.lastExecution,
        nextExecution: schedulerStatus.nextExecution,
        hasClient: schedulerStatus.hasClient,
      },
    };
  }

  // Mostra status completo do sistema
  async showSystemStatus() {
    const status = this.getSystemStatus();

    await debug("📊 STATUS DO SISTEMA DE LEMBRETES:");
    await debug(
      `• Sistema inicializado: ${status.isInitialized ? "✅" : "❌"}`
    );

    await debug("\n📋 CONFIGURAÇÕES:");
    await debug(
      `• Configuração válida: ${status.config.isValid ? "✅" : "❌"}`
    );
    await debug(
      `• Intervalos: ${status.config.reminderIntervals.join(", ")} dias`
    );
    await debug(
      `• Mensagens usadas: ${status.config.totalUsedMessages} (${status.config.usedMessagesCount} cidades)`
    );

    await debug("\n⏰ AGENDADOR:");
    await debug(
      `• Status: ${status.scheduler.isRunning ? "🟢 Ativo" : "🔴 Parado"}`
    );
    await debug(`• Horário: ${status.scheduler.scheduledTime}`);
    await debug(
      `• Última execução: ${status.scheduler.lastExecution || "Nunca"}`
    );
    await debug(`• Próxima execução: ${status.scheduler.nextExecution}`);
    await debug(
      `• Client configurado: ${status.scheduler.hasClient ? "✅" : "❌"}`
    );
  }

  // ========== MÉTODOS DE DEBUG E INFORMAÇÕES ==========

  // Debug - lista informações do sistema
  async listInfo() {
    await debug("📊 INFORMAÇÕES DO SISTEMA DE LEMBRETES:");

    // Mostra status dos componentes
    await this.showSystemStatus();

    // Mostra informações das cidades
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

    await debug(`\n🏙️ CIDADES: ${cities.length}`);
    const intervals = reminderConfig.getReminderIntervals();

    for (const city of cities) {
      const days = reminderConfig.calculateDaysUntil(city.date);
      const needsReminder = intervals.includes(days);
      const usedCount = reminderConfig.getUsedMessages(city.id).length;
      await debug(
        `  • ${city.name}: ${days} dias ${
          needsReminder ? "🔔" : ""
        } | Msgs usadas: ${usedCount}`
      );
    }

    // Mostra informações das mensagens
    const messages = await this.getAllReminderMessages();
    await debug(`\n💬 MENSAGENS REMINDER: ${messages.length}`);

    messages.forEach((msg, i) => {
      const preview = msg.message_content.substring(0, 40);
      debug(`  ${i + 1}. ID: ${msg.id} - "${preview}..."`);
    });
  }

  // ========== INICIALIZAÇÃO ==========

  // Inicializa o sistema
  initialize() {
    // Verifica se as dependências estão inicializadas
    if (!reminderConfig.isSystemInitialized()) {
      debug("❌ ReminderConfig não inicializado");
      return false;
    }

    this.isInitialized = true;
    debug("✅ ReminderSystem inicializado");
    return true;
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
  // Acesso direto aos componentes (para casos especiais)
  reminderConfig,
  reminderScheduler,
};

// Teste se executado diretamente
if (require.main === module) {
  reminderSystem.listInfo().catch(console.error);
}
