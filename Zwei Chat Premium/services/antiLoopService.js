// services/antiLoopService.js
// Serviço de Proteção Anti-Loop e Mitigação de Guerra de Robôs (Bot vs Bot)

class AntiLoopService {
  constructor(options = {}) {
    // Parâmetros padrão de proteção
    this.windowMs = options.windowMs || 10 * 1000; // Janela de 10 segundos
    this.maxMessagesInWindow = options.maxMessagesInWindow || 3; // Máximo de 3 mensagens na janela (a 4ª ativa o anti-loop)
    this.cooldownMs = options.cooldownMs || 15 * 60 * 1000; // 15 minutos de cooldown
    this.identicalMessageThreshold = options.identicalMessageThreshold || 3; // 3 mensagens idênticas consecutivas ativam proteção
    this.maxConsecutiveFallbacks = options.maxConsecutiveFallbacks || 3; // Limite de 3 fallbacks seguidos de menu

    // Textos padrão de mensagens amigáveis de transbordo
    this.defaultLoopMessage =
      "Identificamos muitas mensagens em sequência. Para sua comodidade e melhor atendimento, pausamos as respostas automáticas e transferimos seu contato para nossa equipe humana.";
    this.defaultFallbackMessage =
      "Não conseguimos identificar sua opção. Para melhor atendê-lo, transferimos seu atendimento para um especialista humano. Por favor, aguarde!";

    // Armazenamento em memória (Maps indexados por telefone normalizado)
    // contactActivity: phone => { timestamps: number[], lastBody: string, identicalCount: number, consecutiveFallbacks: number }
    this.contactActivity = new Map();

    // cooldowns: phone => { cooldownUntil: number, triggeredAt: number, reason: string, messageCount: number, action: string, message: string }
    this.cooldowns = new Map();

    // Intervalo de limpeza automática a cada 5 minutos
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref(); // Não impede o encerramento do processo
    }
  }

  /**
   * Normaliza número de telefone removendo caracteres não numéricos
   * @param {string} phone
   * @returns {string}
   */
  _normalizePhone(phone) {
    if (!phone) return "";
    return String(phone).replace(/\D/g, "");
  }

  /**
   * Obtém ou inicializa o registro de atividade de um contato
   * @private
   */
  _getActivity(phone) {
    let activity = this.contactActivity.get(phone);
    if (!activity) {
      activity = {
        timestamps: [],
        lastBody: null,
        identicalCount: 0,
        consecutiveFallbacks: 0,
      };
      this.contactActivity.set(phone, activity);
    }
    return activity;
  }

  /**
   * Resolve as opções de anti-loop a partir da configuração do fluxo ativo ou dos padrões
   * @private
   */
  _resolveConfig(flowConfig = null) {
    const cfg = flowConfig?.antiLoopConfig || flowConfig || {};
    return {
      enabled: cfg.enabled !== false, // Habilitado por padrão
      action: cfg.action === "silent_pause" ? "silent_pause" : "notify_and_pause",
      message: cfg.message && String(cfg.message).trim().length > 0 ? cfg.message : this.defaultLoopMessage,
      fallbackAction: cfg.fallbackAction === "silent_pause" ? "silent_pause" : "notify_and_pause",
      fallbackMessage:
        cfg.fallbackMessage && String(cfg.fallbackMessage).trim().length > 0
          ? cfg.fallbackMessage
          : this.defaultFallbackMessage,
      maxFallbacks: Number.isInteger(cfg.maxFallbacks) && cfg.maxFallbacks > 0 ? cfg.maxFallbacks : this.maxConsecutiveFallbacks,
    };
  }

  /**
   * Verifica se o contato está sob cooldown ativo e registra o recebimento de nova mensagem
   * @param {string} rawPhone - Número de telefone do remetente
   * @param {string} messageBody - Conteúdo da mensagem recebida
   * @param {object|null} flowConfig - Configurações do fluxo ativo (opcional)
   * @returns {{
   *   allowed: boolean,
   *   inCooldown: boolean,
   *   triggeredNow?: boolean,
   *   reason?: string,
   *   remainingMs?: number,
   *   action?: "notify_and_pause"|"silent_pause",
   *   message?: string
   * }}
   */
  checkAndRecordInbound(rawPhone, messageBody = "", flowConfig = null) {
    const phone = this._normalizePhone(rawPhone);
    if (!phone) {
      return { allowed: false, inCooldown: false, reason: "INVALID_PHONE" };
    }

    const now = Date.now();
    const config = this._resolveConfig(flowConfig);

    // Se a proteção estiver explicitamente desligada no fluxo
    if (!config.enabled) {
      return { allowed: true, inCooldown: false };
    }

    // 1. Verifica se já está em Cooldown ativo
    const activeCooldown = this.cooldowns.get(phone);
    if (activeCooldown) {
      if (now < activeCooldown.cooldownUntil) {
        const remainingMs = activeCooldown.cooldownUntil - now;
        return {
          allowed: false,
          inCooldown: true,
          triggeredNow: false,
          remainingMs,
          reason: activeCooldown.reason,
          action: activeCooldown.action,
        };
      } else {
        // Cooldown expirado, remove e libera o contato
        this.cooldowns.delete(phone);
      }
    }

    const activity = this._getActivity(phone);

    // 2. Limpa timestamps fora da janela deslizante (Sliding Window)
    activity.timestamps = activity.timestamps.filter((ts) => now - ts < this.windowMs);

    // Adiciona timestamp da mensagem atual
    activity.timestamps.push(now);

    // 3. Avalia repetição de mensagem idêntica consecutiva
    const normalizedBody = String(messageBody || "").trim().toLowerCase();
    if (normalizedBody.length > 0) {
      if (activity.lastBody && activity.lastBody === normalizedBody) {
        activity.identicalCount += 1;
      } else {
        activity.lastBody = normalizedBody;
        activity.identicalCount = 1;
      }

      if (activity.identicalCount >= this.identicalMessageThreshold) {
        // Disparo por repetição de mensagem idêntica (robô de resposta automática em loop)
        const cooldownData = {
          cooldownUntil: now + this.cooldownMs,
          triggeredAt: now,
          reason: "IDENTICAL_MESSAGE_LOOP",
          messageCount: activity.identicalCount,
          action: config.action,
          message: config.message,
        };
        this.cooldowns.set(phone, cooldownData);
        activity.timestamps = []; // Reseta histórico

        return {
          allowed: false,
          inCooldown: true,
          triggeredNow: true,
          remainingMs: this.cooldownMs,
          reason: "IDENTICAL_MESSAGE_LOOP",
          action: config.action,
          message: config.message,
        };
      }
    }

    // 4. Avalia taxa de mensagens na janela (Sliding Window Rate Limit)
    if (activity.timestamps.length > this.maxMessagesInWindow) {
      // Disparo por alta frequência (> 3 mensagens em menos de 10s)
      const cooldownData = {
        cooldownUntil: now + this.cooldownMs,
        triggeredAt: now,
        reason: "HIGH_FREQUENCY_RATE_LIMIT",
        messageCount: activity.timestamps.length,
        action: config.action,
        message: config.message,
      };
      this.cooldowns.set(phone, cooldownData);
      activity.timestamps = []; // Reseta histórico

      return {
        allowed: false,
        inCooldown: true,
        triggeredNow: true,
        remainingMs: this.cooldownMs,
        reason: "HIGH_FREQUENCY_RATE_LIMIT",
        action: config.action,
        message: config.message,
      };
    }

    // Passou por todas as defesas com sucesso
    return { allowed: true, inCooldown: false };
  }

  /**
   * Registra uma tentativa de resposta não reconhecida (fallback de menu)
   * Impede que o bot fique reenviando opções eternamente para outro robô
   * @param {string} rawPhone
   * @param {object|null} flowConfig
   * @returns {{
   *   triggered: boolean,
   *   count: number,
   *   maxReached: boolean,
   *   action?: "notify_and_pause"|"silent_pause",
   *   message?: string
   * }}
   */
  recordFallback(rawPhone, flowConfig = null) {
    const phone = this._normalizePhone(rawPhone);
    if (!phone) return { triggered: false, count: 0, maxReached: false };

    const config = this._resolveConfig(flowConfig);
    const activity = this._getActivity(phone);
    activity.consecutiveFallbacks = (activity.consecutiveFallbacks || 0) + 1;

    if (activity.consecutiveFallbacks >= config.maxFallbacks) {
      const now = Date.now();
      const cooldownData = {
        cooldownUntil: now + this.cooldownMs,
        triggeredAt: now,
        reason: "EXCESSIVE_CONSECUTIVE_FALLBACKS",
        messageCount: activity.consecutiveFallbacks,
        action: config.fallbackAction,
        message: config.fallbackMessage,
      };
      this.cooldowns.set(phone, cooldownData);
      activity.consecutiveFallbacks = 0; // Reseta contador após acionar

      return {
        triggered: true,
        maxReached: true,
        count: config.maxFallbacks,
        action: config.fallbackAction,
        message: config.fallbackMessage,
        reason: "EXCESSIVE_CONSECUTIVE_FALLBACKS",
        remainingMs: this.cooldownMs,
      };
    }

    return {
      triggered: false,
      maxReached: false,
      count: activity.consecutiveFallbacks,
    };
  }

  /**
   * Zera a contagem de fallbacks e de repetições após uma seleção/interação válida
   * @param {string} rawPhone
   */
  resetFallback(rawPhone) {
    const phone = this._normalizePhone(rawPhone);
    if (!phone) return;

    const activity = this.contactActivity.get(phone);
    if (activity) {
      activity.consecutiveFallbacks = 0;
      activity.identicalCount = 0;
    }
  }

  /**
   * Verifica se o contato está sob cooldown de proteção
   * @param {string} rawPhone
   * @returns {boolean}
   */
  isUnderCooldown(rawPhone) {
    const phone = this._normalizePhone(rawPhone);
    const cd = this.cooldowns.get(phone);
    if (!cd) return false;

    if (Date.now() < cd.cooldownUntil) {
      return true;
    }

    // Expirou
    this.cooldowns.delete(phone);
    return false;
  }

  /**
   * Retorna o tempo restante de cooldown em milissegundos
   * @param {string} rawPhone
   * @returns {number} 0 se não estiver em cooldown
   */
  getCooldownRemaining(rawPhone) {
    const phone = this._normalizePhone(rawPhone);
    const cd = this.cooldowns.get(phone);
    if (!cd) return 0;

    const remaining = cd.cooldownUntil - Date.now();
    if (remaining > 0) return remaining;

    this.cooldowns.delete(phone);
    return 0;
  }

  /**
   * Retorna informações detalhadas do cooldown de um contato
   * @param {string} rawPhone
   * @returns {object|null}
   */
  getCooldownInfo(rawPhone) {
    const phone = this._normalizePhone(rawPhone);
    const cd = this.cooldowns.get(phone);
    if (!cd) return null;

    const remainingMs = cd.cooldownUntil - Date.now();
    if (remainingMs <= 0) {
      this.cooldowns.delete(phone);
      return null;
    }

    return {
      phone,
      inCooldown: true,
      remainingMs,
      triggeredAt: cd.triggeredAt,
      cooldownUntil: cd.cooldownUntil,
      reason: cd.reason,
      action: cd.action,
      message: cd.message,
    };
  }

  /**
   * Retorna a lista de todos os contatos atualmente sob proteção anti-loop
   * @returns {Array<object>}
   */
  getAllActiveCooldowns() {
    const now = Date.now();
    const active = [];

    for (const [phone, cd] of this.cooldowns.entries()) {
      if (now < cd.cooldownUntil) {
        active.push({
          phone,
          remainingMs: cd.cooldownUntil - now,
          remainingMinutes: Math.ceil((cd.cooldownUntil - now) / 60000),
          triggeredAt: cd.triggeredAt,
          cooldownUntil: cd.cooldownUntil,
          reason: cd.reason,
          action: cd.action,
        });
      } else {
        this.cooldowns.delete(phone);
      }
    }

    return active;
  }

  /**
   * Libera manualmente o cooldown de um número (ação de operador humano)
   * @param {string} rawPhone
   * @returns {boolean}
   */
  releaseCooldown(rawPhone) {
    const phone = this._normalizePhone(rawPhone);
    const hadCooldown = this.cooldowns.delete(phone);
    this.contactActivity.delete(phone);
    return hadCooldown;
  }

  /**
   * Limpa todos os estados (útil para testes unitários e resets do sistema)
   */
  clearAll() {
    this.cooldowns.clear();
    this.contactActivity.clear();
  }

  /**
   * Rotina de limpeza periódica de registros antigos para evitar vazamentos de memória
   */
  cleanup() {
    const now = Date.now();

    // 1. Limpa cooldowns expirados
    for (const [phone, cd] of this.cooldowns.entries()) {
      if (now >= cd.cooldownUntil) {
        this.cooldowns.delete(phone);
      }
    }

    // 2. Limpa atividades sem interações recentes (> 1 hora)
    for (const [phone, activity] of this.contactActivity.entries()) {
      activity.timestamps = activity.timestamps.filter((ts) => now - ts < this.windowMs);
      if (activity.timestamps.length === 0 && activity.consecutiveFallbacks === 0) {
        this.contactActivity.delete(phone);
      }
    }
  }
}

// Instância Singleton
const antiLoopService = new AntiLoopService();

module.exports = {
  AntiLoopService,
  antiLoopService,
};
