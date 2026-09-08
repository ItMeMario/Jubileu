// renderer/guiScripts/appGuiModules/broadcastModules/broadcastNavigation.js
// Gerenciamento da navegação entre as 4 sub-abas do Disparador Oficial

import { $ } from "../domUtils.js";

/**
 * Gerencia a alternância visual entre as 4 sub-abas do disparador
 */
export function setupSubtabsNavigation() {
  const subtabButtons = [
    { btn: $("#bc-subtab-template"), sec: $("#bc-sec-template") },
    { btn: $("#bc-subtab-contacts"), sec: $("#bc-sec-contacts") },
    { btn: $("#bc-subtab-dispatch"), sec: $("#bc-sec-dispatch") },
    { btn: $("#bc-subtab-history"), sec: $("#bc-sec-history") },
  ];

  subtabButtons.forEach(({ btn, sec }) => {
    if (!btn || !sec) return;

    btn.addEventListener("click", () => {
      subtabButtons.forEach((item) => {
        if (item.btn) item.btn.classList.remove("active");
        if (item.sec) item.sec.style.display = "none";
      });

      btn.classList.add("active");
      sec.style.display = "block";
    });
  });
}

// Compatibilidade para testes em ambiente Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = { setupSubtabsNavigation };
}
