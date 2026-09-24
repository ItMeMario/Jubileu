// services/tunnelWatchdogService.js
// Serviço de Monitoramento Contínuo e Auto-Recuperação do Cloudflare Tunnel (Watchdog & Heartbeat)
// Mitigação da Vulnerabilidade #7 — Oscilação / Queda do Cloudflare Tunnel (untun)

const EventEmitter = require("events");
const axios = require("axios");
const dns = require("dns");

/**
 * Estados da Máquina de Estados do Túnel
 */
const TUNNEL_STATES = {
  INITIALIZING: "INITIALIZING", // Túnel sendo provisionado
  ONLINE: "ONLINE",             // Túnel operando com saúde (200 OK no heartbeat)
  DEGRADED: "DEGRADED",         // 1 falha consecutiva ou latência anormal
  OFFLINE: "OFFLINE",           // 2+ falhas consecutivas ou processo encerrado
  RECONNECTING: "RECONNECTING", // Processo de reconexão automática em andamento
  SUSPENDED: "SUSPENDED",       // Máquina suspensa / hibernando (powerMonitor)
};

// Configurações do Watchdog
const HEARTBEAT_INTERVAL_MS = 30000;      // Verificação a cada 30 segundos
const HEARTBEAT_TIMEOUT_MS = 6000;        // Timeout de resposta de 6 segundos
const MAX_CONSECUTIVE_FAILURES = 2;       // 2 falhas consecutivas acionam reconexão
const BACKOFF_BASE_MS = 3000;             // Base do backoff: 3 segundos
const BACKOFF_MAX_MS = 30000;             // Teto do backoff: 30 segundos
const RESUME_GRACE_DELAY_MS = 3500;       // Janela de espera ao acordar do sleep para DHCP/Wi-Fi estabilizar

class TunnelWatchdogService extends EventEmitter {
  constructor(options = {}) {
    super();

    this.gatewayService = options.gatewayService || null;
    this.heartbeatIntervalMs = options.heartbeatIntervalMs || HEARTBEAT_INTERVAL_MS;
    this.heartbeatTimeoutMs = options.heartbeatTimeoutMs || HEARTBEAT_TIMEOUT_MS;
    this.maxConsecutiveFailures = options.maxConsecutiveFailures || MAX_CONSECUTIVE_FAILURES;

    // Estado operacional
    this._state = TUNNEL_STATES.INITIALIZING;
    this._consecutiveFailures = 0;
    this._consecutiveReconnects = 0;
    this._totalReconnects = 0;
    this._lastHeartbeatTime = null;
    this._lastLatencyMs = 0;
    this._startTime = Date.now();
    this._isReconnecting = false;
    this._isPaused = false;

    // Timers
    this._heartbeatTimer = null;
    this._reconnectTimer = null;
    this._resumeTimer = null;
  }

  /**
   * Vincula ou atualiza a referência do CloudGatewayService
   * @param {object} gatewayService
   */
  setGatewayService(gatewayService) {
    this.gatewayService = gatewayService;
  }

  /**
   * Obtém o estado atual
   * @returns {string}
   */
  getState() {
    return this._state;
  }

  /**
   * Verifica se o túnel está online e saudável
   * @returns {boolean}
   */
  isHealthy() {
    return this._state === TUNNEL_STATES.ONLINE;
  }

  /**
   * Altera o estado emitindo evento de notificação caso haja mudança
   * @private
   * @param {string} newState
   * @param {object} [metadata={}]
   */
  _setState(newState, metadata = {}) {
    const oldState = this._state;
    if (oldState !== newState) {
      this._state = newState;
      console.log(`📡 [TunnelWatchdog] Estado alterado: ${oldState} ➔ ${newState}`);
      this.emit("status-changed", {
        oldState,
        newState,
        status: newState.toLowerCase(),
        timestamp: Date.now(),
        ...this.getStatus(),
        ...metadata,
      });
    }
  }

  /**
   * Inicia a rotina contínua de Watchdog / Heartbeat
   */
  start() {
    if (this._heartbeatTimer) return;

    this._startTime = Date.now();
    this._isPaused = false;
    this._consecutiveFailures = 0;

    console.log(`⏱️ [TunnelWatchdog] Serviço iniciado. Auditoria a cada ${this.heartbeatIntervalMs / 1000}s.`);

    // Executa primeira checagem com pequeno delay para permitir estabilização inicial do túnel
    this._heartbeatTimer = setInterval(() => {
      this.executeHeartbeat();
    }, this.heartbeatIntervalMs);

    if (this._heartbeatTimer.unref) {
      this._heartbeatTimer.unref();
    }
  }

  /**
   * Interrompe o Watchdog
   */
  stop() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    if (this._resumeTimer) {
      clearTimeout(this._resumeTimer);
      this._resumeTimer = null;
    }
    this._isReconnecting = false;
    console.log("⏹️ [TunnelWatchdog] Serviço encerrado.");
  }

  /**
   * Testa a conectividade externa com a internet antes de disparar processos
   * @private
   * @returns {Promise<boolean>}
   */
  async _checkInternetConnectivity() {
    return new Promise((resolve) => {
      dns.lookup("cloudflare.com", (err) => {
        if (!err) {
          resolve(true);
        } else {
          // Fallback para DNS alternativo (Google)
          dns.lookup("google.com", (err2) => {
            resolve(!err2);
          });
        }
      });
    });
  }

  /**
   * Executa uma rodada completa de Heartbeat
   * @returns {Promise<object>}
   */
  async executeHeartbeat() {
    if (this._isPaused || this._isReconnecting) {
      return { skipped: true, state: this._state };
    }

    if (!this.gatewayService || !this.gatewayService.isRunning) {
      this._setState(TUNNEL_STATES.OFFLINE, { reason: "gateway_stopped" });
      return { healthy: false, error: "Gateway não está em execução" };
    }

    const publicUrl = this.gatewayService.publicUrl;
    const verifyToken = this.gatewayService.verifyToken;
    const port = this.gatewayService.port;

    if (!publicUrl) {
      this._setState(TUNNEL_STATES.INITIALIZING, { reason: "no_public_url" });
      return { healthy: false, error: "URL pública não definida" };
    }

    const startTime = Date.now();
    let localOk = false;
    let publicOk = false;
    let errorMessage = null;

    try {
      // 1. Auditoria Local (garante que o processo HTTP interno está respondendo)
      const localCheckUrl = `http://127.0.0.1:${port}/webhook?hub.challenge=ping`;
      const localRes = await axios.get(localCheckUrl, { timeout: 2500 });
      localOk = localRes.data === "ping";
    } catch (err) {
      localOk = false;
      errorMessage = `Falha no servidor local (porta ${port}): ${err.message}`;
    }

    // 2. Auditoria Externa através do túnel Cloudflare
    if (localOk) {
      try {
        const pingUrl = `${publicUrl}?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=ping`;
        const pubRes = await axios.get(pingUrl, { timeout: this.heartbeatTimeoutMs });
        publicOk = pubRes.data === "ping";
      } catch (err) {
        publicOk = false;
        errorMessage = `Falha no túnel externo Cloudflare: ${err.message}`;
      }
    }

    this._lastLatencyMs = Date.now() - startTime;
    this._lastHeartbeatTime = Date.now();

    if (localOk && publicOk) {
      // Conexão 100% íntegra
      this._consecutiveFailures = 0;
      this._consecutiveReconnects = 0;
      this._setState(TUNNEL_STATES.ONLINE, { latencyMs: this._lastLatencyMs });
      this.emit("heartbeat", {
        healthy: true,
        latencyMs: this._lastLatencyMs,
        timestamp: this._lastHeartbeatTime,
      });

      return { healthy: true, latencyMs: this._lastLatencyMs };
    } else {
      // Falha detectada
      this._consecutiveFailures++;
      console.warn(
        `⚠️ [TunnelWatchdog] Falha no Heartbeat (${this._consecutiveFailures}/${this.maxConsecutiveFailures}): ${errorMessage}`
      );

      if (this._consecutiveFailures >= this.maxConsecutiveFailures) {
        this._setState(TUNNEL_STATES.OFFLINE, { error: errorMessage });
        this.emit("heartbeat", {
          healthy: false,
          consecutiveFailures: this._consecutiveFailures,
          error: errorMessage,
        });

        // Dispara auto-recuperação
        this.triggerAutoReconnect(errorMessage);
      } else {
        // Primeira falha transitória: marca como DEGRADED
        this._setState(TUNNEL_STATES.DEGRADED, { error: errorMessage });
        this.emit("heartbeat", {
          healthy: false,
          consecutiveFailures: this._consecutiveFailures,
          error: errorMessage,
        });
      }

      return { healthy: false, error: errorMessage, consecutiveFailures: this._consecutiveFailures };
    }
  }

  /**
   * Aciona a reconexão automática com backoff exponencial e jitter
   * @param {string} [reason="heartbeat_failure"]
   */
  async triggerAutoReconnect(reason = "heartbeat_failure") {
    if (this._isReconnecting || this._isPaused) return;

    this._isReconnecting = true;
    this._setState(TUNNEL_STATES.RECONNECTING, { reason });
    this._consecutiveReconnects++;
    this._totalReconnects++;

    // Cálculo de Backoff Exponencial com Jitter (Anti-Thundering Herd)
    const exponentialMultiplier = Math.pow(2, Math.min(this._consecutiveReconnects - 1, 4));
    const rawDelay = BACKOFF_BASE_MS * exponentialMultiplier;
    const jitter = Math.floor(Math.random() * 1500);
    const delayMs = Math.min(rawDelay + jitter, BACKOFF_MAX_MS);

    console.log(
      `🔄 [TunnelWatchdog] Tentativa de auto-recuperação #${this._consecutiveReconnects} agendada para ${delayMs}ms...`
    );

    this.emit("reconnecting", {
      attempt: this._consecutiveReconnects,
      delayMs,
      reason,
    });

    this._reconnectTimer = setTimeout(async () => {
      await this._performReconnect(reason);
    }, delayMs);
  }

  /**
   * Executa a reinicialização física do túnel
   * @private
   * @param {string} reason
   */
  async _performReconnect(reason) {
    try {
      // 1. Confirma se a máquina possui conexão à internet antes de chamar o untun
      const hasInternet = await this._checkInternetConnectivity();
      if (!hasInternet) {
        console.warn("⚠️ [TunnelWatchdog] Sem conexão com a internet detectada. Adiantando próximo ciclo de espera.");
        this._isReconnecting = false;
        this.triggerAutoReconnect("no_internet");
        return;
      }

      console.log("⚡ [TunnelWatchdog] Reiniciando túnel Cloudflare via gateway...");
      const oldUrl = this.gatewayService ? this.gatewayService.publicUrl : null;

      if (this.gatewayService && typeof this.gatewayService.restartTunnel === "function") {
        const newUrl = await this.gatewayService.restartTunnel();

        console.log(`✅ [TunnelWatchdog] Túnel restabelecido com sucesso! Nova URL: ${newUrl}`);

        if (oldUrl && newUrl && oldUrl !== newUrl) {
          this.emit("url-changed", { oldUrl, newUrl });
        }

        // Valida imediatamente com um heartbeat
        this._isReconnecting = false;
        const check = await this.executeHeartbeat();

        if (check.healthy) {
          this._consecutiveReconnects = 0;
          this.emit("reconnected", {
            publicUrl: newUrl,
            reconnectAttempts: this._totalReconnects,
          });
        }
      } else {
        throw new Error("GatewayService não possui método restartTunnel()");
      }
    } catch (err) {
      console.error("❌ [TunnelWatchdog] Falha durante auto-reconexão:", err.message);
      this._isReconnecting = false;
      this._setState(TUNNEL_STATES.OFFLINE, { error: err.message });
      // Agenda nova tentativa
      this.triggerAutoReconnect("reconnect_exception");
    }
  }

  /**
   * Força uma reconexão manual instantânea (acionada pelo usuário na interface)
   * @returns {Promise<boolean>}
   */
  async forceReconnect() {
    console.log("👆 [TunnelWatchdog] Reconexão manual solicitada pelo usuário.");
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    this._isReconnecting = false;
    this._consecutiveFailures = this.maxConsecutiveFailures;
    await this._performReconnect("user_manual_request");
    return this.isHealthy();
  }

  /**
   * Hook para quando o sistema operacional entra em suspensão / hibernação (powerMonitor)
   */
  handleSuspend() {
    console.log("🌙 [TunnelWatchdog] Sistema operacional entrando em suspensão. Pausando watchdog...");
    this._isPaused = true;
    this._setState(TUNNEL_STATES.SUSPENDED);
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    this._isReconnecting = false;
  }

  /**
   * Hook para quando o sistema operacional acorda da suspensão (powerMonitor)
   */
  handleResume() {
    console.log(
      `☀️ [TunnelWatchdog] Sistema operacional acordou da suspensão. Aguardando ${RESUME_GRACE_DELAY_MS / 1000}s para estabilização de rede...`
    );
    this._isPaused = false;
    this._setState(TUNNEL_STATES.DEGRADED, { reason: "system_resume" });

    if (this._resumeTimer) {
      clearTimeout(this._resumeTimer);
    }

    this._resumeTimer = setTimeout(async () => {
      console.log("🔍 [TunnelWatchdog] Testando saúde do túnel pós-retorno do sleep...");
      const result = await this.executeHeartbeat();
      if (!result.healthy) {
        console.warn("⚠️ [TunnelWatchdog] Túnel inoperante após suspensão. Disparando reconexão imediata!");
        this.triggerAutoReconnect("resume_recovery");
      } else {
        console.log("✅ [TunnelWatchdog] Túnel permaneceu íntegro após retomada do SO.");
      }
    }, RESUME_GRACE_DELAY_MS);
  }

  /**
   * Retorna telemetria completa para a interface do usuário (IPC)
   * @returns {object}
   */
  getStatus() {
    const publicUrl = this.gatewayService ? this.gatewayService.publicUrl : null;
    const port = this.gatewayService ? this.gatewayService.port : 3000;
    const isRunning = this.gatewayService ? Boolean(this.gatewayService.isRunning) : false;

    return {
      state: this._state,
      status: this._state.toLowerCase(),
      isHealthy: this._state === TUNNEL_STATES.ONLINE,
      publicUrl,
      port,
      isRunning,
      latencyMs: this._lastLatencyMs,
      lastHeartbeat: this._lastHeartbeatTime,
      consecutiveFailures: this._consecutiveFailures,
      totalReconnects: this._totalReconnects,
      isReconnecting: this._isReconnecting,
      uptimeSeconds: Math.floor((Date.now() - this._startTime) / 1000),
    };
  }
}

const tunnelWatchdogService = new TunnelWatchdogService();

module.exports = {
  TUNNEL_STATES,
  TunnelWatchdogService,
  tunnelWatchdogService,
};
