// renderer/guiScripts/utils/confirmModal.js
// Modal customizado para substituir confirm(), alert() e prompt() nativos no Electron.
// Evita travamento crônico de foco de teclado / congelamento de inputs após modais nativos.

/**
 * Escapa strings simples para inserção segura no HTML
 * @param {string} str 
 * @returns {string}
 */
function escapeHtml(str) {
  if (typeof str !== "string") return String(str || "");
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Modal de confirmação customizado para substituir o confirm() nativo
 *
 * @param {string} message - Mensagem a ser exibida
 * @param {string} [title="Confirmação"] - Título do modal
 * @param {string} [confirmText="Confirmar"] - Texto do botão de confirmação
 * @param {string} [cancelText="Cancelar"] - Texto do botão de cancelamento
 * @param {string} [confirmBtnClass="btn-danger"] - Classe CSS do botão de confirmação
 * @returns {Promise<boolean>} - true se confirmou, false se cancelou
 */
export function customConfirm(
  message,
  title = "Confirmação",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  confirmBtnClass = "btn-danger"
) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.style.display = "flex";

    const safeTitle = escapeHtml(title);
    const safeMessage = escapeHtml(message);

    overlay.innerHTML = `
      <div class="modal-content" role="dialog" aria-modal="true">
        <h3>${safeTitle}</h3>
        <p>${safeMessage}</p>
        <div class="modal-buttons">
          <button class="btn btn-secondary confirm-btn-cancel">${escapeHtml(cancelText)}</button>
          <button class="btn ${confirmBtnClass} confirm-btn-confirm">${escapeHtml(confirmText)}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const btnConfirm = overlay.querySelector(".confirm-btn-confirm");
    const btnCancel = overlay.querySelector(".confirm-btn-cancel");

    let isClosed = false;
    const close = (result) => {
      if (isClosed) return;
      isClosed = true;
      if (typeof document !== "undefined" && typeof document.removeEventListener === "function") {
        document.removeEventListener("keydown", handleKeydown);
      }
      if (typeof overlay.remove === "function") {
        overlay.remove();
      }
      resolve(result);
    };

    if (btnConfirm) btnConfirm.onclick = () => close(true);
    if (btnCancel) btnCancel.onclick = () => close(false);

    // Fechar ao clicar no fundo escuro
    overlay.onclick = (e) => {
      if (e.target === overlay) close(false);
    };

    // Fechar com ESC ou Confirmar com Enter
    const handleKeydown = (e) => {
      if (e.key === "Escape") {
        if (typeof e.preventDefault === "function") e.preventDefault();
        close(false);
      }
    };
    if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
      document.addEventListener("keydown", handleKeydown);
    }

    setTimeout(() => {
      if (btnConfirm && typeof btnConfirm.focus === "function") btnConfirm.focus();
    }, 50);
  });
}

/**
 * Modal de alerta customizado para substituir o alert() nativo
 * Suporta assinatura simples customAlert(mensagem) ou customAlert(titulo, mensagem)
 *
 * @param {string} titleOrMessage - Título ou mensagem direta
 * @param {string} [message=null] - Mensagem detalhada (opcional)
 * @param {string} [btnText="Entendido"] - Texto do botão
 * @returns {Promise<void>}
 */
export function customAlert(titleOrMessage, message = null, btnText = "Entendido") {
  return new Promise((resolve) => {
    let title = "Aviso";
    let bodyText = "";

    if (message !== null && message !== undefined) {
      title = titleOrMessage || "Aviso";
      bodyText = message;
    } else {
      const raw = String(titleOrMessage || "");
      if (raw.startsWith("✅")) {
        title = "✅ Sucesso";
        bodyText = raw.replace(/^✅\s*/, "");
      } else if (raw.startsWith("⚠️")) {
        title = "⚠️ Atenção";
        bodyText = raw.replace(/^⚠️\s*/, "");
      } else if (raw.startsWith("❌")) {
        title = "❌ Erro";
        bodyText = raw.replace(/^❌\s*/, "");
      } else if (raw.startsWith("🎉")) {
        title = "🎉 Concluído";
        bodyText = raw.replace(/^🎉\s*/, "");
      } else {
        title = "Notificação";
        bodyText = raw;
      }
    }

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.style.display = "flex";

    const safeTitle = escapeHtml(title);
    const safeMessage = escapeHtml(bodyText);

    overlay.innerHTML = `
      <div class="modal-content" role="dialog" aria-modal="true">
        <h3>${safeTitle}</h3>
        <p>${safeMessage}</p>
        <div class="modal-buttons" style="justify-content: flex-end;">
          <button class="btn btn-primary alert-btn-ok">${escapeHtml(btnText)}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const btnOk = overlay.querySelector(".alert-btn-ok");

    let isClosed = false;
    const close = () => {
      if (isClosed) return;
      isClosed = true;
      if (typeof document !== "undefined" && typeof document.removeEventListener === "function") {
        document.removeEventListener("keydown", handleKeydown);
      }
      if (typeof overlay.remove === "function") {
        overlay.remove();
      }
      resolve();
    };

    if (btnOk) btnOk.onclick = () => close();

    overlay.onclick = (e) => {
      if (e.target === overlay) close();
    };

    const handleKeydown = (e) => {
      if (e.key === "Escape" || e.key === "Enter") {
        if (typeof e.preventDefault === "function") e.preventDefault();
        close();
      }
    };
    if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
      document.addEventListener("keydown", handleKeydown);
    }

    setTimeout(() => {
      if (btnOk && typeof btnOk.focus === "function") btnOk.focus();
    }, 50);
  });
}

/**
 * Modal de prompt customizado para substituir o prompt() nativo que não funciona no Electron
 *
 * @param {string} title - Título do modal
 * @param {string} message - Mensagem explicativa
 * @param {string} [placeholder=""] - Placeholder/Valor padrão do input
 * @param {string} [confirmText="Confirmar"] - Texto do botão de confirmação
 * @param {string} [cancelText="Cancelar"] - Texto do botão de cancelamento
 * @returns {Promise<string|null>} - Retorna o texto digitado ou null se cancelou
 */
export function customPrompt(
  title,
  message,
  placeholder = "",
  confirmText = "Confirmar",
  cancelText = "Cancelar"
) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.style.display = "flex";

    const safeTitle = escapeHtml(title);
    const safeMessage = escapeHtml(message);
    const safePlaceholder = escapeHtml(placeholder);

    overlay.innerHTML = `
      <div class="modal-content" role="dialog" aria-modal="true">
        <h3>${safeTitle}</h3>
        <p>${safeMessage}</p>
        <input type="text" class="form-control prompt-input" placeholder="Digite aqui..." value="${safePlaceholder}" style="margin-top: 4px;">
        <div class="modal-buttons">
          <button class="btn btn-secondary prompt-btn-cancel">${escapeHtml(cancelText)}</button>
          <button class="btn btn-primary prompt-btn-confirm">${escapeHtml(confirmText)}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = overlay.querySelector(".prompt-input");
    const btnConfirm = overlay.querySelector(".prompt-btn-confirm");
    const btnCancel = overlay.querySelector(".prompt-btn-cancel");

    let isClosed = false;
    const close = (value) => {
      if (isClosed) return;
      isClosed = true;
      if (typeof document !== "undefined" && typeof document.removeEventListener === "function") {
        document.removeEventListener("keydown", handleKeydown);
      }
      if (typeof overlay.remove === "function") {
        overlay.remove();
      }
      resolve(value);
    };

    if (btnConfirm) {
      btnConfirm.onclick = () => close(input ? input.value : "");
    }
    if (btnCancel) {
      btnCancel.onclick = () => close(null);
    }

    overlay.onclick = (e) => {
      if (e.target === overlay) close(null);
    };

    const handleKeydown = (e) => {
      if (e.key === "Escape") {
        if (typeof e.preventDefault === "function") e.preventDefault();
        close(null);
      } else if (e.key === "Enter") {
        if (typeof e.preventDefault === "function") e.preventDefault();
        close(input ? input.value : "");
      }
    };
    if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
      document.addEventListener("keydown", handleKeydown);
    }

    setTimeout(() => {
      if (input && typeof input.focus === "function") {
        input.focus();
        if (typeof input.select === "function") input.select();
      }
    }, 50);
  });
}

// Expõe globalmente no objeto window
if (typeof window !== "undefined") {
  window.customConfirm = customConfirm;
  window.customAlert = customAlert;
  window.customPrompt = customPrompt;
}

// Compatibilidade para testes em ambiente Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    customConfirm,
    customAlert,
    customPrompt,
  };
}
