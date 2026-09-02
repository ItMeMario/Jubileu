// renderer/guiScripts/appGuiModules/navigationModule.js
// Gerenciamento de abas de navegação e atalhos rápidos da interface

import { $, $$ } from "./domUtils.js";

/**
 * Alterna programaticamente para uma aba específica
 * @param {string} tabId - ID da aba (ex: "tab-templates", "tab-broadcast")
 */
export function navigateToTab(tabId) {
  const navItems = $$(".nav-item");
  const tabPanes = $$(".tab-pane");

  navItems.forEach((n) => n.classList.remove("active"));
  tabPanes.forEach((p) => p.classList.remove("active"));

  const targetNavItem = $(`.nav-item[data-tab="${tabId}"]`);
  if (targetNavItem) {
    targetNavItem.classList.add("active");
  }

  const targetPane = document.getElementById(tabId);
  if (targetPane) {
    targetPane.classList.add("active");
  }
}

/**
 * Inicializa os listeners de navegação entre abas e botões de ação rápida
 * @param {object} [callbacks={}]
 * @param {Function} [callbacks.onSyncTemplatesRequested]
 */
export function initNavigation(callbacks = {}) {
  const navItems = $$(".nav-item");

  // 1. Cliques no menu lateral de navegação
  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const targetTabId = item.getAttribute("data-tab");
      if (targetTabId) {
        navigateToTab(targetTabId);
      }
    });
  });

  // 2. Ações rápidas do Dashboard por ID
  const btnQuickSync = $("#btn-quick-sync-templates");
  if (btnQuickSync) {
    btnQuickSync.addEventListener("click", () => {
      navigateToTab("tab-templates");
      if (typeof callbacks.onSyncTemplatesRequested === "function") {
        callbacks.onSyncTemplatesRequested();
      } else {
        $("#btn-sync-templates-action")?.click();
      }
    });
  }

  const btnQuickBroadcast = $("#btn-quick-new-broadcast");
  if (btnQuickBroadcast) {
    btnQuickBroadcast.addEventListener("click", () => {
      navigateToTab("tab-broadcast");
    });
  }

  const btnQuickConfig = $("#btn-quick-config");
  if (btnQuickConfig) {
    btnQuickConfig.addEventListener("click", () => {
      navigateToTab("tab-settings");
    });
  }

  // 3. Suporte a elementos com atributo [data-action]
  $$("[data-action]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const action = e.currentTarget.getAttribute("data-action");
      if (action === "sync-templates") {
        navigateToTab("tab-templates");
        $("#btn-sync-templates-action")?.click();
      } else if (action === "new-broadcast") {
        navigateToTab("tab-broadcast");
      } else if (action === "edit-flows") {
        navigateToTab("tab-flows");
      } else if (action === "settings") {
        navigateToTab("tab-settings");
      }
    });
  });
}

// Compatibilidade para testes em ambiente Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = { navigateToTab, initNavigation };
}
