// services/syncService.js
// Serviço de Sincronização em Tempo Real via Firebase Firestore e Barramento de Eventos

const EventEmitter = require("events");
const { window24hService } = require("./window24hService");

class SyncService extends EventEmitter {
  constructor() {
    super();
    this.db = null;
    this.isListening = false;
    this.unsubscribers = [];
  }

  /**
   * Inicializa o serviço com a instância do Firestore
   * @param {object} firestoreInstance - Instância do Firestore (Firebase Client ou Admin)
   */
  initialize(firestoreInstance) {
    if (!firestoreInstance) {
      console.warn("⚠️ SyncService: Firestore não fornecido. Modo offline/desconectado.");
      return;
    }

    this.db = firestoreInstance;
  }

  /**
   * Inicia a escuta em tempo real de mensagens e conversas
   */
  startListening() {
    if (this.isListening || !this.db) return;

    this.isListening = true;
    console.log("🔄 SyncService: Iniciando sincronização em tempo real com Firestore...");

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
    if (!this.db) return;

    // Suporta tanto o SDK Modular quanto o tradicional do Firestore
    const messagesRef = this.db.collection ? this.db.collection("messages") : null;
    if (!messagesRef) return;

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
    if (!this.db) return;

    const conversationsRef = this.db.collection ? this.db.collection("conversations") : null;
    if (!conversationsRef) return;

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
