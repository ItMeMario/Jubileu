// renderer/guiScripts/appGuiModules/whatsAppPreviewHelper.js
// Componente reutilizável para renderização da bolha de simulação de mensagens do WhatsApp

/**
 * Interpola variáveis {{1}}, {{2}} em um texto com os valores fornecidos
 * @param {string} text
 * @param {Record<string, string>|Array<string>} values
 * @returns {string}
 */
export function interpolateVariables(text, values = {}) {
  if (!text) return "";
  let rendered = String(text);

  if (Array.isArray(values)) {
    values.forEach((val, idx) => {
      const varIndex = idx + 1;
      rendered = rendered.replace(new RegExp(`\\{\\{${varIndex}\\}\\}`, "g"), val || `{{${varIndex}}}`);
    });
  } else if (values && typeof values === "object") {
    for (const [k, v] of Object.entries(values)) {
      rendered = rendered.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v || `{{${k}}}`);
    }
  }

  return rendered;
}

/**
 * Renderiza o balão de mensagem do WhatsApp nos elementos do DOM fornecidos
 * @param {object} params
 * @param {object} params.elements - Referências dos elementos DOM
 * @param {HTMLElement} [params.elements.headerEl]
 * @param {HTMLElement} params.elements.bodyEl
 * @param {HTMLElement} [params.elements.footerEl]
 * @param {HTMLElement} [params.elements.buttonsEl]
 * @param {object|null} params.data - Dados da mensagem (template ou passo de fluxo)
 * @param {Record<string, string>} [params.values={}] - Variáveis para interpolação
 * @param {string} [params.emptyBodyMessage="Selecione um item para visualizar."]
 */
export function renderWhatsAppBubble({
  elements,
  data,
  values = {},
  emptyBodyMessage = "Selecione um item para visualizar o conteúdo.",
}) {
  const { headerEl, bodyEl, footerEl, buttonsEl } = elements || {};
  if (!bodyEl) return;

  if (!data) {
    if (headerEl) headerEl.style.display = "none";
    bodyEl.textContent = emptyBodyMessage;
    if (footerEl) footerEl.style.display = "none";
    if (buttonsEl) buttonsEl.innerHTML = "";
    return;
  }

  // 1. Extração normalizada de propriedades (suporta tanto Templates Meta quanto Nós do Flow Builder)
  let headerText = "";
  let bodyText = "";
  let footerText = "";
  let buttons = [];
  let listButtonTitle = null;

  // Formato Template Meta (components array ou components object)
  if (data.components) {
    if (Array.isArray(data.components)) {
      const headerComp = data.components.find((c) => c.type === "HEADER");
      const bodyComp = data.components.find((c) => c.type === "BODY");
      const footerComp = data.components.find((c) => c.type === "FOOTER");
      const buttonsComp = data.components.find((c) => c.type === "BUTTONS");

      headerText = headerComp?.text || "";
      bodyText = bodyComp?.text || "";
      footerText = footerComp?.text || "";
      buttons = buttonsComp?.buttons || [];
    } else if (typeof data.components === "object") {
      headerText = data.components.header?.text || "";
      bodyText = data.components.body?.text || "";
      footerText = data.components.footer?.text || "";
      buttons = data.components.buttons || [];
    }
  } else {
    // Formato Passo do Flow Builder
    headerText = data.header || "";
    bodyText = data.body || "";
    footerText = data.footer || "";
    buttons = data.buttons || [];
    if (data.type === "interactive_list") {
      listButtonTitle = data.buttonTitle || "Ver Opções";
    }
  }

  // 2. Cabeçalho
  if (headerEl) {
    if (headerText) {
      headerEl.style.display = "block";
      headerEl.textContent = headerText;
    } else {
      headerEl.style.display = "none";
    }
  }

  // 3. Corpo com Interpolação de Variáveis
  bodyEl.textContent = interpolateVariables(bodyText, values) || "Mensagem vazia";

  // 4. Rodapé
  if (footerEl) {
    if (footerText) {
      footerEl.style.display = "block";
      footerEl.textContent = footerText;
    } else {
      footerEl.style.display = "none";
    }
  }

  // 5. Botões e Menus Interativos
  if (buttonsEl) {
    buttonsEl.innerHTML = "";

    if (listButtonTitle) {
      const listBtn = document.createElement("div");
      listBtn.className = "wa-btn";
      listBtn.style.background = "rgba(83, 189, 235, 0.15)";
      listBtn.style.color = "#53bdeb";
      listBtn.textContent = `📋 ${listButtonTitle}`;
      buttonsEl.appendChild(listBtn);
    } else if (Array.isArray(buttons) && buttons.length > 0) {
      buttons.forEach((b) => {
        const btnDiv = document.createElement("div");
        btnDiv.className = "wa-btn";
        btnDiv.textContent = b.title || b.text || "Botão";
        buttonsEl.appendChild(btnDiv);
      });
    }
  }
}

// Compatibilidade para testes em ambiente Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = { interpolateVariables, renderWhatsAppBubble };
}

