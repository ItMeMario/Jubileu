// services/firebaseService.js
// Inicializador e Gerenciador do Firebase SDK Client para Zwei Chat Premium (Multi-Tenant Edition)

const { initializeApp, getApps, getApp: getFirebaseApp, deleteApp } = require("firebase/app");
const {
  getAuth,
  signInWithCustomToken,
  signInAnonymously,
  onAuthStateChanged,
  signOut,
} = require("firebase/auth");
const { getFirestore } = require("firebase/firestore");
const { syncService } = require("./syncService");
const metaConfig = require("../config/metaConfig");
require("dotenv").config();

class FirebaseService {
  constructor() {
    this.app = null;
    this.auth = null;
    this.db = null;
    this.isReady = false;
    this.config = null;
    this.tenantId = null;
    this.currentUser = null;
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
   * Resolve o Tenant ID ativo para isolamento multi-tenant de dados
   * Prioridade:
   * 1. FIREBASE_TENANT_ID no .env
   * 2. META_WABA_ID (WhatsApp Business Account ID da empresa cliente)
   * 3. META_PHONE_NUMBER_ID (ID da linha telefônica)
   * 4. Firebase Auth UID do usuário ativo
   */
  _resolveTenantId() {
    if (process.env.FIREBASE_TENANT_ID && process.env.FIREBASE_TENANT_ID.trim()) {
      return process.env.FIREBASE_TENANT_ID.trim();
    }
    const metaConf = metaConfig.getConfig();
    if (metaConf.wabaId && metaConf.wabaId.trim()) {
      return metaConf.wabaId.trim();
    }
    if (metaConf.phoneNumberId && metaConf.phoneNumberId.trim()) {
      return metaConf.phoneNumberId.trim();
    }
    if (this.currentUser && this.currentUser.uid) {
      return this.currentUser.uid;
    }
    return null;
  }

  /**
   * Autentica o cliente no Firebase Auth para obtenção de request.auth válido
   * @param {string} [customToken=null] - Token JWT assinado emitido pela Cloud Function
   */
  async authenticate(customToken = null) {
    if (!this.auth) return { success: false, error: "Auth not initialized" };

    try {
      const token = customToken || process.env.FIREBASE_CUSTOM_TOKEN;
      if (token) {
        const credential = await signInWithCustomToken(this.auth, token);
        this.currentUser = credential.user;
        console.log(`🔐 FirebaseService: Autenticado com sucesso via Custom Token (UID: ${this.currentUser.uid})`);
        return { success: true, user: this.currentUser };
      }

      // Se não houver token mas autenticação anônima for permitida
      try {
        const credential = await signInAnonymously(this.auth);
        this.currentUser = credential.user;
        console.log(`👤 FirebaseService: Autenticado como sessão anônima segura (UID: ${this.currentUser.uid})`);
        return { success: true, user: this.currentUser, anonymous: true };
      } catch (anonErr) {
        // Modo offline ou sem autenticação habilitada no console
        return { success: false, warning: anonErr.message };
      }
    } catch (err) {
      console.warn("Aviso na autenticação do Firebase:", err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Inicializa o Firebase com as credenciais ativas e conecta o SyncService no tenant correto
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

      // Monitora alterações no estado de autenticação
      onAuthStateChanged(this.auth, (user) => {
        this.currentUser = user || null;
        const newTenantId = this._resolveTenantId();
        if (newTenantId && newTenantId !== this.tenantId) {
          this.tenantId = newTenantId;
          syncService.setTenantId(newTenantId);
        }
      });

      // Executa autenticação inicial segura
      await this.authenticate();

      // Resolve o Tenant ID e inicializa a sincronização em tempo real isolada
      this.tenantId = this._resolveTenantId();
      syncService.initialize(this.db, this.tenantId);
      syncService.startListening();

      const tenantMsg = this.tenantId ? `(Tenant: ${this.tenantId})` : "(Modo Raiz/Offline)";
      console.log(`🔥 FirebaseService: Conectado com sucesso ao projeto: ${this.config.projectId} ${tenantMsg}`);
      return { success: true, projectId: this.config.projectId, tenantId: this.tenantId };
    } catch (error) {
      console.error("❌ FirebaseService: Erro na inicialização:", error);
      this.isReady = false;
      return { success: false, error: error.message };
    }
  }

  /**
   * Define ou atualiza o tenant ativo e opcionalmente efetua login com Custom Token
   * @param {string} tenantId
   * @param {string} [customToken=null]
   */
  async setTenant(tenantId, customToken = null) {
    if (customToken) {
      await this.authenticate(customToken);
    }
    this.tenantId = tenantId ? String(tenantId).trim() : null;
    syncService.setTenantId(this.tenantId);
    return this.tenantId;
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
      if (newConfig.tenantId) process.env.FIREBASE_TENANT_ID = newConfig.tenantId;
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

  getTenantId() {
    return this.tenantId || this._resolveTenantId();
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
