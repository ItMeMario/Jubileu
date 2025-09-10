// reminder.js - Sistema integrado ao bot existente
const db = require("../config/db");
const { debug } = require("../services/debugService");

class ReminderSystem {
  constructor() {
    this.reminderIntervals = [5, 3, 1]; // dias antes do evento
    this.isInitialized = false;
  }

  // Verifica se é comando de reminder
  static isReminderCommand(msg) {
    const text = msg.body.toLowerCase().trim();
    return text === "!reminder" || text === "!lembrete";
  }

  // Processa comando !reminder (chamado pelo message.js)
  async handleReminderCommand(client, msg) {
    try {
      console.log(`\n🤖 Comando !reminder recebido`);

      // Verifica se é um grupo
      const chat = await msg.getChat();
      if (!chat.isGroup) {
        console.log("❌ Não é um grupo - enviando resposta...");
        await this.safeSendMessage(
          msg,
          "⚠️ Este comando só funciona em grupos!"
        );
        return false;
      }

      const groupId = chat.id._serialized;
      console.log(`📱 Grupo: ${chat.name} (${groupId})`);

      // Busca cidade pelo nome/link do grupo
      const city = await this.findCityByGroup(groupId, chat.name);
      if (!city) {
        await this.safeSendMessage(
          msg,
          `⚠️ Este grupo não está cadastrado no sistema!\n\n💡 Para cadastrar, execute:\nUPDATE cities SET link = 'GRUPO:${groupId}' WHERE name = 'Nome da Cidade';`
        );
        return false;
      }

      console.log(`🏙️ Cidade: ${city.name} | Evento: ${city.date}`);

      // Busca mensagem de reminder
      const reminderMessage = await this.getReminderMessage(city.id);
      if (!reminderMessage) {
        await this.safeSendMessage(
          msg,
          "⚠️ Nenhuma mensagem de reminder cadastrada!"
        );
        return false;
      }

      // Personaliza mensagem
      const personalizedMessage = this.personalizeMessage(
        reminderMessage,
        city
      );

      // Tenta enviar usando método seguro
      const success = await this.safeSendMessage(msg, personalizedMessage);

      if (success) {
        console.log(`✅ Lembrete enviado!`);
        console.log(
          `📄 Mensagem: ${personalizedMessage.substring(0, 100)}...\n`
        );
        await debug(`✅ Lembrete manual enviado para ${city.name}`);
        return true;
      } else {
        console.log(`❌ Falha ao enviar lembrete`);
        return false;
      }
    } catch (error) {
      console.error(`⚠️ Erro no comando !reminder:`, error);
      await debug(`⚠️ Erro no comando !reminder: ${error.message}`);
      return false;
    }
  }

  // Método seguro para enviar mensagens
  async safeSendMessage(msg, message) {
    const methods = [
      // Método 1: msg.reply (padrão)
      async () => {
        await msg.reply(message);
        console.log("✅ Enviado via msg.reply");
        return true;
      },

      // Método 2: chat.sendMessage
      async () => {
        const chat = await msg.getChat();
        await chat.sendMessage(message);
        console.log("✅ Enviado via chat.sendMessage");
        return true;
      },

      // Método 3: client.sendMessage com groupId
      async () => {
        const chat = await msg.getChat();
        const client = msg.client;
        await client.sendMessage(chat.id._serialized, message);
        console.log("✅ Enviado via client.sendMessage");
        return true;
      },

      // Método 4: Apenas log (fallback final)
      async () => {
        console.log("🚨 TODOS OS MÉTODOS FALHARAM - MENSAGEM A SER ENVIADA:");
        console.log("=" * 50);
        console.log(message);
        console.log("=" * 50);
        return false;
      },
    ];

    for (let i = 0; i < methods.length; i++) {
      try {
        console.log(`🔄 Tentativa ${i + 1}/${methods.length}...`);
        const result = await methods[i]();
        if (result) return true;
      } catch (error) {
        console.log(`❌ Método ${i + 1} falhou:`, error.message);
        continue;
      }
    }

    return false;
  }

  // Busca cidade pelo ID do grupo (versão corrigida)
  async findCityByGroup(groupId, groupName = null) {
    return new Promise((resolve, reject) => {
      // PRIMEIRA TENTATIVA: Busca por nome do grupo (mais confiável)
      if (groupName) {
        db.get(
          "SELECT * FROM cities WHERE LOWER(name) = LOWER(?)",
          [groupName.trim()],
          (err, row) => {
            if (err) {
              reject(err);
              return;
            }

            if (row) {
              console.log(`✅ Cidade encontrada por nome: ${row.name}`);
              resolve(row);
              return;
            }

            // SEGUNDA TENTATIVA: Busca por código do grupo (fallback)
            this.findCityByGroupCode(groupId, resolve, reject);
          }
        );
      } else {
        // Se não tem nome, vai direto para busca por código
        this.findCityByGroupCode(groupId, resolve, reject);
      }
    });
  }

  // Método auxiliar para busca por código
  findCityByGroupCode(groupId, resolve, reject) {
    const groupCode = groupId.replace("@g.us", "");

    db.get(
      "SELECT * FROM cities WHERE link LIKE ?",
      [`%${groupCode}%`],
      (err, row) => {
        if (err) {
          console.error("🚨 Erro na busca da cidade:", err);
          reject(err);
        } else {
          if (row) {
            console.log(`✅ Cidade encontrada por código: ${row.name}`);
          } else {
            console.log(
              `❌ Nenhuma cidade encontrada para código: ${groupCode}`
            );

            // Debug: lista todas as cidades
            db.all("SELECT id, name, link FROM cities", [], (err2, rows) => {
              if (!err2 && rows) {
                console.log("🔍 Cidades cadastradas:");
                rows.forEach((city) => {
                  console.log(
                    `   ${city.id}. ${city.name} | Link: ${city.link}`
                  );
                });
              }
            });
          }
          resolve(row);
        }
      }
    );
  }

  // Busca mensagem de reminder
  async getReminderMessage(cityId) {
    return new Promise((resolve, reject) => {
      console.log(`🔍 Buscando mensagem reminder para cidade ID: ${cityId}`);

      // Tenta buscar mensagem específica da cidade primeiro
      db.get(
        "SELECT message_content FROM messages WHERE message_type = 'reminder' AND locale = ?",
        [cityId.toString()],
        (err, row) => {
          if (err) {
            reject(err);
          } else if (row) {
            console.log(`✅ Mensagem específica encontrada`);
            resolve(row.message_content);
          } else {
            console.log(`ℹ️ Sem mensagem específica, buscando geral...`);

            // Se não tem específica, busca qualquer reminder
            db.get(
              "SELECT message_content FROM messages WHERE message_type = 'reminder' ORDER BY id ASC LIMIT 1",
              [],
              (err2, row2) => {
                if (err2) {
                  reject(err2);
                } else if (row2) {
                  console.log(`✅ Mensagem geral encontrada`);
                  resolve(row2.message_content);
                } else {
                  console.log(`❌ Nenhuma mensagem reminder encontrada`);

                  // Debug: mostra todas as mensagens
                  db.all(
                    "SELECT id, locale, message_type, message_content FROM messages LIMIT 10",
                    [],
                    (err3, rows) => {
                      if (!err3 && rows) {
                        console.log(`📋 Mensagens no banco (primeiras 10):`);
                        rows.forEach((msg) => {
                          console.log(
                            `   ${msg.id}. Tipo: ${msg.message_type} | Locale: ${msg.locale}`
                          );
                        });
                      }
                      resolve(null);
                    }
                  );
                }
              }
            );
          }
        }
      );
    });
  }

  // Personaliza mensagem com dados da cidade
  personalizeMessage(template, city) {
    const daysUntilEvent = this.calculateDaysUntil(city.date);
    const formattedDate = this.formatDate(city.date);

    // Debug dos valores
    console.log(`📝 Personalizando mensagem:`);
    console.log(`   - Cidade: ${city.name}`);
    console.log(`   - Data evento: ${city.date}`);
    console.log(`   - Dias até evento: ${daysUntilEvent}`);
    console.log(`   - Data formatada: ${formattedDate}`);
    console.log(`   - Template original: ${template}`);

    let message = template;
    message = message.replace(
      /\{cidade\}/g,
      city.name || "Nome não disponível"
    );
    message = message.replace(/\{name\}/g, city.name || "Nome não disponível");
    message = message.replace(
      /\{dias\}/g,
      isNaN(daysUntilEvent) ? "?" : daysUntilEvent
    );
    message = message.replace(
      /\{days\}/g,
      isNaN(daysUntilEvent) ? "?" : daysUntilEvent
    );
    message = message.replace(
      /\{data\}/g,
      formattedDate || "Data não disponível"
    );
    message = message.replace(
      /\{date\}/g,
      formattedDate || "Data não disponível"
    );

    console.log(`   - Mensagem final: ${message}`);
    return message;
  }

  // Calcula dias até o evento
  calculateDaysUntil(dateStr) {
    const eventDate = new Date(dateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const timeDiff = eventDate.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  // Formata data
  formatDate(dateStr) {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("pt-BR");
  }

  // Executa processamento automático de lembretes
  async processReminders(client) {
    if (!client) {
      console.log("⚠️ Client não disponível para processamento automático");
      return false;
    }

    try {
      console.log("🔍 Verificando lembretes automáticos...");

      const cities = await this.getCitiesNeedingReminders();

      if (cities.length === 0) {
        console.log("✅ Nenhum lembrete para enviar hoje");
        return true;
      }

      console.log(`📋 ${cities.length} cidade(s) precisam de lembrete`);

      for (const city of cities) {
        await this.sendAutomaticReminder(client, city);
        // Aguarda 2s entre envios para evitar spam
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      console.log("✅ Processamento automático concluído");
      return true;
    } catch (error) {
      console.error("⚠️ Erro no processamento automático:", error);
      return false;
    }
  }

  // Busca cidades que precisam de lembrete
  async getCitiesNeedingReminders() {
    const cities = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM cities ORDER BY date ASC", [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    return cities.filter((city) => {
      const daysUntil = this.calculateDaysUntil(city.date);
      return this.reminderIntervals.includes(daysUntil);
    });
  }

  // Envia lembrete automático
  async sendAutomaticReminder(client, city) {
    try {
      const groupId = this.extractGroupId(city.link);
      if (!groupId) {
        console.log(`⚠️ Link inválido para ${city.name}: ${city.link}`);
        return false;
      }

      const reminderMessage = await this.getReminderMessage(city.id);
      if (!reminderMessage) {
        console.log(`⚠️ Sem mensagem cadastrada para ${city.name}`);
        return false;
      }

      const personalizedMessage = this.personalizeMessage(
        reminderMessage,
        city
      );

      await client.sendMessage(groupId, personalizedMessage);
      console.log(`✅ Lembrete automático enviado para ${city.name}`);

      await debug(`✅ Lembrete automático enviado para ${city.name}`);
      return true;
    } catch (error) {
      console.error(`⚠️ Erro ao enviar para ${city.name}:`, error);
      return false;
    }
  }

  // Extrai ID do grupo do link
  extractGroupId(groupLink) {
    try {
      const match = groupLink.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/);
      return match && match[1] ? `${match[1]}@g.us` : null;
    } catch (error) {
      return null;
    }
  }

  // Lista informações para debug
  async listInfo() {
    console.log("\n📊 INFORMAÇÕES DO SISTEMA:");

    // Lista cidades
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

    console.log(`\n🏙️ CIDADES CADASTRADAS: ${cities.length}`);
    cities.forEach((city) => {
      const days = this.calculateDaysUntil(city.date);
      const needsReminder = this.reminderIntervals.includes(days);
      console.log(
        `• ${city.name}: ${this.formatDate(city.date)} (${days} dias) ${
          needsReminder ? "🔔" : ""
        } | Link: ${city.link ? "✅" : "❌"}`
      );
    });

    // Lista mensagens
    const messages = await new Promise((resolve, reject) => {
      db.all(
        "SELECT id, locale, message_content FROM messages WHERE message_type = 'reminder'",
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    console.log(`\n💬 MENSAGENS REMINDER: ${messages.length}`);
    messages.forEach((msg, i) => {
      const preview = msg.message_content.substring(0, 50);
      console.log(
        `${i + 1}. ID: ${msg.id} | Locale: ${msg.locale} | "${preview}..."`
      );
    });

    console.log(
      `\n🔧 Status: Sistema ${
        this.isInitialized ? "INICIALIZADO" : "NÃO INICIALIZADO"
      }`
    );
    console.log("");
  }

  // Marca sistema como inicializado
  initialize() {
    this.isInitialized = true;
    console.log("✅ ReminderSystem inicializado");
  }
}

// Instância global
const reminderSystem = new ReminderSystem();
reminderSystem.initialize();

// Funções para uso externo
async function testReminder() {
  console.log("🧪 TESTE DO SISTEMA DE LEMBRETES\n");
  await reminderSystem.listInfo();
}

async function showInfo() {
  await reminderSystem.listInfo();
}

module.exports = {
  ReminderSystem,
  reminderSystem, // instância pronta
  testReminder,
  showInfo,
};

// Executa teste se chamado diretamente
if (require.main === module) {
  testReminder().catch(console.error);
}
