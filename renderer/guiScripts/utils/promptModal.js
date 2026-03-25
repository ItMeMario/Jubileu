// renderer/guiScripts/utils/promptModal.js

/**
 * Modal de prompt customizado para substituir o prompt() nativo
 * Resolve o problema do Electron não suportar o prompt nativo nativamente
 *
 * @param {string} message - Mensagem a ser exibida como label do input
 * @param {string} defaultValue - Valor inicial sugerido no campo
 * @returns {Promise<string|null>} - Retorna o texto inserido ou null se cancelado
 *
 * @example
 * const nome = await window.customPrompt('Qual o seu nome?', 'Visitante');
 * if (nome) { // faz algo }
 */
window.customPrompt = function(message, defaultValue = "") {
    return new Promise((resolve) => {
        const overlay = document.createElement("div");
        overlay.className = "modal-overlay";
        overlay.style.display = "flex";
        
        overlay.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 style="margin: 0; color: #333;">Informação Necessária</h3>
                </div>
                <div class="modal-body" style="margin-top: 15px; margin-bottom: 20px;">
                    <div class="form-group">
                        <label for="input-custom-prompt" style="display: block; margin-bottom: 8px; color: #666;">${message}</label>
                        <input type="text" id="input-custom-prompt" placeholder="Digite aqui..." style="width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                    </div>
                </div>
                <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 10px;">
                    <button class="btn-secondary prompt-btn-cancel" style="padding: 8px 16px; border: none; border-radius: 4px; background: #e0e0e0; cursor: pointer; color: #333;">Cancelar</button>
                    <button class="btn-primary prompt-btn-confirm" style="padding: 8px 16px; border: none; border-radius: 4px; background-color: #9C27B0; color: white; cursor: pointer; transition: background 0.2s;">Continuar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        const inputField = overlay.querySelector("#input-custom-prompt");
        const btnConfirm = overlay.querySelector(".prompt-btn-confirm");
        const btnCancel = overlay.querySelector(".prompt-btn-cancel");

        inputField.value = defaultValue;
        inputField.focus();
        inputField.select();
        
        const cleanupAndResolve = (value) => {
            overlay.remove();
            document.removeEventListener("keydown", handleKeydown);
            resolve(value);
        };
        
        btnConfirm.onclick = () => {
            const val = inputField.value.trim();
            cleanupAndResolve(val || defaultValue);
        };
        
        btnCancel.onclick = () => cleanupAndResolve(null);
        
        const handleKeydown = (e) => {
            if (e.key === "Escape") {
                cleanupAndResolve(null);
            }
            if (e.key === "Enter") {
                // Prevent form submission if any
                e.preventDefault();
                const val = inputField.value.trim();
                cleanupAndResolve(val || defaultValue);
            }
        };
        
        document.addEventListener("keydown", handleKeydown);
    });
};
