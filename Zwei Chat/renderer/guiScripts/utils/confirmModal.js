// renderer/guiScripts/utils/confirmModal.js

/**
 * Modal de confirmação customizado para substituir o confirm() nativo
 * Resolve o problema de inputs travados no Electron após usar confirm()
 *
 * @param {string} message - Mensagem a ser exibida
 * @param {string} [title="Confirmação"] - Título do modal
 * @param {string} [confirmText="Remover"] - Texto do botão de confirmação
 * @param {string} [cancelText="Cancelar"] - Texto do botão de cancelamento
 * @param {string} [confirmBtnClass="btn-danger"] - Classe CSS do botão de confirmação
 * @returns {Promise<boolean>} - true se confirmou, false se cancelou
 */
window.customConfirm = function (message, title = "Confirmação", confirmText = "Remover", cancelText = "Cancelar", confirmBtnClass = "btn-danger") {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.style.display = "flex";
    
    overlay.innerHTML = `
      <div class="modal-content">
        <h3>${title}</h3>
        <p>${message}</p>
        <div class="modal-buttons">
          <button class="btn btn-secondary confirm-btn-cancel">${cancelText}</button>
          <button class="btn ${confirmBtnClass} confirm-btn-confirm">${confirmText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const btnConfirm = overlay.querySelector(".confirm-btn-confirm");
    const btnCancel = overlay.querySelector(".confirm-btn-cancel");

    const close = (result) => {
      overlay.remove();
      resolve(result);
    };

    btnConfirm.onclick = () => close(true);
    btnCancel.onclick = () => close(false);

    // Fechar com ESC
    const handleKeydown = (e) => {
      if (e.key === "Escape") {
        document.removeEventListener("keydown", handleKeydown);
        close(false);
      }
    };
    document.addEventListener("keydown", handleKeydown);
  });
};

/**
 * Modal de alerta customizado para substituir o alert() nativo
 *
 * @param {string} title - Título do modal
 * @param {string} message - Mensagem a ser exibida
 * @returns {Promise<void>}
 */
window.customAlert = function (title, message) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.style.display = "flex";
    
    overlay.innerHTML = `
      <div class="modal-content">
        <h3>${title}</h3>
        <p>${message}</p>
        <div class="modal-buttons" style="justify-content: center;">
          <button class="btn btn-primary alert-btn-ok">Entendido</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const btnOk = overlay.querySelector(".alert-btn-ok");

    const close = () => {
      overlay.remove();
      resolve();
    };

    btnOk.onclick = () => close();

    const handleKeydown = (e) => {
      if (e.key === "Escape" || e.key === "Enter") {
        document.removeEventListener("keydown", handleKeydown);
        close();
      }
    };
    document.addEventListener("keydown", handleKeydown);
  });
};

/**
 * Modal de prompt customizado para substituir o prompt() nativo que não funciona no Electron
 *
 * @param {string} title - Título do modal
 * @param {string} message - Mensagem explicativa
 * @param {string} [placeholder=""] - Placeholder/Valor padrão do input
 * @returns {Promise<string|null>} - Retorna o texto digitado ou null se cancelou
 */
window.customPrompt = function (title, message, placeholder = "") {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.style.display = "flex";
    
    overlay.innerHTML = `
      <div class="modal-content">
        <h3>${title}</h3>
        <p>${message}</p>
        <input type="text" class="step-input prompt-input" placeholder="Digite aqui..." value="${placeholder}" style="margin-top: 8px;">
        <div class="modal-buttons">
          <button class="btn btn-secondary prompt-btn-cancel">Cancelar</button>
          <button class="btn btn-primary prompt-btn-confirm">Confirmar</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = overlay.querySelector(".prompt-input");
    const btnConfirm = overlay.querySelector(".prompt-btn-confirm");
    const btnCancel = overlay.querySelector(".prompt-btn-cancel");

    // Seleciona o texto no input e foca
    setTimeout(() => {
      input.focus();
      input.select();
    }, 50);

    const close = (value) => {
      overlay.remove();
      resolve(value);
    };

    btnConfirm.onclick = () => {
      close(input.value);
    };

    btnCancel.onclick = () => {
      close(null);
    };

    // Fechar com ESC ou Confirmar com Enter
    const handleKeydown = (e) => {
      if (e.key === "Escape") {
        document.removeEventListener("keydown", handleKeydown);
        close(null);
      } else if (e.key === "Enter") {
        document.removeEventListener("keydown", handleKeydown);
        close(input.value);
      }
    };
    input.addEventListener("keydown", handleKeydown);
  });
};
