// antiSpam.js - Sistema Anti-Spam para controle de tentativas inválidas
const { readJsonFile, saveJsonFile } = require("./initialize");
const { enviarFAQ } = require("./triggers");
const { debug } = require("../services/debugService");

const SPAM_CONFIG = {
  FAQ_THRESHOLD: 3, // Envia FAQ após 3 tentativas
  SUSPEND_THRESHOLD: 10, // Suspende após 10 tentativas
  SUSPEND_DURATION: 60 * 60 * 1000, // 1 hora em millisegundos
};

class AntiSpamManager {
  constructor() {
    this.userAttempts = {}; // Cache em memória para performance
    this.suspendedUsers = {}; // Cache em memória para usuários suspensos
  }

  async initialize() {
    try {
      // Carrega dados do arquivo JSON
      const data = await readJsonFile("antiSpam.json", {
        userAttempts: {},
        suspendedUsers: {},
        lastCleanup: new Date().toISOString(),
      });

      this.userAttempts = data.userAttempts || {};
      this.suspendedUsers = data.suspendedUsers || {};

      // Limpa usuários com suspensão expirada
      await this.cleanupExpiredSuspensions();

      await debug("✅ AntiSpam inicializado com sucesso");
    } catch (error) {
      console.error("Erro ao inicializar AntiSpam:", error);
      this.userAttempts = {};
      this.suspendedUsers = {};
    }
  }

  async cleanupExpiredSuspensions() {
    const now = Date.now();
    let hasChanges = false;

    for (const userNumber in this.suspendedUsers) {
      const suspensionData = this.suspendedUsers[userNumber];
      if (now >= suspensionData.expiresAt) {
        delete this.suspendedUsers[userNumber];
        hasChanges = true;
        await debug(`🔓 Suspensão expirada para usuário: ${userNumber}`);
      }
    }

    if (hasChanges) {
      await this.saveData();
    }
  }

  async saveData() {
    try {
      const data = {
        userAttempts: this.userAttempts,
        suspendedUsers: this.suspendedUsers,
        lastCleanup: new Date().toISOString(),
      };

      await saveJsonFile("antiSpam.json", data);
    } catch (error) {
      console.error("Erro ao salvar dados do AntiSpam:", error);
    }
  }

  isUserSuspended(userNumber) {
    const suspensionData = this.suspendedUsers[userNumber];
    if (!suspensionData) return false;

    const now = Date.now();
    if (now >= suspensionData.expiresAt) {
      // Suspensão expirada, remove da memória
      delete this.suspendedUsers[userNumber];
      this.saveData(); // Salva assincronamente
      return false;
    }

    return true;
  }

  getSuspensionTimeRemaining(userNumber) {
    const suspensionData = this.suspendedUsers[userNumber];
    if (!suspensionData) return 0;

    const now = Date.now();
    const remaining = suspensionData.expiresAt - now;
    return Math.max(0, Math.ceil(remaining / (60 * 1000))); // retorna em minutos
  }

  async incrementAttempts(userNumber) {
    // Limpa suspensões expiradas antes de processar
    await this.cleanupExpiredSuspensions();

    // Se usuário está suspenso, não processa
    if (this.isUserSuspended(userNumber)) {
      return {
        action: "suspended",
        remainingMinutes: this.getSuspensionTimeRemaining(userNumber),
      };
    }

    // Incrementa tentativas
    if (!this.userAttempts[userNumber]) {
      this.userAttempts[userNumber] = {
        count: 0,
        firstAttempt: new Date().toISOString(),
        lastAttempt: new Date().toISOString(),
      };
    }

    this.userAttempts[userNumber].count++;
    this.userAttempts[userNumber].lastAttempt = new Date().toISOString();

    const currentCount = this.userAttempts[userNumber].count;

    // Determina a ação baseada no contador
    let result = { action: "continue", count: currentCount };

    if (currentCount === SPAM_CONFIG.FAQ_THRESHOLD) {
      result.action = "send_faq";
    } else if (currentCount >= SPAM_CONFIG.SUSPEND_THRESHOLD) {
      // Suspende o usuário
      const now = Date.now();
      this.suspendedUsers[userNumber] = {
        suspendedAt: new Date().toISOString(),
        expiresAt: now + SPAM_CONFIG.SUSPEND_DURATION,
        totalAttempts: currentCount,
      };

      // Reset contador após suspensão
      delete this.userAttempts[userNumber];

      result.action = "suspend";
      result.suspendDurationMinutes =
        SPAM_CONFIG.SUSPEND_DURATION / (60 * 1000);
    }

    // Salva dados
    await this.saveData();

    return result;
  }

  async resetUserAttempts(userNumber) {
    if (this.userAttempts[userNumber]) {
      delete this.userAttempts[userNumber];
      await this.saveData();
    }
  }

  async handleSpamAction(client, msg, action, extraData = {}) {
    const userNumber = msg.from;

    switch (action) {
      case "send_faq":
        await enviarFAQ(client, msg);
        await client.sendMessage(
          userNumber,
          "🤔 Percebi que você está com algumas dúvidas! Enviei acima nossa lista de perguntas frequentes que pode te ajudar. 😊"
        );
        break;

      case "suspend":
        await client.sendMessage(
          userNumber,
          `Oi, Léo aqui! 😊 Poderia me explicar, por gentileza, com detalhes por escrito a sua questão? Assim que possível, te respondo. Obrigado! 🙏`
        );
        break;

      case "suspended":
        // Usuário já suspenso tentando enviar mensagem
        await client.sendMessage(
          userNumber,
          `Por favor, aguarde. Responderei assim que possível. ⏳\nAtenciosamente,\nLeonardo Rieper 👍🏻`
        );
        break;
    }
  }

  // Método para obter estatísticas (útil para debugging)
  getStats() {
    return {
      activeAttempts: Object.keys(this.userAttempts).length,
      suspendedUsers: Object.keys(this.suspendedUsers).length,
      config: SPAM_CONFIG,
    };
  }
}

// Instância singleton
const antiSpamManager = new AntiSpamManager();

module.exports = {
  antiSpamManager,
  SPAM_CONFIG,
};
