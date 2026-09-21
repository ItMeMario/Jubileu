// services/firebaseService.js
const { initializeApp, getApps, getApp: getFirebaseApp, deleteApp } = require("firebase/app");
const { getAuth } = require("firebase/auth");
const { getFirestore } = require("firebase/firestore");
const { loadFirebaseConfig } = require("../config/firebaseConfig");

class FirebaseService {
  constructor() {
    this.app = null;
    this.auth = null;
    this.db = null;
    this.isReady = false;
    this.config = null;
  }

  /**
   * Inicializa o Firebase com as credenciais salvas
   */
  async initialize() {
    try {
      this.config = loadFirebaseConfig();

      if (!this.config.isConfigured) {
        console.warn("⚠️ Firebase ainda não configurado com credenciais válidas. Modo pendente de configuração ativo.");
        this.isReady = false;
        return { success: false, reason: "NOT_CONFIGURED" };
      }

      // Se já houver um app carregado anteriormente, descarta para aplicar as novas credenciais
      if (getApps().length > 0) {
        try {
          const existingApp = this.app || getFirebaseApp();
          await deleteApp(existingApp);
        } catch (e) {
          console.warn("Aviso ao limpar app anterior do Firebase:", e.message);
        }
      }

      this.app = initializeApp({
        apiKey: this.config.apiKey,
        authDomain: this.config.authDomain,
        projectId: this.config.projectId,
        storageBucket: this.config.storageBucket,
        messagingSenderId: this.config.messagingSenderId,
        appId: this.config.appId
      });

      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app);
      this.isReady = true;

      console.log(`🔥 Firebase inicializado com sucesso para o projeto: ${this.config.projectId}`);
      return { success: true, projectId: this.config.projectId };
    } catch (error) {
      console.error("❌ Erro ao inicializar o Firebase Service:", error);
      this.isReady = false;
      return { success: false, error: error.message };
    }
  }

  /**
   * Reinicializa o serviço com novas configurações fornecidas
   */
  async reinitialize(newConfig) {
    if (newConfig) {
      const { saveFirebaseConfig } = require("../config/firebaseConfig");
      saveFirebaseConfig(newConfig);
    }
    return this.initialize();
  }

  getAuth() {
    return this.auth;
  }

  getDb() {
    return this.db;
  }

  getApp() {
    return this.app;
  }

  isFirebaseReady() {
    return this.isReady;
  }

  getConfig() {
    return this.config || loadFirebaseConfig();
  }
}

// Exporta instância singleton
const firebaseService = new FirebaseService();
module.exports = firebaseService;
