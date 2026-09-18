// services/syncService.js
// Serviço de Sincronização em Tempo Real via Firebase Firestore e Barramento de Eventos

const EventEmitter = require("events");
const { window24hService } = require("./window24hService");

class SyncService extends EventEmitter {
  constructor() {
    super();
    this.db = null;
    this.tenantId = null;
    this.isListening = false;
    this.unsubscribers = [];
    this.recentInboundBuffer = [];
    this.maxBufferSize = 50;

    // Bufferiza automaticamente mensagens recebidas emitidas pelo Webhook ou Firestore
    this.on("message:inbound", (msg) => {
      this._recordInboundToBuffer(msg);
    });
  }

  /**
   * Armazena mensagem recebida no buffer em memória
   * @private
   * @param {object} msg
   */
  _recordInboundToBuffer(msg) {
    if (!msg) return;
    const entry = {
      id: msg.id || `inbound_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      from: msg.from || "",
      senderName: msg.senderName || "",
      body: msg.body || "",
      timestamp: msg.timestamp || Date.now(),
      type: msg.type || "text",
      interactiveType: msg.interactiveType || null,
    };

    const exists = this.recentInboundBuffer.some((m) => m.id === entry.id);
    if (!exists) {
      this.recentInboundBuffer.unshift(entry);
      if (this.recentInboundBuffer.length > this.maxBufferSize) {
        this.recentInboundBuffer.pop();
      }
    }
  }

  /**
   * Obtém as mensagens inbound mais recentes do buffer
   * @param {number} [limit=50]
   * @returns {Array}
   */
  getRecentInboundMessages(limit = 50) {
    const lim = Math.max(1, Math.min(Number(limit) || 50, 100));
    return this.recentInboundBuffer.slice(0, lim);
  }

  /**
   * Esvazia o buffer em memória
   * @returns {boolean}
   */
  clearRecentInboundMessages() {
    this.recentInboundBuffer = [];
    return true;
  }

  /**
   * Inicializa o serviço com a instância do Firestore e opcionalmente o Tenant ID
   * @param {object} firestoreInstance - Instância do Firestore (Firebase Client ou Admin)
   * @param {string} [tenantId=null] - Identificador único do tenant para isolamento de dados
   */
  initialize(firestoreInstance, tenantId = null) {
    if (!firestoreInstance) {
      console.warn("⚠️ SyncService: Firestore não fornecido. Modo offline/desconectado.");
      return;
    }

    this.db = firestoreInstance;
    if (tenantId) {
      this.tenantId = String(tenantId).trim();
    }
  }

  /**
   * Define ou atualiza o Tenant ID em tempo de execução
   * Se os ouvintes estiverem ativos, reinicia a escuta na subcoleção isolada correspondente
   * @param {string} tenantId
   */
  setTenantId(tenantId) {
    const cleanTenantId = tenantId ? String(tenantId).trim() : null;
    if (this.tenantId !== cleanTenantId) {
      this.tenantId = cleanTenantId;
      console.log(`🏢 SyncService: Tenant ID configurado para: ${cleanTenantId || "nenhum (modo legado/offline)"}`);

      if (this.isListening) {
        this.stopListening();
        this.startListening();
      }
    }
  }

  /**
   * Retorna o Tenant ID atualmente ativo
   * @returns {string|null}
   */
  getTenantId() {
    return this.tenantId;
  }

  /**
   * Retorna a referência da coleção de mensagens (com isolamento multi-tenant se ativo)
   * @private
   */
  _getMessagesRef() {
    if (!this.db || typeof this.db.collection !== "function") return null;

    if (this.tenantId) {
      return this.db.collection("tenants").doc(this.tenantId).collection("messages");
    }
    return this.db.collection("messages");
  }

  /**
   * Retorna a referência da coleção de conversas (com isolamento multi-tenant se ativo)
   * @private
   */
  _getConversationsRef() {
    if (!this.db || typeof this.db.collection !== "function") return null;

    if (this.tenantId) {
      return this.db.collection("tenants").doc(this.tenantId).collection("conversations");
    }
    return this.db.collection("conversations");
  }

  /**
   * Inicia a escuta em tempo real de mensagens e conversas
   */
  startListening() {
    if (this.isListening || !this.db) return;

    this.isListening = true;
    const scopeMsg = this.tenantId ? `Tenant: ${this.tenantId}` : "Escopo Global/Legado";
    console.log(`🔄 SyncService: Iniciando sincronização em tempo real com Firestore (${scopeMsg})...`);

    try {
      this._listenToMessages();
      this._listenToConversations();
    } catch (error) {
      console.error("❌ SyncService: Erro ao registrar listeners do Firestore:", error);
    }
  }

  /**
   * Registra listener para a coleção de mensagens
   * @private
   */
  _listenToMessages() {
    const messagesRef = this._getMessagesRef();
    if (!messagesRef || typeof messagesRef.onSnapshot !== "function") return;

    const unsubscribe = messagesRef.onSnapshot(
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const messageData = change.doc.data();
          const messageId = change.doc.id;

          // Nova mensagem adicionada
          if (change.type === "added") {
            if (messageData.direction === "inbound") {
              // Registra e renova a Janela de 24h automaticamente
              window24hService.recordInboundInteraction(messageData.from, messageData.timestamp);

              // Emite evento para os executores de fluxos e tela de chat
              this.emit("message:inbound", { id: messageId, ...messageData });
            } else if (messageData.direction === "outbound") {
              this.emit("message:outbound", { id: messageId, ...messageData });
            }
          }

          // Mensagem modificada (ex: atualização de status de entrega sent -> delivered -> read)
          if (change.type === "modified") {
            this.emit("message:status_updated", {
              id: messageId,
              status: messageData.status,
              updatedAt: messageData.updatedAt,
              errors: messageData.errors || null,
              ...messageData,
            });
          }
        });
      },
      (error) => {
        console.error("❌ SyncService: Erro no snapshot de mensagens:", error);
        this.emit("error", error);
      }
    );

    this.unsubscribers.push(unsubscribe);
  }

  /**
   * Registra listener para a lista de conversas ativas
   * @private
   */
  _listenToConversations() {
    const conversationsRef = this._getConversationsRef();
    if (!conversationsRef || typeof conversationsRef.onSnapshot !== "function") return;

    const unsubscribe = conversationsRef.onSnapshot(
      (snapshot) => {
        const conversations = [];
        snapshot.forEach((doc) => {
          conversations.push({ id: doc.id, ...doc.data() });
        });

        this.emit("conversations:updated", conversations);
      },
      (error) => {
        console.error("❌ SyncService: Erro no snapshot de conversas:", error);
        this.emit("error", error);
      }
    );

    this.unsubscribers.push(unsubscribe);
  }

  /**
   * Interrompe todos os ouvintes em tempo real
   */
  stopListening() {
    this.unsubscribers.forEach((unsub) => {
      if (typeof unsub === "function") unsub();
    });
    this.unsubscribers = [];
    this.isListening = false;
    console.log("🛑 SyncService: Sincronização em tempo real encerrada.");
  }
}

// Exporta instância singleton
const syncService = new SyncService();
module.exports = {
  SyncService,
  syncService,
};
