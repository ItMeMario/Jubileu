// services/conversationService.js
// Serviço de Gerenciamento de Conversas Locais, Histórico e Handover (Atendimento Humano)
// Projetado com Repository Pattern extensível para sincronização em nuvem no futuro.

const EventEmitter = require("events");
const fs = require("fs");
const path = require("path");
const { storagePaths } = require("./storagePaths");
const { normalizePhoneNumber } = require("../client/metaApiClient");
const { window24hService } = require("./window24hService");
const { syncService } = require("./syncService");

// Limite máximo de mensagens no histórico por contato para evitar consumo excessivo de memória
const MAX_MESSAGES_PER_CONTACT = 500;

/**
 * Adaptador de Armazenamento Local em JSON
 */
class LocalConversationStore {
  constructor(filePath) {
    this.filePath = filePath;
    this._ensureDir();
  }

  _ensureDir() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (err) {
        console.warn("⚠️ Não foi possível criar diretório para conversas:", err.message);
      }
    }
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf8");
        return JSON.parse(raw || "{}");
      }
    } catch (err) {
      console.error("❌ Erro ao ler conversations.json local:", err.message);
    }
    return {};
  }

  save(data) {
    try {
      this._ensureDir();
      const tempPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf8");
      fs.renameSync(tempPath, this.filePath);
      return true;
    } catch (err) {
      console.error("❌ Erro ao salvar conversations.json local:", err.message);
      return false;
    }
  }
}

class ConversationService extends EventEmitter {
  constructor() {
    super();
    this.filePath = storagePaths.getDataPath("conversations.json");
    this.store = new LocalConversationStore(this.filePath);
    // Mapa em memória: contactPhone => Conversation
    this.conversations = new Map();
    this.isListening = false;

    this.loadConversations();
    this.bindInboundEvents();
  }

  /**
   * Conecta o ouvinte global de mensagens inbound do SyncService
   */
  bindInboundEvents() {
    if (this.isListening) return;

    if (syncService && typeof syncService.on === "function") {
      syncService.on("message:inbound", (msg) => {
        try {
          this.recordInboundMessage(msg);
        } catch (err) {
          console.error("❌ Erro ao registrar mensagem de entrada em conversationService:", err);
        }
      });
      this.isListening = true;
      console.log("💬 ConversationService: Ouvinte de mensagens inbound vinculado.");
    }
  }

  /**
   * Carrega as conversas do armazenamento local
   */
  loadConversations() {
    const rawData = this.store.load();
    this.conversations.clear();

    if (rawData && typeof rawData === "object") {
      for (const [phone, conv] of Object.entries(rawData)) {
        if (conv && conv.contactPhone) {
          this.conversations.set(conv.contactPhone, {
            contactPhone: conv.contactPhone,
            contactName: conv.contactName || conv.contactPhone,
            isBotActive: conv.isBotActive !== false, // Padrão: bot ativo
            lastSender: conv.lastSender || "client", // "client" | "bot" | "operator"
            lastMessage: conv.lastMessage || "",
            lastMessageType: conv.lastMessageType || "text",
            lastInteractionTimestamp: conv.lastInteractionTimestamp || Date.now(),
            unreadCount: Number(conv.unreadCount) || 0,
            assumedAt: conv.assumedAt || null,
            messages: Array.isArray(conv.messages) ? conv.messages : [],
          });
        }
      }
    }

    console.log(`💬 ConversationService: ${this.conversations.size} conversas carregadas.`);
  }

  /**
   * Salva as conversas em memória no armazenamento local
   * @private
   */
  _persist() {
    const obj = {};
    for (const [phone, conv] of this.conversations.entries()) {
      obj[phone] = conv;
    }
    this.store.save(obj);
  }

  /**
   * Retorna todas as conversas ordenadas pela interação mais recente
   * @returns {Array<object>}
   */
  getAllConversations() {
    const list = Array.from(this.conversations.values());
    list.sort((a, b) => (b.lastInteractionTimestamp || 0) - (a.lastInteractionTimestamp || 0));
    return list;
  }

  /**
   * Retorna os detalhes de uma conversa por telefone
   * @param {string} contactPhone
   * @returns {object|null}
   */
  getConversationByPhone(contactPhone) {
    const phone = normalizePhoneNumber(contactPhone);
    if (!phone) return null;
    return this.conversations.get(phone) || null;
  }

  /**
   * Obtém ou inicializa uma conversa
   * @private
   * @param {string} phone
   * @param {string} [name=""]
   * @returns {object}
   */
  _getOrCreateConversation(phone, name = "") {
    let conv = this.conversations.get(phone);
    if (!conv) {
      conv = {
        contactPhone: phone,
        contactName: name || phone,
        isBotActive: true,
        lastSender: "client",
        lastMessage: "",
        lastMessageType: "text",
        lastInteractionTimestamp: Date.now(),
        unreadCount: 0,
        assumedAt: null,
        messages: [],
      };
      this.conversations.set(phone, conv);
    } else if (name && conv.contactName === phone) {
      conv.contactName = name;
    }
    return conv;
  }

  /**
   * Registra mensagem recebida do cliente (Inbound)
   * @param {object} msg - Mensagem normalizada do Webhook
   */
  recordInboundMessage(msg) {
    if (!msg || !msg.from) return;
    const phone = normalizePhoneNumber(msg.from);
    if (!phone) return;

    const senderName = msg.senderName || phone;
    const bodyText = msg.body || (msg.type ? `[${msg.type}]` : "[Mensagem]");
    const timestamp = msg.timestamp || Date.now();

    const conv = this._getOrCreateConversation(phone, senderName);

    // Atualiza estado da conversa (Verde = Cliente)
    conv.contactName = senderName;
    conv.lastSender = "client";
    conv.lastMessage = bodyText;
    conv.lastMessageType = msg.type || "text";
    conv.lastInteractionTimestamp = timestamp;
    conv.unreadCount = (conv.unreadCount || 0) + 1;

    // Adiciona ao histórico de mensagens
    const messageEntry = {
      id: msg.id || `in_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      direction: "inbound",
      sender: "client",
      body: bodyText,
      timestamp: timestamp,
      type: msg.type || "text",
      interactiveType: msg.interactiveType || null,
      status: "received",
    };

    // Previne duplicação de mensagens pelo mesmo ID
    const alreadyExists = conv.messages.some((m) => m.id === messageEntry.id);
    if (!alreadyExists) {
      conv.messages.push(messageEntry);
      if (conv.messages.length > MAX_MESSAGES_PER_CONTACT) {
        conv.messages.shift();
      }
    }

    this._persist();

    // Notifica o barramento de eventos interno e Electron
    this.emit("conversation:updated", conv);
    this.emit("conversation:message-added", { phone, message: messageEntry });
    return conv;
  }

  /**
   * Registra mensagem enviada pelo robô (Outbound Bot)
   * @param {string} contactPhone
   * @param {string} text
   * @param {string} [messageId=null]
   */
  recordBotMessage(contactPhone, text, messageId = null) {
    const phone = normalizePhoneNumber(contactPhone);
    if (!phone) return;

    const conv = this._getOrCreateConversation(phone);
    const timestamp = Date.now();
    const bodyText = String(text || "");

    // Atualiza estado da conversa (Vermelho = Bot)
    conv.lastSender = "bot";
    conv.lastMessage = bodyText;
    conv.lastMessageType = "text";
    conv.lastInteractionTimestamp = timestamp;

    const messageEntry = {
      id: messageId || `bot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      direction: "outbound",
      sender: "bot",
      body: bodyText,
      timestamp: timestamp,
      type: "text",
      status: "sent",
    };

    conv.messages.push(messageEntry);
    if (conv.messages.length > MAX_MESSAGES_PER_CONTACT) {
      conv.messages.shift();
    }

    this._persist();
    this.emit("conversation:updated", conv);
    this.emit("conversation:message-added", { phone, message: messageEntry });
    return conv;
  }

  /**
   * Consulta se o robô está ativo para um contato específico
   * @param {string} contactPhone
   * @returns {boolean}
   */
  isBotActiveForContact(contactPhone) {
    const phone = normalizePhoneNumber(contactPhone);
    if (!phone) return true;
    const conv = this.conversations.get(phone);
    if (!conv) return true; // Por padrão o bot responde novos contatos
    return conv.isBotActive !== false;
  }

  /**
   * Assume o atendimento da conversa, silenciando o bot apenas para este contato
   * @param {string} contactPhone
   * @returns {object}
   */
  takeoverConversation(contactPhone) {
    const phone = normalizePhoneNumber(contactPhone);
    if (!phone) throw new Error("Número de telefone inválido.");

    const conv = this._getOrCreateConversation(phone);
    conv.isBotActive = false;
    conv.assumedAt = Date.now();

    this._persist();
    console.log(`👤 [Handover] Conversa de ${phone} assumida pelo operador. Bot pausado para este contato.`);

    this.emit("conversation:updated", conv);
    return { success: true, isBotActive: false, phone };
  }

  /**
   * Reativa o robô para este contato específico
   * @param {string} contactPhone
   * @returns {object}
   */
  activateBotForContact(contactPhone) {
    const phone = normalizePhoneNumber(contactPhone);
    if (!phone) throw new Error("Número de telefone inválido.");

    const conv = this._getOrCreateConversation(phone);
    conv.isBotActive = true;
    conv.assumedAt = null;

    // Se houver executor de fluxo ativo para este número, reinicializa a sessão para fluxo limpo
    try {
      const { flowExecutor } = require("../client/flowExecutor");
      if (flowExecutor && typeof flowExecutor.resetSession === "function") {
        flowExecutor.resetSession(phone);
      }
    } catch (_e) {
      // Ignora erro caso flowExecutor não esteja acessível neste instante
    }

    this._persist();
    console.log(`🤖 [Handover] Robô reativado para o contato ${phone}.`);

    this.emit("conversation:updated", conv);
    return { success: true, isBotActive: true, phone };
  }

  /**
   * Envia uma mensagem manual de operador com validação rigorosa da janela de 24h
   * e pausa automática do robô para este contato
   * @param {string} contactPhone
   * @param {string} text
   * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
   */
  async sendManualMessage(contactPhone, text) {
    const phone = normalizePhoneNumber(contactPhone);
    if (!phone) {
      return { success: false, error: "Número de telefone destinatário inválido." };
    }

    const cleanText = String(text || "").trim();
    if (!cleanText) {
      return { success: false, error: "O texto da mensagem não pode estar vazio." };
    }

    // 1. Validação obrigatória da Política de Atendimento de 24 Horas da Meta
    const windowStatus = window24hService.checkWindow(phone);
    if (windowStatus.isExpired) {
      return {
        success: false,
        error:
          "Janela de atendimento de 24 horas expirada. A Meta WhatsApp Cloud API proíbe mensagens de formato livre fora da janela. Utilize um Message Template aprovado.",
        windowExpired: true,
      };
    }

    // 2. Assume automaticamente a conversa se ainda estiver com o bot ativo
    this.takeoverConversation(phone);

    // 3. Dispara a mensagem via Meta Cloud API Oficial
    try {
      const { metaApiClient } = require("../client/metaApiClient");
      const sendResult = await metaApiClient.sendTextMessage(phone, cleanText);

      const timestamp = Date.now();
      const conv = this._getOrCreateConversation(phone);

      // Vermelho = Bot / Atendente (já respondido, aguardando cliente)
      conv.lastSender = "bot";
      conv.lastMessage = cleanText;
      conv.lastMessageType = "text";
      conv.lastInteractionTimestamp = timestamp;

      const messageEntry = {
        id: sendResult?.messageId || `op_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        direction: "outbound",
        sender: "operator",
        body: cleanText,
        timestamp: timestamp,
        type: "text",
        status: "sent",
      };

      conv.messages.push(messageEntry);
      if (conv.messages.length > MAX_MESSAGES_PER_CONTACT) {
        conv.messages.shift();
      }

      this._persist();
      this.emit("conversation:updated", conv);
      this.emit("conversation:message-added", { phone, message: messageEntry });

      return {
        success: true,
        messageId: messageEntry.id,
        phone,
      };
    } catch (err) {
      console.error(`❌ Erro ao enviar mensagem manual para ${phone}:`, err.message);
      return {
        success: false,
        error: err.message || "Falha ao enviar mensagem pela Meta API.",
      };
    }
  }

  /**
   * Marca mensagens de uma conversa como lidas (zera contador)
   * @param {string} contactPhone
   */
  markAsRead(contactPhone) {
    const phone = normalizePhoneNumber(contactPhone);
    if (!phone) return;
    const conv = this.conversations.get(phone);
    if (conv && conv.unreadCount > 0) {
      conv.unreadCount = 0;
      this._persist();
      this.emit("conversation:updated", conv);
    }
  }

  /**
   * Limpa todas as conversas do repositório local
   */
  clearConversations() {
    this.conversations.clear();
    this.store.save({});
    this.emit("conversations:cleared");
    return true;
  }
}

// Exporta instância singleton
const conversationService = new ConversationService();
module.exports = {
  ConversationService,
  conversationService,
};
