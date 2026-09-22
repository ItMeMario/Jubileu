// services/rateLimiterService.js
// Serviço de Controle de Vazão e Proteção contra Rate Limit da Meta WhatsApp Cloud API
// Vulnerabilidade #5 — Bloqueio por Excesso de Requisições (Rate Limit no Broadcast)

const EventEmitter = require("events");

/**
 * Perfis de taxa por tier da conta na Meta WhatsApp Business API.
 * Contas novas iniciam em TIER_1K e migram automaticamente conforme amadurecem.
 * Contas maduras (TIER_100K, TIER_UNLIMITED) operam com throttle mínimo ou desativado.
 *
 * Cada perfil define:
 *   - maxRps: Taxa máxima de requisições por segundo (messages per second)
 *   - burstCapacity: Capacidade máxima do bucket para picos curtos
 *   - throttleEnabled: Se o throttle ativo está habilitado
 *   - label: Nome amigável para logs e UI
 */
const TIER_PROFILES = {
  TIER_50: {
    maxRps: 8,
    burstCapacity: 12,
    throttleEnabled: true,
    label: "Tier 50 (Conta Inicial)",
  },
  TIER_1K: {
    maxRps: 15,
    burstCapacity: 25,
    throttleEnabled: true,
    label: "Tier 1K (Conta Nova)",
  },
  TIER_10K: {
    maxRps: 50,
    burstCapacity: 80,
    throttleEnabled: true,
    label: "Tier 10K (Conta Intermediária)",
  },
  TIER_100K: {
    maxRps: 80,
    burstCapacity: 120,
    throttleEnabled: false,
    label: "Tier 100K (Conta Madura)",
  },
  TIER_UNLIMITED: {
    maxRps: Infinity,
    burstCapacity: Infinity,
    throttleEnabled: false,
    label: "Tier Ilimitado (Conta Graduada)",
  },
};

// Perfil padrão para tiers desconhecidos ou não mapeados
const DEFAULT_TIER = "TIER_1K";

// Configurações do backoff exponencial
const BACKOFF_BASE_MS = 2000;       // Base: 2 segundos
const BACKOFF_MAX_MS = 60000;       // Teto: 60 segundos
const BACKOFF_MAX_RETRIES = 5;      // Máximo de retries consecutivos antes de pausar

// Intervalo de re-consulta automática do tier da conta (30 minutos)
const TIER_REFRESH_INTERVAL_MS = 30 * 60 * 1000;

class RateLimiterService extends EventEmitter {
  constructor() {
    super();

    // Estado do Token Bucket
    this._currentTier = DEFAULT_TIER;
    this._tokens = TIER_PROFILES[DEFAULT_TIER].burstCapacity;
    this._lastRefillTime = Date.now();

    // Estado do Backoff
    this._consecutiveRateLimitHits = 0;
    this._isInBackoff = false;
    this._backoffUntil = 0;

    // Referência para o intervalo de refill (high-precision timer)
    this._refillInterval = setInterval(() => this._refillTokens(), 200);
    if (this._refillInterval.unref) {
      this._refillInterval.unref();
    }

    // Referência para a re-consulta periódica do tier
    this._tierRefreshInterval = null;
    this._tierRefreshCallback = null;
  }

  // ─────────────────────────────────────────────────────────────
  // SEÇÃO 1: Token Bucket Algorithm
  // ─────────────────────────────────────────────────────────────

  /**
   * Retorna o tier atual da conta
   * @returns {string}
   */
  getCurrentTier() {
    return this._currentTier;
  }

  get currentTier() {
    return this._currentTier;
  }

  /**
   * Retorna se o throttling está ativo para o tier atual
   * @returns {boolean}
   */
  isThrottleEnabled() {
    return this.getProfile().throttleEnabled;
  }

  /**
   * Obtém o perfil ativo com base no tier atual da conta
   * @returns {object} Perfil de tier com maxRps, burstCapacity, throttleEnabled, label
   */
  getProfile() {
    return TIER_PROFILES[this._currentTier] || TIER_PROFILES[DEFAULT_TIER];
  }

  /**
   * Reabastece os tokens do bucket com base no tempo decorrido desde o último refill.
   * Chamado automaticamente a cada 200ms pelo intervalo interno.
   * @private
   */
  _refillTokens() {
    const profile = this.getProfile();

    // Contas com throttle desativado mantêm bucket cheio (ilimitado)
    if (!profile.throttleEnabled) {
      this._tokens = profile.burstCapacity;
      this._lastRefillTime = Date.now();
      return;
    }

    const now = Date.now();
    const elapsedMs = now - this._lastRefillTime;
    const tokensToAdd = (elapsedMs / 1000) * profile.maxRps;

    this._tokens = Math.min(this._tokens + tokensToAdd, profile.burstCapacity);
    this._lastRefillTime = now;
  }

  /**
   * Aguarda até que um token esteja disponível no bucket para enviar uma requisição.
   * Se o throttle estiver desativado para o tier atual, retorna imediatamente.
   * Se estiver em backoff ativo, aguarda o término do backoff antes de liberar.
   *
   * @returns {Promise<{ waited: boolean, waitedMs: number, tier: string }>}
   */
  async acquireToken() {
    const profile = this.getProfile();

    // Contas maduras: sem throttle ativo, liberação imediata
    if (!profile.throttleEnabled) {
      return { waited: false, waitedMs: 0, tier: this._currentTier };
    }

    // Se está em período de backoff, aguardar o backoff finalizar primeiro
    if (this._isInBackoff && Date.now() < this._backoffUntil) {
      const waitMs = this._backoffUntil - Date.now();
      if (waitMs > 0) {
        this.emit("ratelimit:backoff-waiting", {
          waitMs,
          tier: this._currentTier,
          consecutiveHits: this._consecutiveRateLimitHits,
        });
        await this._sleep(waitMs);
      }
    }

    // Aguarda token disponível no bucket
    const startWait = Date.now();
    while (this._tokens < 1) {
      // Calcula tempo estimado para o próximo token
      const waitForToken = Math.max(Math.ceil(1000 / profile.maxRps), 50);
      await this._sleep(waitForToken);
      this._refillTokens();
    }

    // Consome o token
    this._tokens -= 1;
    const totalWait = Date.now() - startWait;

    if (totalWait > 100) {
      this.emit("ratelimit:throttled", {
        waitedMs: totalWait,
        tier: this._currentTier,
        tokensRemaining: Math.floor(this._tokens),
        label: profile.label,
      });
    }

    return { waited: totalWait > 100, waitedMs: totalWait, tier: this._currentTier };
  }

  // ─────────────────────────────────────────────────────────────
  // SEÇÃO 2: Backoff Exponencial com Jitter
  // ─────────────────────────────────────────────────────────────

  /**
   * Chamado quando a Meta retorna erro 130429 (Rate Limit Hit).
   * Ativa backoff exponencial com jitter aleatório.
   *
   * @returns {{ shouldRetry: boolean, delayMs: number, attempt: number }}
   */
  handleRateLimitHit() {
    this._consecutiveRateLimitHits++;
    const attempt = this._consecutiveRateLimitHits;

    // Se excedeu o máximo de retries, sinaliza para NÃO retentar
    if (attempt > BACKOFF_MAX_RETRIES) {
      this.emit("ratelimit:max-retries-exceeded", {
        attempts: attempt,
        tier: this._currentTier,
      });
      return { shouldRetry: false, delayMs: 0, attempt };
    }

    // Calcula delay exponencial com jitter: base * 2^(attempt-1) + random jitter
    const exponentialDelay = BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
    const jitter = Math.floor(Math.random() * BACKOFF_BASE_MS);
    const delayMs = Math.min(exponentialDelay + jitter, BACKOFF_MAX_MS);

    // Ativa estado de backoff
    this._isInBackoff = true;
    this._backoffUntil = Date.now() + delayMs;

    this.emit("ratelimit:backoff-activated", {
      attempt,
      delayMs,
      tier: this._currentTier,
      backoffUntil: this._backoffUntil,
    });

    return { shouldRetry: true, delayMs, attempt };
  }

  /**
   * Reseta o contador de backoff após um envio bem-sucedido.
   * Deve ser chamado após cada resposta positiva da Meta API.
   */
  resetBackoff() {
    if (this._consecutiveRateLimitHits > 0 || this._isInBackoff) {
      this._consecutiveRateLimitHits = 0;
      this._isInBackoff = false;
      this._backoffUntil = 0;
      this.emit("ratelimit:backoff-cleared", { tier: this._currentTier });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SEÇÃO 3: Gerenciamento de Tier e Auto-Graduação
  // ─────────────────────────────────────────────────────────────

  /**
   * Atualiza o tier da conta e ajusta os limites do rate limiter.
   * Chamado pelo MetaAccountService após verificar a saúde da conta.
   *
   * Se o tier mudou, emite evento de graduação/degradação para o frontend.
   *
   * @param {string} newTier - Tier retornado pela Meta API (ex: 'TIER_1K', 'TIER_10K')
   */
  updateTier(newTier) {
    const normalizedTier = this._normalizeTierName(newTier);
    const previousTier = this._currentTier;

    if (normalizedTier === previousTier) {
      return; // Sem mudança
    }

    const previousProfile = this.getProfile();
    this._currentTier = normalizedTier;
    const newProfile = this.getProfile();

    // Ajusta tokens do bucket para o novo perfil
    this._tokens = Math.min(this._tokens, newProfile.burstCapacity);
    if (this._tokens < newProfile.burstCapacity * 0.5) {
      // Garante pelo menos 50% de tokens ao mudar de tier
      this._tokens = Math.floor(newProfile.burstCapacity * 0.5);
    }

    const isUpgrade = this._getTierOrder(normalizedTier) > this._getTierOrder(previousTier);

    this.emit("ratelimit:tier-changed", {
      previousTier,
      newTier: normalizedTier,
      previousLabel: previousProfile.label,
      newLabel: newProfile.label,
      isUpgrade,
      throttleEnabled: newProfile.throttleEnabled,
    });

    if (isUpgrade) {
      console.log(
        `🎉 [RATE LIMITER] Conta graduada: ${previousProfile.label} → ${newProfile.label}. ` +
        `Novo limite: ${newProfile.maxRps === Infinity ? "Ilimitado" : `${newProfile.maxRps} msg/s`}. ` +
        `Throttle: ${newProfile.throttleEnabled ? "Ativo" : "Desativado"}.`
      );

      // Reseta backoff ao subir de tier (limites mais altos = menos chance de rate limit)
      this.resetBackoff();

      this.emit("ratelimit:tier-upgraded", {
        previousTier,
        newTier: normalizedTier,
        newLabel: newProfile.label,
        throttleDisabled: !newProfile.throttleEnabled,
      });
    } else {
      console.warn(
        `⚠️ [RATE LIMITER] Tier da conta rebaixado: ${previousProfile.label} → ${newProfile.label}. ` +
        `Limites restringidos para proteção.`
      );
    }
  }

  /**
   * Normaliza o nome do tier retornado pela Meta para o formato interno.
   * A Meta pode retornar formatos variados como 'TIER_1K', 'tier_1k', '1K', etc.
   * @private
   * @param {string} tierName
   * @returns {string} Tier normalizado (ex: 'TIER_1K')
   */
  _normalizeTierName(tierName) {
    if (!tierName || typeof tierName !== "string") {
      return DEFAULT_TIER;
    }

    const upper = tierName.toUpperCase().trim();

    // Busca direta no mapa de perfis
    if (TIER_PROFILES[upper]) {
      return upper;
    }

    // Normalização de formatos alternativos
    if (upper.includes("UNLIMITED") || upper.includes("ILIMITADO")) return "TIER_UNLIMITED";
    if (upper.includes("100K") || upper.includes("100000")) return "TIER_100K";
    if (upper.includes("10K") || upper.includes("10000")) return "TIER_10K";
    if (upper.includes("1K") || upper.includes("1000")) return "TIER_1K";
    if (upper.includes("50") && !upper.includes("100")) return "TIER_50";

    return DEFAULT_TIER;
  }

  /**
   * Retorna a ordem numérica de um tier para comparações de upgrade/downgrade
   * @private
   * @param {string} tier
   * @returns {number}
   */
  _getTierOrder(tier) {
    const order = {
      TIER_50: 1,
      TIER_1K: 2,
      TIER_10K: 3,
      TIER_100K: 4,
      TIER_UNLIMITED: 5,
    };
    return order[tier] || 0;
  }

  // ─────────────────────────────────────────────────────────────
  // SEÇÃO 4: Consulta Periódica do Tier
  // ─────────────────────────────────────────────────────────────

  /**
   * Inicia a re-consulta periódica do tier da conta via callback externo.
   * O callback deve retornar o tier atualizado (string) ou null em caso de falha.
   *
   * @param {Function} fetchTierCallback - Função async que retorna o tier atual da conta
   * @param {number} [intervalMs=1800000] - Intervalo em ms entre consultas (padrão: 30 min)
   */
  startTierAutoRefresh(fetchTierCallback, intervalMs = TIER_REFRESH_INTERVAL_MS) {
    if (typeof fetchTierCallback !== "function") {
      console.warn("⚠️ [RATE LIMITER] Callback de consulta de tier inválido. Auto-refresh desativado.");
      return;
    }

    this.stopTierAutoRefresh();
    this._tierRefreshCallback = fetchTierCallback;

    this._tierRefreshInterval = setInterval(async () => {
      try {
        const newTier = await this._tierRefreshCallback();
        if (newTier) {
          this.updateTier(newTier);
        }
      } catch (err) {
        console.error("❌ [RATE LIMITER] Erro ao consultar tier da conta:", err.message);
      }
    }, intervalMs);

    if (this._tierRefreshInterval.unref) {
      this._tierRefreshInterval.unref();
    }

    console.log(
      `🔄 [RATE LIMITER] Auto-refresh de tier ativado. Intervalo: ${Math.round(intervalMs / 60000)} minutos.`
    );
  }

  /**
   * Para a re-consulta periódica do tier
   */
  stopTierAutoRefresh() {
    if (this._tierRefreshInterval) {
      clearInterval(this._tierRefreshInterval);
      this._tierRefreshInterval = null;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SEÇÃO 5: Status e Diagnóstico
  // ─────────────────────────────────────────────────────────────

  /**
   * Retorna o estado completo do rate limiter para diagnóstico e UI
   * @returns {object}
   */
  getStatus() {
    const profile = this.getProfile();
    return {
      tier: this._currentTier,
      currentTier: this._currentTier,
      label: profile.label,
      maxRps: profile.maxRps === Infinity ? "Ilimitado" : profile.maxRps,
      burstCapacity: profile.burstCapacity === Infinity ? "Ilimitado" : profile.burstCapacity,
      throttleEnabled: profile.throttleEnabled,
      tokensAvailable: profile.burstCapacity === Infinity ? "Ilimitado" : Math.floor(this._tokens),
      availableTokens: profile.burstCapacity === Infinity ? "Ilimitado" : Math.floor(this._tokens),
      isInBackoff: this._isInBackoff,
      backoffUntil: this._isInBackoff ? this._backoffUntil : null,
      backoffRemainingMs: this._isInBackoff ? Math.max(0, this._backoffUntil - Date.now()) : 0,
      consecutiveRateLimitHits: this._consecutiveRateLimitHits,
      autoRefreshActive: !!this._tierRefreshInterval,
    };
  }

  /**
   * Calcula o delay mínimo entre mensagens (piso) baseado no tier atual.
   * Este valor é utilizado pelo broadcast service para garantir que o intervalo
   * configurado pelo usuário nunca fique abaixo do safe rate limit.
   *
   * @returns {number} Delay mínimo em milissegundos (0 para contas sem throttle)
   */
  getMinimumDelayMs() {
    const profile = this.getProfile();
    if (!profile.throttleEnabled || profile.maxRps === Infinity) {
      return 0;
    }
    // Piso: 1000ms / maxRps, com margem de segurança de 20%
    return Math.ceil((1000 / profile.maxRps) * 1.2);
  }

  // ─────────────────────────────────────────────────────────────
  // SEÇÃO 6: Utilitários Internos e Limpeza
  // ─────────────────────────────────────────────────────────────

  /**
   * Promise de sleep utilitária
   * @private
   * @param {number} ms
   * @returns {Promise<void>}
   */
  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Libera todos os intervalos e reseta o estado (para testes e cleanup)
   */
  destroy() {
    if (this._refillInterval) {
      clearInterval(this._refillInterval);
      this._refillInterval = null;
    }
    this.stopTierAutoRefresh();
    this._tokens = 0;
    this._consecutiveRateLimitHits = 0;
    this._isInBackoff = false;
    this._backoffUntil = 0;
    this.removeAllListeners();
  }
}

// Exporta a classe e a instância singleton para uso global
const rateLimiterService = new RateLimiterService();
module.exports = {
  RateLimiterService,
  rateLimiterService,
  TIER_PROFILES,
  DEFAULT_TIER,
  BACKOFF_BASE_MS,
  BACKOFF_MAX_MS,
  BACKOFF_MAX_RETRIES,
};
