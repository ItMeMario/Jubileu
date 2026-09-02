// renderer/guiScripts/appGuiModules/templatesModule.js
// Gestão de Message Templates oficiais da Meta, sincronização e simulador dinâmico

import { $, $$ } from "./domUtils.js";
import { renderWhatsAppBubble } from "./whatsAppPreviewHelper.js";

let loadedTemplates = [];

/**
 * Retorna os templates carregados em memória
 * @returns {Array}
 */
export function getLoadedTemplates() {
  return loadedTemplates;
}

/**
 * Carrega a lista de templates do backend e popula os selects da interface
 * @param {object} api - Instância da API
 */
export async function loadTemplatesList(api) {
  if (!api) return;

  const templateSelect = $("#template-select");
  const broadcastTemplateSelect = $("#broadcast-template-select");
  const templateMetaInfo = $("#template-meta-info");

  try {
    // Suporte tanto para getApprovedTemplates quanto getTemplates ou syncTemplates
    if (typeof api.getTemplates === "function") {
      loadedTemplates = await api.getTemplates();
    } else if (typeof api.getApprovedTemplates === "function") {
      loadedTemplates = await api.getApprovedTemplates();
    } else if (typeof api.syncTemplates === "function") {
      const res = await api.syncTemplates();
      loadedTemplates = res?.templates || [];
    }

    if (!Array.isArray(loadedTemplates)) {
      loadedTemplates = [];
    }

    if (templateSelect) {
      templateSelect.innerHTML = '<option value="">Selecione um template aprovado...</option>';
    }
    if (broadcastTemplateSelect) {
      broadcastTemplateSelect.innerHTML = '<option value="">Selecione um template aprovado...</option>';
    }

    if (loadedTemplates.length === 0) {
      if (templateMetaInfo) templateMetaInfo.style.display = "none";
      renderTemplateSimulator(null);
      return;
    }

    loadedTemplates.forEach((t) => {
      if (templateSelect) {
        const opt = document.createElement("option");
        opt.value = t.name;
        opt.textContent = `[${t.status || "APPROVED"}] ${t.name} (${t.language || "pt_BR"})`;
        templateSelect.appendChild(opt);
      }

      if (broadcastTemplateSelect && (t.status === "APPROVED" || !t.status)) {
        const bOpt = document.createElement("option");
        bOpt.value = t.name;
        bOpt.textContent = `${t.name} (${t.category || "UTILITY"})`;
        broadcastTemplateSelect.appendChild(bOpt);
      }
    });
  } catch (error) {
    console.error("Erro ao carregar templates:", error);
  }
}

/**
 * Extrai os índices únicos de variáveis {{1}}, {{2}} de um template
 * @param {object} tmpl
 * @returns {string[]}
 */
export function extractTemplateVariables(tmpl) {
  if (!tmpl) return [];
  let bodyText = "";

  if (tmpl.components) {
    if (Array.isArray(tmpl.components)) {
      const bodyComp = tmpl.components.find((c) => c.type === "BODY");
      bodyText = bodyComp?.text || "";
    } else if (tmpl.components.body) {
      bodyText = tmpl.components.body.text || "";
    }
  }

  const matches = bodyText.match(/\{\{(\d+)\}\}/g) || [];
  return [...new Set(matches.map((m) => m.replace(/[{}]/g, "")))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10)
  );
}

/**
 * Gera dinamicamente campos de entrada para as variáveis {{1}}, {{2}} do template
 * @param {object} tmpl
 */
export function generateVariableInputs(tmpl) {
  const container = $("#template-variables-inputs");
  if (!container) return;

  container.innerHTML = "";
  if (!tmpl) return;

  const uniqueVars = extractTemplateVariables(tmpl);

  if (uniqueVars.length > 0) {
    const title = document.createElement("div");
    title.style.fontSize = "12px";
    title.style.fontWeight = "600";
    title.style.color = "var(--text-muted)";
    title.style.marginBottom = "8px";
    title.textContent = "Variáveis Dinâmicas do Template:";
    container.appendChild(title);

    uniqueVars.forEach((varNum) => {
      const group = document.createElement("div");
      group.className = "form-group";
      group.style.marginBottom = "10px";

      group.innerHTML = `
        <label style="font-size: 11px;">Variável {{${varNum}}}:</label>
        <input type="text" class="form-control tmpl-var-input" data-var="${varNum}" placeholder="Ex: Valor para {{${varNum}}}">
      `;
      container.appendChild(group);
    });

    $$(".tmpl-var-input", container).forEach((inp) => {
      inp.addEventListener("input", () => renderTemplateSimulator(tmpl));
    });
  }
}

/**
 * Renderiza a pré-visualização ao vivo do template no simulador do celular
 * @param {object|null} tmpl
 */
export function renderTemplateSimulator(tmpl) {
  const elements = {
    headerEl: $("#sim-bubble-header"),
    bodyEl: $("#sim-bubble-body"),
    footerEl: $("#sim-bubble-footer"),
    buttonsEl: $("#sim-bubble-buttons"),
  };

  const values = {};
  $$(".tmpl-var-input").forEach((inp) => {
    const varKey = inp.getAttribute("data-var");
    if (varKey) values[varKey] = inp.value;
  });

  renderWhatsAppBubble({
    elements,
    data: tmpl,
    values,
    emptyBodyMessage: "Selecione um template para visualizar o conteúdo.",
  });
}

/**
 * Inicializa os controles da aba de Message Templates
 * @param {object} api - Instância da API
 */
export function initTemplates(api) {
  const btnSyncTemplates = $("#btn-sync-templates-action");
  const templateSelect = $("#template-select");
  const templateMetaInfo = $("#template-meta-info");
  const tmplBadgeStatus = $("#tmpl-badge-status");
  const tmplBadgeCat = $("#tmpl-badge-cat");
  const tmplBadgeLang = $("#tmpl-badge-lang");

  // 1. Sincronização de Templates com a Graph API
  if (btnSyncTemplates) {
    btnSyncTemplates.addEventListener("click", async () => {
      btnSyncTemplates.disabled = true;
      btnSyncTemplates.textContent = "Sincronizando...";

      try {
        const res = await api.syncTemplates();
        if (res && res.success) {
          alert(`✅ Sincronização concluída! ${res.count || (res.templates && res.templates.length) || 0} templates encontrados.`);
          await loadTemplatesList(api);
        } else {
          alert(`⚠️ Falha ao sincronizar: ${res?.error || "Erro desconhecido"}`);
        }
      } catch (err) {
        alert(`❌ Erro: ${err.message}`);
      } finally {
        btnSyncTemplates.disabled = false;
        btnSyncTemplates.textContent = "🔄 Sincronizar com a Meta";
      }
    });
  }

  // 2. Mudança de Template Selecionado
  if (templateSelect) {
    templateSelect.addEventListener("change", () => {
      const selectedName = templateSelect.value;
      const tmpl = loadedTemplates.find((t) => t.name === selectedName);

      if (!tmpl) {
        if (templateMetaInfo) templateMetaInfo.style.display = "none";
        renderTemplateSimulator(null);
        return;
      }

      if (templateMetaInfo) {
        templateMetaInfo.style.display = "flex";
        if (tmplBadgeStatus) {
          tmplBadgeStatus.textContent = tmpl.status || "APPROVED";
          tmplBadgeStatus.className = `status-pill ${tmpl.status === "APPROVED" ? "status-green" : "status-yellow"}`;
        }
        if (tmplBadgeCat) {
          tmplBadgeCat.textContent = tmpl.category || "UTILITY";
        }
        if (tmplBadgeLang) {
          tmplBadgeLang.textContent = tmpl.language || "pt_BR";
        }
      }

      generateVariableInputs(tmpl);
      renderTemplateSimulator(tmpl);
    });
  }

  return {
    loadTemplatesList: () => loadTemplatesList(api),
    getLoadedTemplates,
    renderTemplateSimulator,
  };
}

// Compatibilidade para testes em ambiente Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    getLoadedTemplates,
    loadTemplatesList,
    extractTemplateVariables,
    generateVariableInputs,
    renderTemplateSimulator,
    initTemplates,
  };
}
