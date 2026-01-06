// renderer/guiScripts/utils/confirmModal.js

/**
 * Modal de confirmação customizado para substituir o confirm() nativo
 * Resolve o problema de inputs travados no Electron após usar confirm()
 *
 * @param {string} message - Mensagem a ser exibida
 * @returns {Promise<boolean>} - true se confirmou, false se cancelou
 *
 * @example
 * const confirmed = await window.customConfirm('Tem certeza?');
 * if (confirmed) { // executa ação }
 */
window.customConfirm = function (message) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    overlay.innerHTML = `
      <div class="confirm-modal">
        <p>${message}</p>
        <div class="confirm-buttons">
          <button class="confirm-btn confirm-btn-cancel">Cancelar</button>
          <button class="confirm-btn confirm-btn-confirm">Confirmar</button>
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
