// services/authService.js
const {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  onAuthStateChanged
} = require("firebase/auth");
const {
  doc,
  getDoc,
  setDoc,
  runTransaction
} = require("firebase/firestore");
const firebaseService = require("./firebaseService");

class AuthService {
  constructor() {
    this.currentUser = null;
    this.currentLicense = null;
    this.isActivated = false;
    this.initialized = false;
    this.listeners = new Set();
  }

  /**
   * Inicializa o serviço de autenticação
   */
  async initialize() {
    try {
      const fbResult = await firebaseService.initialize();
      
      if (!fbResult.success || !firebaseService.isFirebaseReady()) {
        console.log("ℹ️ AuthService: Firebase não configurado. Aguardando credenciais.");
        this.initialized = true;
        return { success: true, mode: "unconfigured" };
      }

      const auth = firebaseService.getAuth();

      // Observador de estado de autenticação do Firebase
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          this.currentUser = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email.split("@")[0]
          };
          // Valida licença associada ao usuário no Firestore
          await this.refreshUserLicenseStatus();
        } else {
          this.currentUser = null;
          this.currentLicense = null;
          this.isActivated = false;
        }

        this.notifyListeners();
      });

      this.initialized = true;
      console.log("🔐 AuthService inicializado com sucesso.");
      return { success: true };
    } catch (error) {
      console.error("❌ Erro ao inicializar AuthService:", error);
      this.initialized = true;
      return { success: false, error: error.message };
    }
  }

  /**
   * Adiciona listener para mudanças no estado de autenticação
   */
  addStateListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notifica todos os listeners registrados
   */
  notifyListeners() {
    const state = this.getAuthState();
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (err) {
        console.error("Erro no listener de Auth:", err);
      }
    }
  }

  /**
   * Retorna o estado atual da autenticação e licenciamento
   */
  getAuthState() {
    const isFirebaseConfigured = firebaseService.isFirebaseReady();

    return {
      isFirebaseConfigured,
      isAuthenticated: !!this.currentUser,
      isActivated: this.isActivated,
      user: this.currentUser,
      license: this.currentLicense
    };
  }

  /**
   * Realiza login com E-mail e Senha
   */
  async login(email, password) {
    if (!firebaseService.isFirebaseReady()) {
      throw new Error("O Firebase ainda não está configurado. Configure as credenciais nas configurações.");
    }

    try {
      const auth = firebaseService.getAuth();
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      this.currentUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split("@")[0]
      };

      // Carrega e valida licença
      await this.refreshUserLicenseStatus();

      return {
        success: true,
        user: this.currentUser,
        isActivated: this.isActivated,
        license: this.currentLicense
      };
    } catch (error) {
      console.error("Erro no login:", error);
      return {
        success: false,
        code: error.code,
        message: this.formatErrorMessage(error)
      };
    }
  }

  /**
   * Registra um novo usuário com E-mail, Senha e Nome
   */
  async register(name, email, password) {
    if (!firebaseService.isFirebaseReady()) {
      throw new Error("O Firebase ainda não está configurado. Configure as credenciais nas configurações.");
    }

    try {
      const auth = firebaseService.getAuth();
      const db = firebaseService.getDb();

      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      if (name && name.trim()) {
        await updateProfile(user, { displayName: name.trim() });
      }

      this.currentUser = {
        uid: user.uid,
        email: user.email,
        displayName: name ? name.trim() : user.email.split("@")[0]
      };

      // Cria registro do usuário no Firestore
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        displayName: this.currentUser.displayName,
        isActivated: false,
        licenseKey: null,
        createdAt: new Date().toISOString(),
        role: "user"
      });

      this.isActivated = false;
      this.currentLicense = null;

      return {
        success: true,
        user: this.currentUser,
        isActivated: false
      };
    } catch (error) {
      console.error("Erro no registro:", error);
      return {
        success: false,
        code: error.code,
        message: this.formatErrorMessage(error)
      };
    }
  }

  /**
   * Envia e-mail para recuperação de senha
   */
  async sendPasswordReset(email) {
    if (!firebaseService.isFirebaseReady()) {
      throw new Error("O Firebase ainda não está configurado.");
    }

    try {
      const auth = firebaseService.getAuth();
      await sendPasswordResetEmail(auth, email.trim());
      return { success: true };
    } catch (error) {
      console.error("Erro ao enviar reset de senha:", error);
      return {
        success: false,
        code: error.code,
        message: this.formatErrorMessage(error)
      };
    }
  }

  /**
   * Realiza logout da aplicação
   */
  async logout() {
    try {
      if (firebaseService.isFirebaseReady()) {
        const auth = firebaseService.getAuth();
        await signOut(auth);
      }

      this.currentUser = null;
      this.currentLicense = null;
      this.isActivated = false;

      this.notifyListeners();
      return { success: true };
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Ativa o produto utilizando uma chave de licença
   */
  async activateLicenseKey(licenseKey) {
    if (!this.currentUser) {
      return { success: false, message: "Você precisa estar conectado para ativar o produto." };
    }

    if (!firebaseService.isFirebaseReady()) {
      return { success: false, message: "Firebase não está conectado." };
    }

    const cleanKey = (licenseKey || "").trim().toUpperCase();
    if (!cleanKey) {
      return { success: false, message: "Por favor, informe uma chave de ativação válida." };
    }

    try {
      const db = firebaseService.getDb();
      const licenseRef = doc(db, "licenses", cleanKey);
      const userRef = doc(db, "users", this.currentUser.uid);

      // Executa validação e ativação em transação atômica
      const activationResult = await runTransaction(db, async (transaction) => {
        const licenseDoc = await transaction.get(licenseRef);

        if (!licenseDoc.exists()) {
          throw new Error("CHAVE_INVALIDA: A chave de ativação informada não existe.");
        }

        const licenseData = licenseDoc.data();

        // Verifica se a chave já foi utilizada por outro usuário
        if (licenseData.status === "used" || licenseData.status === "active") {
          if (licenseData.usedByUid && licenseData.usedByUid !== this.currentUser.uid) {
            throw new Error("CHAVE_JA_UTILIZADA: Esta chave já foi ativada por outra conta.");
          }
        }

        if (licenseData.status === "revoked") {
          throw new Error("CHAVE_REVOGADA: Esta chave de ativação foi revogada.");
        }

        if (licenseData.expiresAt) {
          const expirationDate = new Date(licenseData.expiresAt);
          if (expirationDate < new Date()) {
            throw new Error("CHAVE_EXPIRADA: Esta chave de ativação já expirou.");
          }
        }

        const nowIso = new Date().toISOString();

        // 1. Atualiza documento da licença
        transaction.update(licenseRef, {
          status: "active",
          usedByUid: this.currentUser.uid,
          usedByEmail: this.currentUser.email,
          activatedAt: nowIso
        });

        // 2. Atualiza documento do usuário
        transaction.set(userRef, {
          isActivated: true,
          licenseKey: cleanKey,
          licensePlan: licenseData.plan || "lifetime",
          activatedAt: nowIso,
          updatedAt: nowIso
        }, { merge: true });

        return {
          key: cleanKey,
          plan: licenseData.plan || "lifetime",
          activatedAt: nowIso,
          expiresAt: licenseData.expiresAt || null
        };
      });

      this.isActivated = true;
      this.currentLicense = activationResult;
      this.notifyListeners();

      console.log(`🎉 Produto ativado com sucesso para ${this.currentUser.email} com a chave ${cleanKey}`);

      return {
        success: true,
        message: "Produto ativado com sucesso!",
        license: activationResult
      };
    } catch (error) {
      console.error("Erro na ativação de chave:", error);
      let message = error.message;

      if (message.startsWith("CHAVE_")) {
        message = message.split(": ")[1] || message;
      }

      return {
        success: false,
        message: message || "Falha ao validar a chave de ativação."
      };
    }
  }

  /**
   * Recarrega e valida o status da licença do usuário atual no Firestore
   */
  async refreshUserLicenseStatus() {
    if (!this.currentUser || !firebaseService.isFirebaseReady()) {
      this.isActivated = false;
      this.currentLicense = null;
      return false;
    }

    try {
      const db = firebaseService.getDb();
      const userRef = doc(db, "users", this.currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        this.isActivated = false;
        this.currentLicense = null;
        return false;
      }

      const userData = userSnap.data();

      if (!userData.isActivated || !userData.licenseKey) {
        this.isActivated = false;
        this.currentLicense = null;
        return false;
      }

      // Valida se a chave ainda está ativa no Firestore
      const licenseRef = doc(db, "licenses", userData.licenseKey);
      const licenseSnap = await getDoc(licenseRef);

      if (!licenseSnap.exists()) {
        this.isActivated = false;
        this.currentLicense = null;
        return false;
      }

      const licenseData = licenseSnap.data();

      // Verifica revogação ou expiração
      if (licenseData.status === "revoked") {
        this.isActivated = false;
        this.currentLicense = null;
        return false;
      }

      if (licenseData.expiresAt && new Date(licenseData.expiresAt) < new Date()) {
        this.isActivated = false;
        this.currentLicense = null;
        return false;
      }

      // Licença válida
      this.isActivated = true;
      this.currentLicense = {
        key: userData.licenseKey,
        plan: licenseData.plan || userData.licensePlan || "lifetime",
        activatedAt: licenseData.activatedAt || userData.activatedAt,
        expiresAt: licenseData.expiresAt || null
      };

      return true;
    } catch (error) {
      console.error("Erro ao verificar status da licença:", error);
      return false;
    }
  }

  /**
   * Formata mensagens de erro do Firebase para exibição amigável ao usuário
   */
  formatErrorMessage(error) {
    const code = error.code || "";
    switch (code) {
      case "auth/invalid-email":
        return "O endereço de e-mail informado é inválido.";
      case "auth/user-disabled":
        return "Esta conta de usuário foi desativada.";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "E-mail ou senha incorretos.";
      case "auth/email-already-in-use":
        return "Este endereço de e-mail já está cadastrado.";
      case "auth/weak-password":
        return "A senha informada é muito fraca (mínimo de 6 caracteres).";
      case "auth/too-many-requests":
        return "Muitas tentativas malsucedidas. Aguarde alguns instantes e tente novamente.";
      case "auth/network-request-failed":
        return "Falha de conexão. Verifique sua conexão com a internet.";
      default:
        return error.message || "Ocorreu um erro ao processar sua solicitação.";
    }
  }
}

// Exporta instância singleton
const authService = new AuthService();
module.exports = authService;
