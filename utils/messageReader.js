// utils/messageReader.js
const db = require("../config/db");
const MessageType = require("../config/messageType");
const Locale = require("../config/locale");
const { debug } = require("../services/debugService");
const path = require("path");
const fs = require("fs");
const { DATA_DIR } = require("../utils/initialize"); // Pega caminho da pasta data

// Cache com TTL (Time To Live)
class MessageCache {
  constructor(ttl = 300000) {
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(key, value) {
    const expiry = Date.now() + this.ttl;
    this.cache.set(key, { value, expiry });
    this.cleanup();
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
  }
}

const messageCache = new MessageCache();

/**
 * Busca o locale do sistema no config.json
 * @returns {string} Locale configurado ou 'pt-BR'
 */
function getConfigLocale() {
  try {
    const configPath = path.join(DATA_DIR, "config.json");
    if (!fs.existsSync(configPath)) {
      console.warn("⚠️ config.json não encontrado, usando locale padrão pt-BR");
      return Locale.PT_BR;
    }

    const rawData = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(rawData);
    return config.locale || Locale.PT_BR;
  } catch (error) {
    console.error("Erro ao ler locale do config.json:", error);
    return Locale.PT_BR;
  }
}

/**
 * Busca mensagem no DB
 */
async function fetchMessageFromDB(messageType, locale) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT message_content 
                 FROM messages 
                 WHERE message_type = ? AND locale = ? 
                 ORDER BY created_at DESC LIMIT 1`;

    db.get(sql, [messageType, locale], (err, row) => {
      if (err) return reject(err);
      resolve(row ? row.message_content : null);
    });
  });
}

/**
 * Processa variáveis na mensagem
 */
function processVariables(template, variables = {}) {
  if (!template || typeof template !== "string") return template;

  const escapeVariable = (value) => {
    if (typeof value !== "string") return String(value);
    return value.replace(/[<>&"']/g, (match) => {
      const escapeMap = {
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return escapeMap[match];
    });
  };

  return template.replace(/\{\{(\w+)\}\}/g, (match, variableName) => {
    if (variables.hasOwnProperty(variableName)) {
      return escapeVariable(variables[variableName]);
    }
    return match;
  });
}

/**
 * Busca mensagem dinâmica com fallback
 */
async function getMessage(messageType, variables = {}, customLocale = null) {
  const locale = customLocale || getConfigLocale();
  const cacheKey = `${messageType}_${locale}`;

  try {
    let messageTemplate = messageCache.get(cacheKey);

    if (!messageTemplate) {
      // Busca no banco
      messageTemplate = await fetchMessageFromDB(messageType, locale);

      // Se não encontrou no locale solicitado, tenta fallback pt-BR
      if (!messageTemplate && locale !== Locale.PT_BR) {
        await debug(
          `ℹ️ Mensagem '${messageType}' não encontrada em '${locale}', tentando fallback pt-BR`
        );
        messageTemplate = await fetchMessageFromDB(messageType, Locale.PT_BR);
      }

      if (!messageTemplate) {
        await debug(
          `⚠️ Mensagem '${messageType}' não encontrada em nenhum locale (nem fallback). Sistema usará fallback hardcoded.`
        );
        throw new Error(
          `Mensagem '${messageType}' não encontrada no banco de dados`
        );
      }

      messageCache.set(cacheKey, messageTemplate);
    }

    return processVariables(messageTemplate, variables);
  } catch (error) {
    await debug(`❌ Erro ao obter mensagem '${messageType}': ${error.message}`);
    throw error;
  }
}

/**
 * Limpa o cache de mensagens
 */
function clearCache() {
  messageCache.clear();
}

/**
 * Verifica se existe mensagem para o locale
 */
async function messageExists(messageType, locale = null) {
  try {
    const targetLocale = locale || getConfigLocale();
    const message = await fetchMessageFromDB(messageType, targetLocale);
    return !!message;
  } catch (error) {
    console.error(
      `Erro ao verificar existência da mensagem '${messageType}':`,
      error
    );
    return false;
  }
}

module.exports = {
  getMessage,
  processVariables,
  clearCache,
  messageExists,
  getConfigLocale,
};
