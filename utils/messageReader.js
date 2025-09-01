// utils/messageReader.js
const fs = require("fs");
const path = require("path");
const db = require("../config/db");
const MessageType = require("../config/messageType");
const Locale = require("../config/locale");

// Cache com TTL (Time To Live)
class MessageCache {
  constructor(ttl = 300000) {
    // 5 minutos por padrão
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

// Instância do cache
const messageCache = new MessageCache();

/**
 * Obtém a configuração de locale do sistema
 * @returns {string} O locale configurado ou 'pt-BR' como padrão
 */
function getConfigLocale() {
  try {
    const configPath = path.join(__dirname, "../data/config.json");
    const configRaw = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(configRaw);
    return config.locale || Locale.PT_BR;
  } catch (error) {
    console.error("Erro ao ler configuração de locale:", error);
    return Locale.PT_BR;
  }
}

/**
 * Busca uma mensagem do banco de dados com fallback
 * @param {string} messageType - Tipo da mensagem (usar MessageType)
 * @param {string} locale - Locale desejado
 * @returns {Promise<string|null>} Conteúdo da mensagem ou null se não encontrada
 */
async function fetchMessageFromDB(messageType, locale) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT message_content 
                 FROM messages 
                 WHERE message_type = ? AND locale = ? 
                 ORDER BY created_at DESC LIMIT 1`;

    db.get(sql, [messageType, locale], (err, row) => {
      if (err) {
        return reject(err);
      }
      resolve(row ? row.message_content : null);
    });
  });
}

/**
 * Processa variáveis na mensagem de forma segura
 * @param {string} template - Template da mensagem com variáveis
 * @param {object} variables - Objeto com as variáveis a serem substituídas
 * @returns {string} Mensagem processada
 */
function processVariables(template, variables = {}) {
  if (!template || typeof template !== "string") {
    return template;
  }

  // Escapa caracteres especiais nas variáveis para prevenir injeções
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

  // Substitui variáveis no formato {{variavel}}
  return template.replace(/\{\{(\w+)\}\}/g, (match, variableName) => {
    if (variables.hasOwnProperty(variableName)) {
      return escapeVariable(variables[variableName]);
    }
    // Mantém a variável original se não for encontrada
    return match;
  });
}

/**
 * Obtém uma mensagem do sistema com cache e fallback
 * @param {string} messageType - Tipo da mensagem (usar MessageType)
 * @param {object} variables - Variáveis para substituição (opcional)
 * @param {string} customLocale - Locale específico (opcional, usa config se não informado)
 * @returns {Promise<string>} Mensagem processada
 */
async function getMessage(messageType, variables = {}, customLocale = null) {
  try {
    const locale = customLocale || getConfigLocale();
    const cacheKey = `${messageType}_${locale}`;

    // Verifica cache primeiro
    let messageTemplate = messageCache.get(cacheKey);

    if (!messageTemplate) {
      // Busca no banco de dados
      messageTemplate = await fetchMessageFromDB(messageType, locale);

      // Se não encontrou no locale solicitado, tenta fallback para pt-BR
      if (!messageTemplate && locale !== Locale.PT_BR) {
        console.warn(
          `Mensagem '${messageType}' não encontrada para locale '${locale}', tentando fallback para pt-BR`
        );
        messageTemplate = await fetchMessageFromDB(messageType, Locale.PT_BR);

        if (messageTemplate) {
          // Armazena no cache com o locale original para evitar buscas desnecessárias
          messageCache.set(cacheKey, messageTemplate);
        }
      }

      // Se ainda não encontrou, retorna erro
      if (!messageTemplate) {
        throw new Error(
          `Mensagem do tipo '${messageType}' não encontrada para locale '${locale}' nem para fallback pt-BR`
        );
      }

      // Armazena no cache
      if (!messageCache.get(cacheKey)) {
        messageCache.set(cacheKey, messageTemplate);
      }
    }

    // Processa variáveis e retorna
    return processVariables(messageTemplate, variables);
  } catch (error) {
    console.error(`Erro ao obter mensagem '${messageType}':`, error);
    return `[ERRO: Mensagem '${messageType}' não configurada]`;
  }
}

/**
 * Método legado mantido para compatibilidade
 * @deprecated Use getMessage(MessageType.WELCOME, { name }) em vez disso
 */
async function getWelcomeMessage() {
  console.warn(
    "getWelcomeMessage() está deprecated. Use getMessage(MessageType.WELCOME) em vez disso."
  );
  return getMessage(MessageType.WELCOME);
}

/**
 * Método legado mantido para compatibilidade
 * @deprecated Use processVariables() em vez disso
 */
function processarMensagem(template, name) {
  console.warn(
    "processarMensagem() está deprecated. Use processVariables() em vez disso."
  );
  return processVariables(template, { name });
}

/**
 * Limpa o cache de mensagens (útil para testes ou recarregar configurações)
 */
function clearCache() {
  messageCache.clear();
}

/**
 * Verifica se uma mensagem existe para um locale específico
 * @param {string} messageType - Tipo da mensagem
 * @param {string} locale - Locale a verificar
 * @returns {Promise<boolean>} True se a mensagem existe
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

  // Métodos legados (deprecated)
  getWelcomeMessage,
  processarMensagem,
};
