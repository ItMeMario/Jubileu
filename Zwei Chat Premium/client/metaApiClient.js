// client/metaApiClient.js
// Cliente HTTP Oficial para a Meta WhatsApp Cloud API (Graph API v21.0+)

const axios = require("axios");
const metaConfig = require("../config/metaConfig");

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
    case 190:
      return "Token de Acesso da Meta expirou ou é inválido. Gere um novo System User Token permanente no Gerenciador de Negócios.";
    default:
      return `[Meta Error ${code}${subcode ? `:${subcode}` : ""}] ${message}`;
  }
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
   * Executa uma chamada HTTP genérica para a Meta Graph API com tratamento de erros robusto
   * @private
   */
  async _request(method, url, data = null, customHeaders = {}) {
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

      return {
        success: true,
        data: response.data,
        messageId: response.data?.messages?.[0]?.id || null,
      };
    } catch (error) {
      const friendlyMessage = parseMetaErrorMessage(error.response);
      const rawError = error.response?.data || error.message;

      return {
        success: false,
        error: friendlyMessage,
        raw: rawError,
        status: error.response?.status || 500,
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
   * Lista todos os templates cadastrados e aprovados na conta WABA
   */
  async getWabaTemplates(limit = 100) {
    const config = this.config.getConfig();
    if (!config.wabaId) {
      throw new Error("WABA_ID não configurado.");
    }

    const url = `${this.config.getApiBaseUrl()}/${config.wabaId}/message_templates?limit=${limit}`;
    return this._request("GET", url);
  }
}

// Exporta instância singleton
const metaApiClient = new MetaApiClient();
module.exports = {
  MetaApiClient,
  metaApiClient,
  normalizePhoneNumber,
  parseMetaErrorMessage,
};
