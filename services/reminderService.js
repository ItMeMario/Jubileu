// services/reminderService.js - VERSÃO CORRIGIDA
const sqlite3 = require("sqlite3").verbose();
const { debug } = require("./debugService");

// 🔧 CORREÇÃO: Importa o caminho correto do banco
const { DATABASE_PATH } = require("../config/initialize");

console.log("📂 reminderService.js - Caminho do banco:", DATABASE_PATH);

const db = new sqlite3.Database(DATABASE_PATH);

class ReminderService {
  constructor() {
    this.client = null;
  }

  setWhatsAppClient(client) {
    this.client = client;
    debug("📱 Cliente WhatsApp configurado no ReminderService");
  }

  async checkAndExecuteReminders() {
    await debug("🔍 Verificando lembretes no banco...");

    if (!this.client) {
      console.error("❌ Cliente WhatsApp não configurado!");
      return;
    }

    const today = new Date();
    const targetDates = [
      this.formatDateOffset(today, 3),
      this.formatDateOffset(today, 5),
    ];

    await debug(`📅 Verificando datas: ${targetDates.join(", ")}`);

    for (const targetDate of targetDates) {
      await this.checkCitiesForDate(targetDate);
    }
  }

  formatDateOffset(baseDate, days) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  }

  async checkCitiesForDate(targetDate) {
    return new Promise(async (resolve, reject) => {
      await debug(`🏙️ Verificando cidades para data: ${targetDate}`);

      db.all(
        "SELECT * FROM cities WHERE date = ?",
        [targetDate],
        async (err, rows) => {
          if (err) {
            console.error("❌ Erro ao buscar cidades:", err);
            return reject(err);
          }

          if (rows.length === 0) {
            await debug(`ℹ️ Nenhuma cidade com evento em ${targetDate}.`);
            return resolve();
          }

          await debug(
            `✅ Encontradas ${rows.length} cidade(s) com eventos em ${targetDate}`
          );

          for (const city of rows) {
            try {
              const message = await this.getRandomReminderMessage();
              await this.executeReminder(city, message, targetDate);
              await this.sleep(2000);
            } catch (e) {
              console.error(
                "❌ Erro ao processar lembrete para cidade:",
                city.name,
                e
              );
            }
          }

          resolve();
        }
      );
    });
  }

  async getRandomReminderMessage() {
    return new Promise((resolve, reject) => {
      db.all(
        "SELECT message_content FROM messages WHERE message_type = 'reminder'",
        [],
        async (err, rows) => {
          if (err) {
            console.error("❌ Erro ao buscar mensagens:", err);
            return reject(err);
          }

          if (!rows || rows.length === 0) {
            await debug(
              "⚠️ Nenhuma mensagem de lembrete configurada, usando mensagem padrão"
            );
            return resolve(
              "⚠️ Um evento está chegando em breve na cidade {city}! 📅 Data: {date}"
            );
          }

          const randomMsg =
            rows[Math.floor(Math.random() * rows.length)].message_content;
          resolve(randomMsg);
        }
      );
    });
  }

  async executeReminder(city, message, eventDate) {
    try {
      if (!city.link_id || city.link_id === "0" || city.link_id === "") {
        console.error(
          `❌ Cidade ${city.name} não possui link_id válido (${city.link_id})`
        );
        return;
      }

      const today = new Date();
      const targetDate = new Date(eventDate);
      const daysUntilEvent = Math.ceil(
        (targetDate - today) / (1000 * 60 * 60 * 24)
      );

      const finalMessage = message
        .replace(/\{city\}/g, city.name)
        .replace(/\{days\}/g, daysUntilEvent)
        .replace(/\{date\}/g, this.formatDateBR(eventDate));

      await debug(
        `⏰ Enviando lembrete para cidade [${city.name}] (${city.link_id})`
      );
      await debug(`📤 Mensagem: ${finalMessage}`);

      if (this.client && this.client.info) {
        await this.client.sendMessage(city.link_id, finalMessage);
        await debug(`✅ Lembrete enviado com sucesso para ${city.name}`);
      } else {
        console.error("❌ Cliente WhatsApp não está pronto!");
        await debug(
          `📱 TESTE - Mensagem seria enviada: "${finalMessage}" para ${city.link_id}`
        );
      }
    } catch (error) {
      console.error(`❌ Erro ao enviar lembrete para ${city.name}:`, error);
      throw error;
    }
  }

  formatDateBR(dateStr) {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("pt-BR");
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async testDatabaseConnection() {
    return new Promise(async (resolve, reject) => {
      db.get("SELECT COUNT(*) as count FROM cities", async (err, row) => {
        if (err) {
          console.error("❌ Erro na conexão com banco:", err);
          reject(err);
        } else {
          await debug(`✅ Banco conectado. Total de cidades: ${row.count}`);
          resolve(row.count);
        }
      });
    });
  }

  async testRemindersForDays(days) {
    await debug(`🧪 TESTE: Verificando eventos em ${days} dias...`);
    const testDate = this.formatDateOffset(new Date(), days);
    await this.checkCitiesForDate(testDate);
  }
}

module.exports = new ReminderService();
