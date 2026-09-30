// services/metaTemplateService.js
// Serviço de Gerenciamento, Sincronização e Mapeamento de Message Templates da Meta

const EventEmitter = require("events");
const { metaApiClient } = require("../client/metaApiClient");
const { syncService } = require("./syncService");

class MetaTemplateService extends EventEmitter {
  constructor() {
    super();
    this.templates = [];
    this.lastSyncTimestamp = null;

    // Escuta atualizações de status emitidas pelo webhook da Meta
    if (syncService && typeof syncService.on === "function") {
      syncService.on("template:status_updated", (update) => {
        this.handleStatusUpdate(update);
      });
    }
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
    let headerComp = null;
    let bodyComp = null;
    let footerComp = null;
    let buttonsComp = null;

    if (Array.isArray(tmpl.components)) {
      headerComp = tmpl.components.find((c) => String(c.type || "").toUpperCase() === "HEADER");
      bodyComp = tmpl.components.find((c) => String(c.type || "").toUpperCase() === "BODY");
      footerComp = tmpl.components.find((c) => String(c.type || "").toUpperCase() === "FOOTER");
      buttonsComp = tmpl.components.find((c) => String(c.type || "").toUpperCase() === "BUTTONS");
    } else if (tmpl.components && typeof tmpl.components === "object") {
      headerComp = tmpl.components.header;
      bodyComp = tmpl.components.body;
      footerComp = tmpl.components.footer;
      buttonsComp = tmpl.components.buttons ? { buttons: tmpl.components.buttons } : null;
    }

    // Extrai variáveis no formato {{1}}, {{2}} do corpo
    const bodyText = bodyComp?.text || "";
    const bodyVariables = this.extractVariableIndices(bodyText);

    return {
      id: tmpl.id,
      name: tmpl.name,
      status: tmpl.status || "APPROVED", // 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED' | 'DISABLED'
      category: tmpl.category || "UTILITY", // 'UTILITY' | 'MARKETING' | 'AUTHENTICATION'
      language: tmpl.language || "pt_BR", // 'pt_BR', etc.
      rejectionReason: tmpl.rejectionReason || tmpl.reason || null,
      rejectionRecommendation: tmpl.rejectionRecommendation || null,
      lastStatusUpdate: tmpl.lastStatusUpdate || Date.now(),
      components: {
        header: headerComp
          ? {
              format: headerComp.format || (headerComp.text ? "TEXT" : "NONE"), // 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO'
              text: headerComp.text || null,
            }
          : null,
        body: {
          text: bodyText,
          variables: bodyVariables,
          variableCount: bodyVariables.length,
        },
        footer: footerComp ? { text: footerComp.text } : null,
        buttons: buttonsComp ? (buttonsComp.buttons || buttonsComp) : [],
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

  /**
   * Processa atualização de status recebida via webhook da Meta e atualiza o cache local
   * @param {object} update - Dados recebidos do webhook
   */
  handleStatusUpdate(update) {
    if (!update) return;

    const { templateId, templateName, event, reason, recommendation } = update;
    let target = null;

    for (let i = 0; i < this.templates.length; i++) {
      const tmpl = this.templates[i];
      if (
        (templateId && String(tmpl.id) === String(templateId)) ||
        (templateName && tmpl.name.toLowerCase() === String(templateName).toLowerCase())
      ) {
        tmpl.status = event; // 'APPROVED' | 'REJECTED' | 'FLAGGED' | 'DISABLED' | 'PAUSED'
        if (reason) tmpl.rejectionReason = reason;
        if (recommendation) tmpl.rejectionRecommendation = recommendation;
        tmpl.lastStatusUpdate = Date.now();
        target = tmpl;
        break;
      }
    }

    // Se o template não estava no cache local, insere para manter consistência
    if (!target && templateName) {
      target = this._normalizeTemplate({
        id: templateId || `tmpl_${Date.now()}`,
        name: templateName,
        status: event,
        category: update.category || "UTILITY",
        language: update.language || "pt_BR",
        rejectionReason: reason || null,
        rejectionRecommendation: recommendation || null,
        components: [],
      });
      this.templates.unshift(target);
    }

    this.emit("template:status_changed", {
      ...update,
      template: target,
    });
  }

  /**
   * Retorna todos os templates cadastrados no cache local com filtros opcionais
   * @param {object} [filters={}] - { status, category, language, search }
   * @returns {Array<object>}
   */
  getAllTemplates(filters = {}) {
    return this.templates.filter((tmpl) => {
      if (filters.status && tmpl.status !== String(filters.status).toUpperCase()) {
        return false;
      }
      if (filters.category && tmpl.category !== String(filters.category).toUpperCase()) {
        return false;
      }
      if (filters.language && tmpl.language !== filters.language) {
        return false;
      }
      if (filters.search) {
        const query = String(filters.search).toLowerCase();
        const matchesName = tmpl.name.toLowerCase().includes(query);
        const matchesBody = (tmpl.components?.body?.text || "").toLowerCase().includes(query);
        if (!matchesName && !matchesBody) return false;
      }
      return true;
    });
  }

  /**
   * Busca um template por ID no cache local
   * @param {string} templateId
   * @returns {object|null}
   */
  getTemplateById(templateId) {
    if (!templateId) return null;
    return this.templates.find((t) => String(t.id) === String(templateId)) || null;
  }

  /**
   * Cria um novo template na Meta e atualiza o cache local
   * @param {object} params
   * @param {string} params.name - Nome do template
   * @param {string} params.category - Categoria (MARKETING, UTILITY, AUTHENTICATION)
   * @param {string} [params.language='pt_BR'] - Idioma
   * @param {Array<object>} [params.components=[]] - Componentes do template
   * @param {object} [params.options={}] - Opções adicionais
   * @returns {Promise<{ success: boolean, template?: object, id?: string, status?: string, error?: string }>}
   */
  async createTemplate({ name, category, language = "pt_BR", components = [], options = {} }) {
    try {
      const response = await metaApiClient.createTemplate(name, category, language, components, options);

      if (response.success) {
        const createdTmpl = this._normalizeTemplate({
          id: response.id || `pending_${Date.now()}`,
          name: String(name).trim().toLowerCase(),
          status: response.status || "PENDING",
          category: response.category || category,
          language: language || "pt_BR",
          components: components,
        });

        // Adiciona ou substitui no início do cache local
        const existingIdx = this.templates.findIndex(
          (t) => t.name === createdTmpl.name && t.language === createdTmpl.language
        );
        if (existingIdx >= 0) {
          this.templates[existingIdx] = createdTmpl;
        } else {
          this.templates.unshift(createdTmpl);
        }

        this.emit("template:created", createdTmpl);

        return {
          success: true,
          template: createdTmpl,
          id: response.id,
          status: response.status || "PENDING",
        };
      }

      return {
        success: false,
        error: response.error || "Falha ao criar template na Meta.",
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Atualiza os componentes ou categoria de um template existente na Meta
   * @param {string} templateId
   * @param {object} updateData - { components, category }
   * @returns {Promise<{ success: boolean, template?: object, error?: string }>}
   */
  async updateTemplate(templateId, { components, category = null } = {}) {
    try {
      if (!templateId) {
        return { success: false, error: "ID do template é obrigatório." };
      }

      const response = await metaApiClient.updateTemplate(templateId, components, category);

      if (response.success) {
        // Atualiza template no cache local
        const localTemplate = this.getTemplateById(templateId);
        if (localTemplate) {
          if (components) {
            const normalized = this._normalizeTemplate({
              ...localTemplate,
              components,
              category: category || localTemplate.category,
            });
            Object.assign(localTemplate, normalized);
          }
          if (category) {
            localTemplate.category = category;
          }
          localTemplate.status = "PENDING"; // Retorna para análise da Meta após edição
          localTemplate.lastStatusUpdate = Date.now();
        }

        this.emit("template:updated", localTemplate);

        return {
          success: true,
          template: localTemplate,
        };
      }

      return {
        success: false,
        error: response.error || "Falha ao atualizar template na Meta.",
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Exclui um template na Meta e remove do cache local
   * @param {string} templateName
   * @param {string|null} [templateId=null]
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async deleteTemplate(templateName, templateId = null) {
    try {
      if (!templateName) {
        return { success: false, error: "Nome do template é obrigatório." };
      }

      const response = await metaApiClient.deleteTemplate(templateName, templateId);

      if (response.success) {
        const cleanName = String(templateName).trim().toLowerCase();
        this.templates = this.templates.filter((t) => {
          if (templateId) {
            return String(t.id) !== String(templateId);
          }
          return t.name.toLowerCase() !== cleanName;
        });

        this.emit("template:deleted", { name: templateName, id: templateId });

        return { success: true };
      }

      return {
        success: false,
        error: response.error || "Falha ao excluir template na Meta.",
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Consulta os detalhes e status mais recente de um template diretamente na Meta e atualiza o cache
   * @param {string} templateId
   * @returns {Promise<{ success: boolean, template?: object, error?: string }>}
   */
  async refreshTemplateStatus(templateId) {
    try {
      if (!templateId) {
        return { success: false, error: "ID do template é obrigatório." };
      }

      const response = await metaApiClient.getTemplateById(templateId);

      if (response.success && response.data) {
        const normalized = this._normalizeTemplate(response.data);
        const idx = this.templates.findIndex((t) => String(t.id) === String(templateId));
        if (idx >= 0) {
          this.templates[idx] = normalized;
        } else {
          this.templates.unshift(normalized);
        }

        return {
          success: true,
          template: normalized,
        };
      }

      return {
        success: false,
        error: response.error || "Falha ao consultar template na Meta.",
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// Exporta instância singleton
const metaTemplateService = new MetaTemplateService();
module.exports = {
  MetaTemplateService,
  metaTemplateService,
};
