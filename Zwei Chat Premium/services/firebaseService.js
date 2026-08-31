// services/firebaseService.js
// Inicializador e Gerenciador do Firebase SDK Client para Zwei Chat Premium

const { initializeApp, getApps, getApp: getFirebaseApp, deleteApp } = require("firebase/app");
const { getAuth } = require("firebase/auth");
const { getFirestore } = require("firebase/firestore");
const { syncService } = require("./syncService");
require("dotenv").config();

class FirebaseService {
  constructor() {
    this.app = null;
    this.auth = null;
    this.db = null;
    this.isReady = false;
    this.config = null;
  }

  /**
   * Carrega credenciais do Firebase das variáveis de ambiente ou configuração salva
   */
  _loadConfig() {
    return {
      apiKey: process.env.FIREBASE_API_KEY || "",
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || "",
      projectId: process.env.FIREBASE_PROJECT_ID || "",
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "",
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "",
      appId: process.env.FIREBASE_APP_ID || "",
    };
  }

  /**
   * Inicializa o Firebase com as credenciais ativas
   */
  async initialize() {
    try {
      this.config = this._loadConfig();

      if (!this.config.projectId || !this.config.apiKey) {
        console.warn("⚠️ FirebaseService: Credenciais do Firebase incompletas. Modo offline.");
        this.isReady = false;
        return { success: false, reason: "NOT_CONFIGURED" };
      }

      // Se já houver app inicializado, descarta para aplicar as novas credenciais
      if (getApps().length > 0) {
        try {
          const existingApp = this.app || getFirebaseApp();
          await deleteApp(existingApp);
        } catch (e) {
          console.warn("Aviso ao reiniciar app Firebase:", e.message);
        }
      }

      this.app = initializeApp(this.config);
      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app);
      this.isReady = true;

      // Conecta o Firestore ao serviço de sincronização em tempo real
      syncService.initialize(this.db);
      syncService.startListening();

      console.log(`🔥 FirebaseService: Conectado com sucesso ao projeto: ${this.config.projectId}`);
      return { success: true, projectId: this.config.projectId };
    } catch (error) {
      console.error("❌ FirebaseService: Erro na inicialização:", error);
      this.isReady = false;
      return { success: false, error: error.message };
    }
  }

  /**
   * Reinicializa o serviço com novas configurações fornecidas em tempo de execução
   * @param {object} newConfig
   */
  async reinitialize(newConfig) {
    if (newConfig) {
      if (newConfig.apiKey) process.env.FIREBASE_API_KEY = newConfig.apiKey;
      if (newConfig.projectId) process.env.FIREBASE_PROJECT_ID = newConfig.projectId;
      if (newConfig.authDomain) process.env.FIREBASE_AUTH_DOMAIN = newConfig.authDomain;
      if (newConfig.appId) process.env.FIREBASE_APP_ID = newConfig.appId;
    }
    return this.initialize();
  }

  getDb() {
    return this.db;
  }

  getAuth() {
    return this.auth;
  }

  getApp() {
    return this.app;
  }

  isFirebaseReady() {
    return this.isReady;
  }

  getConfig() {
    return this.config || this._loadConfig();
  }
}

// Exporta instância singleton
const firebaseService = new FirebaseService();
module.exports = {
  FirebaseService,
  firebaseService,
};
