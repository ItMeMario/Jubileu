// services/metaTemplateService.js
// Serviço de Gerenciamento, Sincronização e Mapeamento de Message Templates da Meta

const { metaApiClient } = require("../client/metaApiClient");

class MetaTemplateService {
  constructor() {
    this.templates = [];
    this.lastSyncTimestamp = null;
  }

  /**
   * Sincroniza todos os templates da conta WABA com a Graph API da Meta
   * @returns {Promise<{ success: boolean, count?: number, templates?: Array, error?: string }>}
   */
  async syncTemplates() {
    try {
      const response = await metaApiClient.getWabaTemplates(100);

      if (response.success && response.data?.data) {
        this.templates = response.data.data.map((tmpl) => this._normalizeTemplate(tmpl));
        this.lastSyncTimestamp = Date.now();

        return {
          success: true,
          count: this.templates.length,
          templates: this.templates,
          lastSync: this.lastSyncTimestamp,
        };
      } else {
        return {
          success: false,
          error: response.error || "Falha ao obter templates da Meta",
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Normaliza a estrutura interna do template para facilitar manipulação na UI e no disparador
   * @private
   */
  _normalizeTemplate(tmpl) {
    const components = tmpl.components || [];
    const headerComp = components.find((c) => c.type === "HEADER");
    const bodyComp = components.find((c) => c.type === "BODY");
    const footerComp = components.find((c) => c.type === "FOOTER");
    const buttonsComp = components.find((c) => c.type === "BUTTONS");

    // Extrai variáveis no formato {{1}}, {{2}} do corpo
    const bodyText = bodyComp?.text || "";
    const bodyVariables = this.extractVariableIndices(bodyText);

    return {
      id: tmpl.id,
      name: tmpl.name,
      status: tmpl.status, // 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED' | 'DISABLED'
      category: tmpl.category, // 'UTILITY' | 'MARKETING' | 'AUTHENTICATION'
      language: tmpl.language, // 'pt_BR', etc.
      components: {
        header: headerComp
          ? {
              format: headerComp.format, // 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO'
              text: headerComp.text || null,
            }
          : null,
        body: {
          text: bodyText,
          variables: bodyVariables,
          variableCount: bodyVariables.length,
        },
        footer: footerComp ? { text: footerComp.text } : null,
        buttons: buttonsComp ? buttonsComp.buttons : [],
      },
      raw: tmpl,
    };
  }

  /**
   * Extrai índices de variáveis dinâmicas (ex: {{1}}, {{2}}) de um texto
   * @param {string} text
   * @returns {string[]} Ex: ["1", "2"]
   */
  extractVariableIndices(text) {
    if (!text) return [];
    const matches = text.match(/\{\{(\d+)\}\}/g) || [];
    return [...new Set(matches.map((m) => m.replace(/[{}]/g, "")))].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  }

  /**
   * Retorna apenas os templates homologados e aprovados para envio
   * @param {string} [language='pt_BR']
   * @returns {Array}
   */
  getApprovedTemplates(language = null) {
    return this.templates.filter((t) => {
      const isApproved = t.status === "APPROVED";
      if (language) {
        return isApproved && t.language === language;
      }
      return isApproved;
    });
  }

  /**
   * Busca um template específico por nome e idioma
   * @param {string} name
   * @param {string} [language='pt_BR']
   */
  getTemplateByName(name, language = "pt_BR") {
    return this.templates.find(
      (t) => t.name.toLowerCase() === String(name).toLowerCase() && (!language || t.language === language)
    );
  }

  /**
   * Constrói o array de componentes e parâmetros exigido pela Meta Graph API
   * a partir de um mapa ou array de valores fornecidos para as variáveis.
   * @param {object|string} templateOrName - Objeto do template normalizado ou nome do template
   * @param {Array<string>|object} values - Lista de valores na ordem [val1, val2] ou objeto { "1": val1, "2": val2 }
   * @param {object} [headerMedia=null] - Mídia de cabeçalho opcional { type: 'image'|'document', link: 'url' }
   * @returns {Array<object>} Payload de components formatado para a Meta
   */
  buildTemplateComponents(templateOrName, values = [], headerMedia = null) {
    const template =
      typeof templateOrName === "string" ? this.getTemplateByName(templateOrName) : templateOrName;

    const components = [];

    // 1. Cabeçalho com Mídia (se aplicável)
    if (headerMedia && headerMedia.link) {
      const mediaType = (headerMedia.type || "image").toLowerCase();
      components.push({
        type: "header",
        parameters: [
          {
            type: mediaType,
            [mediaType]: { link: headerMedia.link },
          },
        ],
      });
    }

    // 2. Variáveis do Corpo (Body)
    const varIndices = template?.components?.body?.variables || [];
    if (varIndices.length > 0) {
      const bodyParameters = [];

      varIndices.forEach((idx, i) => {
        let val = "";
        if (Array.isArray(values)) {
          val = values[i] !== undefined ? String(values[i]) : "";
        } else if (typeof values === "object" && values !== null) {
          val = values[idx] !== undefined ? String(values[idx]) : values[`var_${idx}`] || "";
        }

        bodyParameters.push({
          type: "text",
          text: String(val || "-"),
        });
      });

      if (bodyParameters.length > 0) {
        components.push({
          type: "body",
          parameters: bodyParameters,
        });
      }
    }

    return components;
  }

  /**
   * Renderiza uma prévia aproximada do texto do template com as variáveis preenchidas
   * @param {object} template
   * @param {Array<string>|object} values
   * @returns {string} Texto com variáveis substituídas
   */
  renderPreview(template, values = []) {
    if (!template || !template.components?.body?.text) return "";

    let text = template.components.body.text;
    const varIndices = template.components.body.variables || [];

    varIndices.forEach((idx, i) => {
      let val = "";
      if (Array.isArray(values)) {
        val = values[i] !== undefined ? String(values[i]) : `{{${idx}}}`;
      } else if (typeof values === "object" && values !== null) {
        val = values[idx] !== undefined ? String(values[idx]) : `{{${idx}}}`;
      }
      text = text.replace(new RegExp(`\\{\\{${idx}\\}\\}`, "g"), val);
    });

    return text;
  }
}

// Exporta instância singleton
const metaTemplateService = new MetaTemplateService();
module.exports = {
  MetaTemplateService,
  metaTemplateService,
};
