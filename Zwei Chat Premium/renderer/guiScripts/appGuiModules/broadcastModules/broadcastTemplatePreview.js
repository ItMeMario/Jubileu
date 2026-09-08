// renderer/guiScripts/appGuiModules/broadcastModules/broadcastTemplatePreview.js
// Gestão da seleção de templates, chips de variáveis dinâmicas e simulador WhatsApp

import { $ } from "../domUtils.js";
import { renderWhatsAppBubble } from "../whatsAppPreviewHelper.js";
import { extractTemplateVariables } from "../templatesModule.js";

/**
 * Gerencia a seleção de templates e atualização do balão WhatsApp
 * @param {Function} [getLoadedTemplates] - Função para obter templates em cache
 */
export function setupTemplatePreviewHandlers(getLoadedTemplates) {
  const select = $("#broadcast-template-select");
  if (!select) return;

  select.addEventListener("change", () => {
    const templateName = select.value;
    const templates = typeof getLoadedTemplates === "function" ? getLoadedTemplates() : [];
    const template = templates.find((t) => t.name === templateName) || null;

    const metaInfo = $("#bc-template-meta-info");
    const badgeStatus = $("#bc-tmpl-badge-status");
    const badgeCat = $("#bc-tmpl-badge-cat");
    const badgeLang = $("#bc-tmpl-badge-lang");
    const varsGuideDesc = $("#bc-template-vars-desc");
    const varsList = $("#bc-template-vars-list");

    if (!template) {
      if (metaInfo) metaInfo.style.display = "none";
      if (varsGuideDesc) varsGuideDesc.textContent = "Selecione um template para visualizar suas variáveis.";
      if (varsList) varsList.innerHTML = "";
      renderWhatsAppBubble({
        elements: {
          headerEl: $("#bc-sim-bubble-header"),
          bodyEl: $("#bc-sim-bubble-body"),
          footerEl: $("#bc-sim-bubble-footer"),
          buttonsEl: $("#bc-sim-bubble-buttons"),
        },
        data: null,
      });
      return;
    }

    if (metaInfo) metaInfo.style.display = "block";
    if (badgeStatus) badgeStatus.textContent = template.status || "APPROVED";
    if (badgeCat) badgeCat.textContent = template.category || "MARKETING";
    if (badgeLang) badgeLang.textContent = template.language || "pt_BR";

    // Extrai e lista as variáveis
    const vars = extractTemplateVariables(template);
    if (varsList) {
      varsList.innerHTML = "";
      if (vars.length === 0) {
        if (varsGuideDesc) varsGuideDesc.textContent = "Este template não contém variáveis dinâmicas (texto fixo).";
      } else {
        if (varsGuideDesc) varsGuideDesc.textContent = `Este template requer ${vars.length} variável(is) dinâmica(s):`;
        vars.forEach((v) => {
          const chip = document.createElement("div");
          chip.style.cssText = "font-size: 12px; color: var(--text-main); display: flex; align-items: center; gap: 6px;";
          chip.innerHTML = `<span class="btn-var-chip">{{${v}}}</span> <span>Variável ${v} (ex: ${v === "1" ? "Nome do Cliente" : `Valor ${v}`})</span>`;
          varsList.appendChild(chip);
        });
      }
    }

    // Renderiza a pré-visualização no balão do WhatsApp
    renderWhatsAppBubble({
      elements: {
        headerEl: $("#bc-sim-bubble-header"),
        bodyEl: $("#bc-sim-bubble-body"),
        footerEl: $("#bc-sim-bubble-footer"),
        buttonsEl: $("#bc-sim-bubble-buttons"),
      },
      data: template,
    });
  });
}

// Compatibilidade para testes em ambiente Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = { setupTemplatePreviewHandlers };
}
