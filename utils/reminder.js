const db = require("../config/db");

class ReminderSystem {
  constructor() {
    // Configuração hardcoded para prototipo - depois pode vir de config
    this.reminderIntervals = [5, 3]; // dias antes do evento
    this.reminderHour = 9; // 9h da manhã
  }

  // Função principal - executa verificação de lembretes
  async processReminders() {
    console.log("🔍 Iniciando verificação de lembretes...");

    try {
      const citiesToRemind = await this.getCitiesNeedingReminders();

      if (citiesToRemind.length === 0) {
        console.log("✅ Nenhum lembrete para enviar hoje");
        return;
      }

      console.log(
        `📋 Encontradas ${citiesToRemind.length} cidades para lembrete`
      );

      for (const city of citiesToRemind) {
        await this.sendReminder(city);
      }

      console.log("✅ Processamento de lembretes concluído");
    } catch (error) {
      console.error("❌ Erro no processamento de lembretes:", error);
    }
  }

  // Busca cidades que precisam de lembrete hoje
  async getCitiesNeedingReminders() {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD

    // Busca cidades com eventos futuros
    const cities = await new Promise((resolve, reject) => {
      const query = `
                SELECT id, name, link, date, message
                FROM cities 
                WHERE date > ? 
                ORDER BY date ASC
            `;

      db.all(query, [todayStr], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    const citiesToRemind = [];

    for (const city of cities) {
      const eventDate = new Date(city.date + "T00:00:00"); // Força timezone local
      const daysUntilEvent = this.calculateDaysUntil(eventDate);

      // Verifica se está em um dos intervalos configurados
      if (this.reminderIntervals.includes(daysUntilEvent)) {
        // Verifica se já foi enviado lembrete para este intervalo
        const alreadySent = await this.wasReminderSent(city.id, daysUntilEvent);

        if (!alreadySent) {
          citiesToRemind.push({
            ...city,
            daysUntilEvent,
          });
        }
      }
    }

    return citiesToRemind;
  }

  // Calcula dias até o evento
  calculateDaysUntil(eventDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Zera horas para comparação precisa

    const timeDiff = eventDate.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  // Verifica se lembrete já foi enviado
  async wasReminderSent(cityId, daysUntil) {
    return new Promise((resolve, reject) => {
      const today = new Date().toISOString().split("T")[0];

      const query = `
                SELECT id FROM messages 
                WHERE locale = ? 
                AND message_type = 'reminder' 
                AND message_content LIKE ?
                AND DATE(created_at) = ?
            `;

      const contentPattern = `%${daysUntil} dias%`;

      db.get(query, [cityId.toString(), contentPattern, today], (err, row) => {
        if (err) reject(err);
        else resolve(!!row);
      });
    });
  }

  // Envia o lembrete
  async sendReminder(city) {
    try {
      console.log(
        `📤 Enviando lembrete para ${city.name} (${city.daysUntilEvent} dias)`
      );

      // Gera mensagem personalizada
      const message = this.generateReminderMessage(city);

      // Salva na tabela messages
      await this.saveReminderMessage(city, message);

      // TODO: Aqui integrará com WhatsApp Web.js
      await this.simulateWhatsAppSend(city, message);

      console.log(`✅ Lembrete enviado para ${city.name}`);
    } catch (error) {
      console.error(`❌ Erro ao enviar lembrete para ${city.name}:`, error);
    }
  }

  // Gera mensagem de lembrete personalizada
  generateReminderMessage(city) {
    const { name, daysUntilEvent, date } = city;

    // Template baseado nos dias restantes
    let template;

    if (daysUntilEvent === 1) {
      template = `🚨 AMANHÃ! O evento em ${name} acontece amanhã (${this.formatDate(
        date
      )})! 🚨`;
    } else if (daysUntilEvent <= 3) {
      template = `⚠️ ATENÇÃO! Faltam apenas ${daysUntilEvent} dias para o evento em ${name} (${this.formatDate(
        date
      )})! ⚠️`;
    } else {
      template = `📅 Lembrete: Faltam ${daysUntilEvent} dias para o evento em ${name} (${this.formatDate(
        date
      )})`;
    }

    return template;
  }

  // Formata data para exibição
  formatDate(dateStr) {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("pt-BR");
  }

  // Salva lembrete na tabela messages
  async saveReminderMessage(city, message) {
    return new Promise((resolve, reject) => {
      const query = `
                INSERT INTO messages (locale, message_type, message_content, created_at)
                VALUES (?, 'reminder', ?, CURRENT_TIMESTAMP)
            `;

      db.run(query, [city.id.toString(), message], function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  // Simula envio do WhatsApp (substituir pela integração real)
  async simulateWhatsAppSend(city, message) {
    console.log(`\n📱 SIMULAÇÃO WHATSAPP:`);
    console.log(`Grupo: ${city.link}`);
    console.log(`Mensagem: ${message}`);
    console.log(`---\n`);

    // TODO: Integrar com whatsapp-web.js
    // const chat = await client.getChatById(city.link);
    // await chat.sendMessage(message);

    return new Promise((resolve) => setTimeout(resolve, 100)); // Simula delay
  }

  // Método para testar com cidade específica
  async testWithCity(cityName) {
    console.log(`🧪 Testando lembretes para cidade: ${cityName}`);

    const city = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM cities WHERE name = ?", [cityName], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!city) {
      console.log(`❌ Cidade "${cityName}" não encontrada`);
      return;
    }

    const eventDate = new Date(city.date + "T00:00:00");
    const daysUntil = this.calculateDaysUntil(eventDate);

    console.log(`📅 Evento em ${city.name}: ${this.formatDate(city.date)}`);
    console.log(`⏰ Dias até o evento: ${daysUntil}`);
    console.log(
      `🎯 Precisa lembrete? ${
        this.reminderIntervals.includes(daysUntil) || Math.abs(daysUntil) <= 1
          ? "SIM"
          : "NÃO"
      }`
    );

    if (
      this.reminderIntervals.includes(daysUntil) ||
      Math.abs(daysUntil) <= 1
    ) {
      await this.sendReminder({ ...city, daysUntilEvent: daysUntil });
    }
  }

  // Lista próximos eventos para debug
  async listUpcomingEvents() {
    const today = new Date().toISOString().split("T")[0];

    const cities = await new Promise((resolve, reject) => {
      db.all(
        "SELECT name, date FROM cities WHERE date >= ? ORDER BY date ASC",
        [today],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    console.log("\n📋 PRÓXIMOS EVENTOS:");
    cities.forEach((city) => {
      const eventDate = new Date(city.date + "T00:00:00");
      const daysUntil = this.calculateDaysUntil(eventDate);
      const needsReminder = this.reminderIntervals.includes(daysUntil);

      console.log(
        `• ${city.name}: ${this.formatDate(city.date)} (${daysUntil} dias) ${
          needsReminder ? "🔔" : ""
        }`
      );
    });
    console.log("");
  }
}

// Função para executar manualmente (modo standalone)
async function runTest() {
  const reminderSystem = new ReminderSystem();

  console.log("🚀 TESTE DO SISTEMA DE LEMBRETES\n");

  // Verifica conexão WhatsApp
  const isConnected = await reminderSystem.checkWhatsAppConnection();
  console.log(
    `📱 Status WhatsApp: ${isConnected ? "✅ Conectado" : "❌ Desconectado"}`
  );

  if (!isConnected) {
    console.log(
      "⚠️  Para enviar mensagens reais, inicie o bot primeiro em outro terminal\n"
    );
  }

  // Lista eventos próximos
  await reminderSystem.listUpcomingEvents();

  // Executa processamento completo
  await reminderSystem.processReminders();
}

// Função para testar cidade específica
async function testCity(cityName) {
  const reminderSystem = new ReminderSystem();
  await reminderSystem.testWithCity(cityName);
}

// Exporta para uso externo
module.exports = {
  ReminderSystem,
  testReminderFromBot,
  scheduleReminders,
  testCity,
};

// Se executado diretamente, roda teste
if (require.main === module) {
  runTest().catch(console.error);
}
