// client/metaApiClient.js
// Cliente HTTP Oficial para a Meta WhatsApp Cloud API (Graph API v21.0+)

const axios = require("axios");
const metaConfig = require("../config/metaConfig");
const { rateLimiterService } = require("../services/rateLimiterService");

/**
 * Normaliza número de telefone removendo caracteres especiais e garantindo formato E.164 sem o '+'
 * @param {string} phone
 * @returns {string} Ex: 5511999998888
 */
function normalizePhoneNumber(phone) {
  if (!phone) return "";
  let clean = String(phone).replace(/\D/g, "");
  // Se vier no formato internacional com +, o replace já removeu o +
  return clean;
}

/**
 * Mapeia e traduz códigos de erro frequentes da Meta Graph API para mensagens amigáveis
 * @param {object} errorResponse
 * @returns {string} Mensagem detalhada em português
 */
function parseMetaErrorMessage(errorResponse) {
  const metaError = errorResponse?.data?.error || {};
  const code = metaError.code;
  const subcode = metaError.error_subcode;
  const message = metaError.message || "Erro desconhecido na Meta API";
  // Detalhe legível retornado pela Meta (ex: "Formato do cabeçalho incorreto")
  const userDetail =
    [metaError.error_user_title, metaError.error_user_msg].filter(Boolean).join(": ") ||
    metaError.error_data?.details ||
    "";

  // Erros específicos de Message Templates da Meta
  if (subcode === 2388040 || code === 2388040) {
    return "Já existe um template cadastrado com este nome na sua conta do WhatsApp Business.";
  }
  if (subcode === 2388044 || code === 2388044) {
    return "Formato de componente do template inválido. Verifique cabeçalho, corpo ou botões.";
  }
  if (subcode === 2388045 || code === 2388045) {
    return "O corpo (body) do template é obrigatório e não pode estar vazio.";
  }
  if (subcode === 2388046 || code === 2388046) {
    return "O nome do template deve conter apenas letras minúsculas, números e sublinhados (_).";
  }
  if (subcode === 2388070 || code === 2388070) {
    return "Limite de criação de templates atingido para esta conta (máx. 100 por hora). Aguarde antes de tentar novamente.";
  }
  if (subcode === 2388091 || code === 2388091) {
    return "O número máximo de edições para este template foi atingido no período permitido pela Meta.";
  }

  switch (code) {
    case 131047:
      return "Janela de atendimento de 24 horas expirada. Para iniciar uma conversa com este usuário, utilize um Message Template aprovado pela Meta.";
    case 131026:
      return "Número de telefone destinatário inválido ou não cadastrado no WhatsApp.";
    case 130429:
      return "Limite de taxa de envio de mensagens atingido (Rate limit). Reduza o volume de disparos simultâneos.";
    case 131042:
      return "Problema de elegibilidade da conta comercial ou forma de pagamento pendente no Gerenciador da Meta.";
    case 132000:
      return "O template de mensagem informado não existe ou não foi aprovado para o idioma solicitado.";
    case 132001:
      return "A quantidade ou ordem dos parâmetros fornecidos para o template não corresponde ao cadastrado na Meta.";
    case 100:
      return userDetail
        ? `Parâmetro inválido na requisição da Meta: ${userDetail}`
        : `Parâmetro inválido na requisição da Meta (${message}). Verifique a formatação dos campos e componentes do template.`;
    case 190:
      return "Token de Acesso da Meta expirou ou é inválido. Gere um novo System User Token permanente no Gerenciador de Negócios.";
    default:
      return `[Meta Error ${code}${subcode ? `:${subcode}` : ""}] ${userDetail || message}`;
  }
}

/**
 * Normaliza um texto de template para as regras da Meta, preservando a formatação do WhatsApp
 * (*negrito*, _itálico_, ~tachado~, ```mono```) e emojis.
 * - Remove caracteres invisíveis comuns em textos copiados (zero-width, BOM, marcas de direção)
 * - Converte espaços não separáveis e tabs em espaço comum
 * - Remove espaços no fim de cada linha (linhas "em branco" com espaços viram vazias)
 * - Limita a 1 linha em branco seguida (Meta recusa mais de 2 quebras consecutivas)
 * - Limita a 4 espaços consecutivos (regra da Meta)
 * @param {string} text
 * @param {{ allowNewlines?: boolean }} [opts]
 * @returns {string}
 */
function normalizeTemplateText(text, { allowNewlines = true } = {}) {
  let clean = String(text ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u200B\u200E\u200F\u2060\uFEFF]/g, "") // Mantém U+200D (usado em emojis compostos)
    .replace(/[\u00A0\u202F\t]/g, " ");

  if (!allowNewlines) {
    clean = clean.replace(/\n+/g, " ");
  }

  clean = clean
    .split("\n")
    .map((line) => line.replace(/ +$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ {5,}/g, "    ");

  return clean.trim();
}

/**
 * Retorna uma cópia dos componentes com os textos normalizados para a Meta
 * @param {Array<object>} components
 * @returns {Array<object>}
 */
function sanitizeTemplateComponents(components) {
  if (!Array.isArray(components)) return components;

  return components.map((comp) => {
    if (!comp || typeof comp.text !== "string") return comp;
    const type = String(comp.type || "").toUpperCase();

    if (type === "BODY") {
      const text = normalizeTemplateText(comp.text, { allowNewlines: true });
      const varCount = new Set(text.match(/\{\{\d+\}\}/g) || []).size;
      const next = { ...comp, text };
      // A Meta exige valores de exemplo quando o corpo possui variáveis {{n}}
      if (varCount > 0 && !comp.example) {
        next.example = { body_text: [Array.from({ length: varCount }, (_, i) => `exemplo${i + 1}`)] };
      }
      return next;
    }
    if (type === "HEADER" || type === "FOOTER") {
      const text = normalizeTemplateText(comp.text, { allowNewlines: false });
      const next = { ...comp, text };
      if (type === "HEADER" && /\{\{1\}\}/.test(text) && !comp.example) {
        next.example = { header_text: ["exemplo"] };
      }
      return next;
    }
    return comp;
  });
}

/**
 * Valida as regras de conteúdo dos componentes (cabeçalho, corpo, rodapé)
 * @param {Array<object>} components
 * @returns {{ valid: boolean, error?: string }}
 */
function validateTemplateComponents(components) {
  const find = (t) => components.find((c) => c && String(c.type || "").toUpperCase() === t);
  const header = find("HEADER");
  const body = find("BODY");
  const footer = find("FOOTER");

  if (header && String(header.format || "").toUpperCase() === "TEXT") {
    const headerText = String(header.text || "");
    if (headerText.length > 60) {
      return { valid: false, error: "O cabeçalho (Header) não pode exceder 60 caracteres." };
    }
    if (/[*_~`]/.test(headerText) || /\p{Extended_Pictographic}/u.test(headerText)) {
      return {
        valid: false,
        error:
          "A Meta não permite emojis nem formatação (*negrito*, _itálico_, ~tachado~) no CABEÇALHO. Use a formatação apenas no Corpo da mensagem.",
      };
    }
  }

  if (body) {
    const bodyText = String(body.text || "");
    if (bodyText.length > 1024) {
      return { valid: false, error: `O corpo (Body) excede o limite de 1024 caracteres da Meta (${bodyText.length}).` };
    }
    if (/^\{\{\d+\}\}/.test(bodyText) || /\{\{\d+\}\}$/.test(bodyText)) {
      return { valid: false, error: "A Meta não permite que o corpo comece ou termine com uma variável {{n}}." };
    }
  }

  if (footer && String(footer.text || "").length > 60) {
    return { valid: false, error: "O rodapé (Footer) não pode exceder 60 caracteres." };
  }

  return { valid: true };
}

/**
 * Valida a estrutura e regras de conformidade de um Message Template antes do envio à Meta Graph API
 * @param {object} params
 * @param {string} params.name - Nome do template
 * @param {string} params.category - Categoria ('MARKETING' | 'UTILITY' | 'AUTHENTICATION')
 * @param {string} params.language - Código do idioma (ex: 'pt_BR')
 * @param {Array<object>} params.components - Componentes do template
 * @returns {{ valid: boolean, error?: string }}
 */
function validateTemplateDefinition({ name, category, language, components }) {
  if (!name || typeof name !== "string") {
    return { valid: false, error: "Nome do template é obrigatório." };
  }

  const cleanName = name.trim();
  if (!/^[a-z0-9_]+$/.test(cleanName)) {
    return {
      valid: false,
      error: "O nome do template deve conter apenas letras minúsculas (a-z), números (0-9) e sublinhados (_), sem espaços ou caracteres especiais.",
    };
  }

  if (cleanName.length > 512) {
    return { valid: false, error: "O nome do template não pode exceder 512 caracteres." };
  }

  const validCategories = ["MARKETING", "UTILITY", "AUTHENTICATION"];
  const upperCategory = String(category || "").trim().toUpperCase();
  if (!validCategories.includes(upperCategory)) {
    return {
      valid: false,
      error: `Categoria inválida: '${category}'. Escolha entre: ${validCategories.join(", ")}.`,
    };
  }

  if (!language || typeof language !== "string" || !language.trim()) {
    return { valid: false, error: "Código de idioma é obrigatório (ex: pt_BR, en_US)." };
  }

  if (!Array.isArray(components) || components.length === 0) {
    return { valid: false, error: "O template deve conter ao menos um componente (BODY)." };
  }

  const bodyComponent = components.find((c) => c && String(c.type || "").toUpperCase() === "BODY");
  if (!bodyComponent || !bodyComponent.text || !String(bodyComponent.text).trim()) {
    return { valid: false, error: "O componente de corpo (BODY) é obrigatório e deve conter texto." };
  }

  // Validação de variáveis sequenciais {{1}}, {{2}}, etc.
  const bodyText = String(bodyComponent.text);
  const matches = bodyText.match(/\{\{(\d+)\}\}/g) || [];
  if (matches.length > 0) {
    const indices = matches.map((m) => parseInt(m.replace(/[{}]/g, ""), 10));
    const uniqueIndices = [...new Set(indices)].sort((a, b) => a - b);

    if (uniqueIndices[0] !== 1) {
      return {
        valid: false,
        error: `As variáveis do template devem iniciar em {{1}}. Primeira variável encontrada: {{${uniqueIndices[0]}}}.`,
      };
    }

    for (let i = 0; i < uniqueIndices.length; i++) {
      if (uniqueIndices[i] !== i + 1) {
        return {
          valid: false,
          error: `As variáveis do template devem ser estritamente sequenciais. Falta {{${i + 1}}} antes de {{${uniqueIndices[i]}}}.`,
        };
      }
    }
  }

  return validateTemplateComponents(components);
}

class MetaApiClient {
  constructor() {
    this.config = metaConfig;
  }

  /**
   * Cria os headers de autenticação padrão para as requisições
   * @private
   */
  _getAuthHeaders() {
    const config = this.config.getConfig();
    return {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Executa uma chamada HTTP genérica para a Meta Graph API com tratamento de erros robusto.
   * Inclui retry automático com backoff exponencial para erros de Rate Limit (130429).
   * @private
   * @param {string} method - Método HTTP (GET, POST, etc.)
   * @param {string} url - URL completa da Graph API
   * @param {object|null} data - Payload da requisição
   * @param {object} customHeaders - Headers adicionais
   * @param {number} [_retryCount=0] - Contador interno de retries (não usar externamente)
   */
  async _request(method, url, data = null, customHeaders = {}, _retryCount = 0) {
    const validation = this.config.validateCredentials();
    if (!validation.isValid) {
      throw new Error(`Configurações ausentes: ${validation.missing.join(", ")}`);
    }

    try {
      const response = await axios({
        method,
        url,
        data,
        headers: {
          ...this._getAuthHeaders(),
          ...customHeaders,
        },
        timeout: 30000, // 30s timeout
      });

      // 🛡️ Sucesso: reseta o backoff do Rate Limiter (sequência de erros interrompida)
      rateLimiterService.resetBackoff();

      return {
        success: true,
        data: response.data,
        messageId: response.data?.messages?.[0]?.id || null,
      };
    } catch (error) {
      const metaError = error.response?.data?.error || {};
      const errorCode = metaError.code;

      // 🛡️ PROTEÇÃO CONTRA RATE LIMIT (Vulnerabilidade #5)
      // Erro 130429: Rate Limit Hit — ativa backoff exponencial e retenta automaticamente
      if (errorCode === 130429 && _retryCount < 3) {
        const backoff = rateLimiterService.handleRateLimitHit();

        if (backoff.shouldRetry) {
          console.warn(
            `⏳ [RATE LIMIT] Erro 130429 detectado (tentativa ${backoff.attempt}/${3}). ` +
            `Aguardando ${(backoff.delayMs / 1000).toFixed(1)}s antes de retentar...`
          );

          await new Promise((resolve) => setTimeout(resolve, backoff.delayMs));
          return this._request(method, url, data, customHeaders, _retryCount + 1);
        }
      }

      const friendlyMessage = parseMetaErrorMessage(error.response);
      const rawError = error.response?.data || error.message;

      return {
        success: false,
        error: friendlyMessage,
        raw: rawError,
        status: error.response?.status || 500,
        rateLimited: errorCode === 130429,
        retryAttempts: _retryCount,
      };
    }
  }

  /**
   * Envia uma mensagem de texto simples (dentro da janela de 24h)
   * @param {string} to - Número do destinatário
   * @param {string} text - Conteúdo do texto
   * @param {boolean} previewUrl - Se true, gera prévia de links na mensagem
   */
  async sendTextMessage(to, text, previewUrl = false) {
    const endpoint = this.config.getMessagesEndpoint();
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizePhoneNumber(to),
      type: "text",
      text: {
        preview_url: Boolean(previewUrl),
        body: String(text || ""),
      },
    };

    return this._request("POST", endpoint, payload);
  }

  /**
   * Envia uma mensagem interativa com Botões de Resposta Rápida (Quick Reply)
   * A Meta suporta de 1 até 3 botões por mensagem.
   * @param {string} to - Destinatário
   * @param {string} bodyText - Texto principal da mensagem
   * @param {Array<{ id: string, title: string }>} buttons - Lista de até 3 botões (título máx 20 caracteres)
   * @param {string|null} header - Cabeçalho opcional (texto)
   * @param {string|null} footer - Rodapé opcional (texto menor)
   */
  async sendInteractiveButtons(to, bodyText, buttons = [], header = null, footer = null) {
    if (!Array.isArray(buttons) || buttons.length === 0) {
      throw new Error("É necessário fornecer ao menos 1 botão para mensagem interativa.");
    }

    if (buttons.length > 3) {
      throw new Error("A Meta permite no máximo 3 botões por mensagem interativa.");
    }

    const formattedButtons = buttons.map((btn, index) => ({
      type: "reply",
      reply: {
        id: String(btn.id || `btn_${index}`),
        title: String(btn.title || "").substring(0, 20), // Limite estrito da Meta: 20 caracteres
      },
    }));

    const interactiveObject = {
      type: "button",
      body: { text: String(bodyText || "") },
      action: { buttons: formattedButtons },
    };

    if (header) {
      interactiveObject.header = { type: "text", text: String(header) };
    }

    if (footer) {
      interactiveObject.footer = { text: String(footer) };
    }

    const endpoint = this.config.getMessagesEndpoint();
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizePhoneNumber(to),
      type: "interactive",
      interactive: interactiveObject,
    };

    return this._request("POST", endpoint, payload);
  }

  /**
   * Envia uma mensagem interativa com Menu de Lista (List Message)
   * A Meta suporta até 10 opções no total divididas em seções.
   * @param {string} to - Destinatário
   * @param {string} bodyText - Texto principal da mensagem
   * @param {string} buttonTitle - Texto do botão que abre a lista (ex: "Ver Opções")
   * @param {Array<{ title: string, rows: Array<{ id: string, title: string, description?: string }> }>} sections - Seções da lista
   * @param {string|null} header - Cabeçalho opcional
   * @param {string|null} footer - Rodapé opcional
   */
  async sendInteractiveList(to, bodyText, buttonTitle = "Selecionar", sections = [], header = null, footer = null) {
    if (!Array.isArray(sections) || sections.length === 0) {
      throw new Error("É necessário fornecer ao menos uma seção para o menu de lista.");
    }

    const formattedSections = sections.map((sec, secIdx) => ({
      title: String(sec.title || `Seção ${secIdx + 1}`).substring(0, 24),
      rows: (sec.rows || []).map((row, rowIdx) => ({
        id: String(row.id || `row_${secIdx}_${rowIdx}`),
        title: String(row.title || "").substring(0, 24), // Máximo 24 caracteres
        description: row.description ? String(row.description).substring(0, 72) : undefined, // Máximo 72 caracteres
      })),
    }));

    const interactiveObject = {
      type: "list",
      body: { text: String(bodyText || "") },
      action: {
        button: String(buttonTitle || "Opções").substring(0, 20),
        sections: formattedSections,
      },
    };

    if (header) {
      interactiveObject.header = { type: "text", text: String(header) };
    }

    if (footer) {
      interactiveObject.footer = { text: String(footer) };
    }

    const endpoint = this.config.getMessagesEndpoint();
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizePhoneNumber(to),
      type: "interactive",
      interactive: interactiveObject,
    };

    return this._request("POST", endpoint, payload);
  }

  /**
   * Envia mensagem de mídia (imagem, documento, áudio ou vídeo) por URL pública ou Media ID
   * @param {string} to - Destinatário
   * @param {"image"|"document"|"audio"|"video"} type - Tipo de mídia
   * @param {string} mediaUrlOrId - URL pública ou ID da mídia previamente enviada à Meta
   * @param {string|null} caption - Legenda opcional (suportado em imagem, documento, vídeo)
   * @param {string|null} filename - Nome do arquivo (específico para documento)
   */
  async sendMediaMessage(to, type, mediaUrlOrId, caption = null, filename = null) {
    const validTypes = ["image", "document", "audio", "video"];
    if (!validTypes.includes(type)) {
      throw new Error(`Tipo de mídia inválido: ${type}. Esperado: ${validTypes.join(", ")}`);
    }

    const isUrl = String(mediaUrlOrId).startsWith("http://") || String(mediaUrlOrId).startsWith("https://");
    const mediaObject = isUrl ? { link: mediaUrlOrId } : { id: mediaUrlOrId };

    if (caption && (type === "image" || type === "document" || type === "video")) {
      mediaObject.caption = String(caption);
    }

    if (filename && type === "document") {
      mediaObject.filename = String(filename);
    }

    const endpoint = this.config.getMessagesEndpoint();
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizePhoneNumber(to),
      type: type,
      [type]: mediaObject,
    };

    return this._request("POST", endpoint, payload);
  }

  /**
   * Envia uma mensagem baseada em Template oficial aprovado pela Meta
   * (Obrigatório para iniciar conversas fora da janela de 24h ou em campanhas de disparo)
   * @param {string} to - Destinatário
   * @param {string} templateName - Nome do template conforme cadastrado na Meta
   * @param {string} languageCode - Código do idioma (padrão: pt_BR)
   * @param {Array<object>} components - Componentes e parâmetros dinâmicos do template (header, body, buttons)
   */
  async sendTemplateMessage(to, templateName, languageCode = "pt_BR", components = []) {
    const endpoint = this.config.getMessagesEndpoint();
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizePhoneNumber(to),
      type: "template",
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
        components: components,
      },
    };

    return this._request("POST", endpoint, payload);
  }

  /**
   * Marca uma mensagem como lida (envia o tique azul de confirmação de leitura oficial)
   * @param {string} messageId - ID da mensagem da Meta (wamid...)
   */
  async markMessageAsRead(messageId) {
    const endpoint = this.config.getMessagesEndpoint();
    const payload = {
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    };

    return this._request("POST", endpoint, payload);
  }

  /**
   * Obtém detalhes e saúde do número de telefone configurado (Status, Quality Rating, Nome Verificado)
   */
  async getPhoneNumberDetails() {
    const config = this.config.getConfig();
    const url = `${this.config.getApiBaseUrl()}/${config.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,code_verification_status,messaging_limit_tier`;

    return this._request("GET", url);
  }

  /**
   * Lista templates cadastrados na conta WABA com suporte a limites e filtros
   * @param {number} [limit=100] - Quantidade máxima de templates a retornar
   * @param {object} [options={}] - Filtros opcionais (status, category, after)
   * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
   */
  async getWabaTemplates(limit = 100, options = {}) {
    const config = this.config.getConfig();
    if (!config.wabaId) {
      return { success: false, error: "WABA_ID não configurado. Verifique as configurações da Meta." };
    }

    let url = `${this.config.getApiBaseUrl()}/${config.wabaId}/message_templates?limit=${limit}`;
    if (options.status) {
      url += `&status=${encodeURIComponent(String(options.status).toUpperCase())}`;
    }
    if (options.category) {
      url += `&category=${encodeURIComponent(String(options.category).toUpperCase())}`;
    }
    if (options.after) {
      url += `&after=${encodeURIComponent(String(options.after))}`;
    }

    return this._request("GET", url);
  }

  /**
   * Obtém detalhes de um template específico pelo seu ID na Meta
   * @param {string} templateId - ID do template (ex: retornado na listagem ou na criação)
   * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
   */
  async getTemplateById(templateId) {
    if (!templateId) {
      return { success: false, error: "ID do template é obrigatório." };
    }

    const url = `${this.config.getApiBaseUrl()}/${encodeURIComponent(String(templateId).trim())}`;
    return this._request("GET", url);
  }

  /**
   * Cria um novo Message Template e o submete automaticamente para aprovação da Meta
   * @param {string} name - Nome do template (apenas a-z, 0-9 e _)
   * @param {'MARKETING'|'UTILITY'|'AUTHENTICATION'} category - Categoria do template
   * @param {string} [language='pt_BR'] - Idioma (padrão: pt_BR)
   * @param {Array<object>} [components=[]] - Lista de componentes (HEADER, BODY, FOOTER, BUTTONS)
   * @param {object} [options={}] - Opções extras (libraryTemplateName, allowCategoryChange)
   * @returns {Promise<{ success: boolean, data?: object, id?: string, status?: string, category?: string, error?: string }>}
   */
  async createTemplate(name, category, language = "pt_BR", components = [], options = {}) {
    const config = this.config.getConfig();
    if (!config.wabaId) {
      return { success: false, error: "WABA_ID não configurado. Verifique as configurações da Meta." };
    }

    const cleanName = String(name || "").trim().toLowerCase();
    const cleanCategory = String(category || "").trim().toUpperCase();
    const cleanLanguage = String(language || "pt_BR").trim();
    components = sanitizeTemplateComponents(components);

    // Validação local prévia
    const validation = validateTemplateDefinition({
      name: cleanName,
      category: cleanCategory,
      language: cleanLanguage,
      components,
    });

    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const payload = {
      name: cleanName,
      category: cleanCategory,
      language: cleanLanguage,
      components,
    };

    if (options.libraryTemplateName) {
      payload.library_template_name = options.libraryTemplateName;
    }

    if (options.allowCategoryChange !== undefined) {
      payload.allow_category_change = Boolean(options.allowCategoryChange);
    }

    const url = `${this.config.getApiBaseUrl()}/${config.wabaId}/message_templates`;
    const response = await this._request("POST", url, payload);

    if (response.success && response.data) {
      return {
        success: true,
        data: response.data,
        id: response.data.id || null,
        status: response.data.status || "PENDING",
        category: response.data.category || cleanCategory,
      };
    }

    return response;
  }

  /**
   * Atualiza os componentes ou categoria de um Message Template existente
   * (Nota: templates aprovados, rejeitados ou pausados podem ser editados)
   * @param {string} templateId - ID do template retornado pela Meta
   * @param {Array<object>} components - Novos componentes do template
   * @param {string|null} [category=null] - Nova categoria opcional
   * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
   */
  async updateTemplate(templateId, components, category = null) {
    if (!templateId) {
      return { success: false, error: "ID do template (templateId) é obrigatório para atualização." };
    }

    if (!Array.isArray(components) || components.length === 0) {
      return { success: false, error: "Componentes atualizados são obrigatórios." };
    }

    components = sanitizeTemplateComponents(components);
    const contentValidation = validateTemplateComponents(components);
    if (!contentValidation.valid) {
      return { success: false, error: contentValidation.error };
    }

    const payload = {
      components,
    };

    if (category) {
      payload.category = String(category).trim().toUpperCase();
    }

    const url = `${this.config.getApiBaseUrl()}/${encodeURIComponent(String(templateId).trim())}`;
    return this._request("POST", url, payload);
  }

  /**
   * Exclui um Message Template na Meta por nome ou por ID específico
   * @param {string} templateName - Nome do template a excluir
   * @param {string|null} [templateId=null] - ID específico (hsm_id) para excluir apenas uma variante de idioma
   * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
   */
  async deleteTemplate(templateName, templateId = null) {
    const config = this.config.getConfig();
    if (!config.wabaId) {
      return { success: false, error: "WABA_ID não configurado. Verifique as configurações da Meta." };
    }

    if (!templateName) {
      return { success: false, error: "Nome do template é obrigatório para exclusão." };
    }

    let url = `${this.config.getApiBaseUrl()}/${config.wabaId}/message_templates?name=${encodeURIComponent(
      String(templateName).trim().toLowerCase()
    )}`;

    if (templateId) {
      url += `&hsm_id=${encodeURIComponent(String(templateId).trim())}`;
    }

    return this._request("DELETE", url);
  }
}

// Exporta instância singleton
const metaApiClient = new MetaApiClient();
module.exports = {
  MetaApiClient,
  metaApiClient,
  normalizePhoneNumber,
  parseMetaErrorMessage,
  validateTemplateDefinition,
  normalizeTemplateText,
  sanitizeTemplateComponents,
};
