// services/broadcastRecipientsService.js
// Serviço de Gerenciamento e Persistência de Destinatários do Disparador Oficial

const path = require("path");
const fs = require("fs");
const { aplicarTransformacoes } = require("./numberTransformer");

class BroadcastRecipientsService {
  constructor() {
    this.recipientsFilePath = path.join(__dirname, "../data/broadcast_recipients.json");
    this.configFilePath = path.join(__dirname, "../data/broadcast_config.json");
    this._ensureDataDir();

    this.defaultConfig = {
      add9thDigit: true,
      addDDD: true,
      defaultDDD: "11",
      addCountryPrefix: true,
      defaultCountryPrefix: "55",
      dispatchInterval: {
        type: "fixed",
        unit: "seconds",
        value: 2,
        min: 1,
        max: 3,
      },
    };
  }

  /**
   * Garante a existência do diretório de dados
   * @private
   */
  _ensureDataDir() {
    const dir = path.dirname(this.recipientsFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Carrega a configuração ativa de disparo e formatação
   * @returns {object}
   */
  getConfig() {
    try {
      if (!fs.existsSync(this.configFilePath)) {
        fs.writeFileSync(this.configFilePath, JSON.stringify(this.defaultConfig, null, 2), "utf8");
        return { ...this.defaultConfig };
      }
      const data = fs.readFileSync(this.configFilePath, "utf8");
      return { ...this.defaultConfig, ...JSON.parse(data || "{}") };
    } catch (error) {
      console.error("❌ Erro ao ler configurações de disparo:", error);
      return { ...this.defaultConfig };
    }
  }

  /**
   * Salva novas configurações de disparo e formatação
   * @param {object} newConfig
   * @returns {object} Configuração atualizada
   */
  saveConfig(newConfig) {
    try {
      let current = this.defaultConfig;
      if (fs.existsSync(this.configFilePath)) {
        try {
          const raw = fs.readFileSync(this.configFilePath, "utf8");
          current = { ...this.defaultConfig, ...JSON.parse(raw || "{}") };
        } catch (_e) {
          current = this.defaultConfig;
        }
      }
      const updated = { ...current, ...newConfig };
      fs.writeFileSync(this.configFilePath, JSON.stringify(updated, null, 2), "utf8");
      return updated;
    } catch (error) {
      console.error("❌ Erro ao salvar configurações de disparo:", error);
      return this.defaultConfig;
    }
  }

  /**
   * Carrega todos os destinatários salvos
   * @returns {Array<object>}
   */
  getRecipients() {
    try {
      if (!fs.existsSync(this.recipientsFilePath)) {
        return [];
      }
      const data = fs.readFileSync(this.recipientsFilePath, "utf8");
      return JSON.parse(data || "[]");
    } catch (error) {
      console.error("❌ Erro ao ler lista de destinatários:", error);
      return [];
    }
  }

  /**
   * Salva a lista completa de destinatários
   * @private
   */
  _saveRecipients(recipients) {
    try {
      fs.writeFileSync(this.recipientsFilePath, JSON.stringify(recipients, null, 2), "utf8");
      return true;
    } catch (error) {
      console.error("❌ Erro ao gravar destinatários:", error);
      return false;
    }
  }

  /**
   * Adiciona um único destinatário à fila
   * @param {object} contact - { phone, name, variables }
   * @returns {object} Contato cadastrado
   */
  addRecipient(contact) {
    if (!contact || !contact.phone) {
      throw new Error("Telefone do destinatário é obrigatório.");
    }

    const config = this.getConfig();
    const cleanPhone = aplicarTransformacoes(contact.phone, config);

    if (!cleanPhone) {
      throw new Error("Número de telefone inválido.");
    }

    const recipients = this.getRecipients();
    const existingIndex = recipients.findIndex((r) => r.phone === cleanPhone);

    const newRecipient = {
      id: `rcpt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      phone: cleanPhone,
      rawPhone: contact.phone,
      name: contact.name || "",
      variables: Array.isArray(contact.variables)
        ? contact.variables
        : typeof contact.variables === "string"
        ? [contact.variables]
        : contact.name
        ? [contact.name]
        : [],
      status: "pending", // 'pending' | 'sent' | 'failed'
      error: null,
      messageId: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (existingIndex >= 0) {
      // Se já existe, atualiza os dados e reseta para pendente se necessário
      recipients[existingIndex] = {
        ...recipients[existingIndex],
        ...newRecipient,
        id: recipients[existingIndex].id,
      };
      this._saveRecipients(recipients);
      return recipients[existingIndex];
    } else {
      recipients.unshift(newRecipient);
      this._saveRecipients(recipients);
      return newRecipient;
    }
  }

  /**
   * Adiciona uma lista de destinatários em lote (CSV ou texto colado)
   * @param {Array<{ phone: string, name?: string, variables?: Array<string> }>} contactsArray
   * @returns {number} Quantidade de contatos adicionados/atualizados com sucesso
   */
  addRecipientsBatch(contactsArray) {
    if (!Array.isArray(contactsArray) || contactsArray.length === 0) {
      return 0;
    }

    const config = this.getConfig();
    const recipients = this.getRecipients();
    const phoneMap = new Map();

    // Mapeia os contatos existentes por telefone
    recipients.forEach((r, idx) => {
      phoneMap.set(r.phone, idx);
    });

    let addedCount = 0;

    contactsArray.forEach((c) => {
      if (!c || !c.phone) return;

      const cleanPhone = aplicarTransformacoes(c.phone, config);
      if (!cleanPhone) return;

      const variables = Array.isArray(c.variables)
        ? c.variables
        : typeof c.variables === "string"
        ? [c.variables]
        : c.name
        ? [c.name]
        : [];

      if (phoneMap.has(cleanPhone)) {
        const idx = phoneMap.get(cleanPhone);
        recipients[idx].name = c.name || recipients[idx].name;
        recipients[idx].variables = variables.length > 0 ? variables : recipients[idx].variables;
        recipients[idx].status = "pending";
        recipients[idx].error = null;
        recipients[idx].updatedAt = Date.now();
        addedCount++;
      } else {
        const item = {
          id: `rcpt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          phone: cleanPhone,
          rawPhone: c.phone,
          name: c.name || "",
          variables: variables,
          status: "pending",
          error: null,
          messageId: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        recipients.push(item);
        phoneMap.set(cleanPhone, recipients.length - 1);
        addedCount++;
      }
    });

    this._saveRecipients(recipients);
    return addedCount;
  }

  /**
   * Remove um destinatário específico por ID
   * @param {string} id
   * @returns {boolean}
   */
  removeRecipient(id) {
    const recipients = this.getRecipients();
    const filtered = recipients.filter((r) => r.id !== id && r.phone !== id);
    if (filtered.length !== recipients.length) {
      this._saveRecipients(filtered);
      return true;
    }
    return false;
  }

  /**
   * Limpa destinatários por critério
   * @param {"all"|"sent"|"failed"|"pending"} type
   * @returns {number} Quantidade de registros removidos
   */
  clearRecipients(type = "all") {
    const recipients = this.getRecipients();
    let filtered = [];

    if (type === "sent") {
      filtered = recipients.filter((r) => r.status !== "sent");
    } else if (type === "failed") {
      filtered = recipients.filter((r) => r.status !== "failed");
    } else if (type === "pending") {
      filtered = recipients.filter((r) => r.status !== "pending");
    } else {
      filtered = []; // 'all'
    }

    const removedCount = recipients.length - filtered.length;
    this._saveRecipients(filtered);
    return removedCount;
  }

  /**
   * Atualiza o status e resultado de envio de um destinatário
   * @param {string} idOrPhone
   * @param {"pending"|"sent"|"failed"} status
   * @param {string|null} error
   * @param {string|null} messageId
   */
  updateRecipientStatus(idOrPhone, status, error = null, messageId = null) {
    const recipients = this.getRecipients();
    const item = recipients.find((r) => r.id === idOrPhone || r.phone === idOrPhone);

    if (item) {
      item.status = status;
      item.error = error;
      item.messageId = messageId;
      item.updatedAt = Date.now();
      this._saveRecipients(recipients);
      return true;
    }
    return false;
  }

  /**
   * Retorna contadores e estatísticas em tempo real da lista
   * @returns {{ total: number, pending: number, sent: number, failed: number }}
   */
  getStats() {
    const recipients = this.getRecipients();
    const stats = {
      total: recipients.length,
      pending: 0,
      sent: 0,
      failed: 0,
    };

    recipients.forEach((r) => {
      if (r.status === "sent") stats.sent++;
      else if (r.status === "failed") stats.failed++;
      else stats.pending++;
    });

    return stats;
  }

  /**
   * Retorna todos os destinatários pendentes ou com falha para disparo
   * @returns {Array<object>}
   */
  getPendingAndFailedRecipients() {
    const recipients = this.getRecipients();
    return recipients.filter((r) => r.status === "pending" || r.status === "failed");
  }
}

// Exporta instância singleton
const broadcastRecipientsService = new BroadcastRecipientsService();
module.exports = {
  BroadcastRecipientsService,
  broadcastRecipientsService,
};
