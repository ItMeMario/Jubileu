// renderer/guiScripts/appGui.js
// Orquestrador Principal de Interface Gráfica do Zwei Chat Premium

import { $ } from "./appGuiModules/domUtils.js";
import { initNavigation } from "./appGuiModules/navigationModule.js";
import { initDashboard, refreshAccountHealth } from "./appGuiModules/dashboardModule.js";
import { initSettings, loadConfigForm } from "./appGuiModules/settingsModule.js";
import { initTemplates, loadTemplatesList, getLoadedTemplates } from "./appGuiModules/templatesModule.js";
import {
  initBroadcast,
  loadBroadcastHistory,
  loadBroadcastRecipients,
  loadBroadcastConfig,
} from "./appGuiModules/broadcastModule.js";
import { initFlows, loadFlowsList } from "./appGuiModules/flowsModule.js";

document.addEventListener("DOMContentLoaded", async () => {
  console.log("⚡ Inicializando interface modular do Zwei Chat Premium...");

  const api = window.zweiPremiumApi;
  if (!api) {
    console.error("❌ API do Zwei Chat Premium não está disponível no contexto global.");
    return;
  }

  // ==========================================
  // 1. INICIALIZAÇÃO DOS MÓDULOS DE INTERFACE
  // ==========================================

  // Navegação e Atalhos Rápidos
  initNavigation({
    onSyncTemplatesRequested: () => {
      $("#btn-sync-templates-action")?.click();
    },
  });

  // Diagnóstico e Saúde da Conta Meta
  initDashboard(api);

  // Message Templates e Simulador
  initTemplates(api);

  // Disparador Oficial em Massa (Broadcast)
  initBroadcast(api, {
    getLoadedTemplates,
  });

  // Fluxos do Chatbot e Flow Builder
  initFlows(api);

  // Configurações e Credenciais Meta (com callback para atualizar dashboard e templates após salvar)
  initSettings(api, {
    onConfigSaved: async () => {
      await refreshAccountHealth(api);
      await loadTemplatesList(api);
    },
  });

  // ==========================================
  // 2. CARREGAMENTO INICIAL DOS DADOS
  // ==========================================
  try {
    await loadConfigForm(api);
    await refreshAccountHealth(api);
    await loadTemplatesList(api);
    await loadBroadcastConfig(api);
    await loadBroadcastRecipients(api);
    await loadBroadcastHistory(api);
    await loadFlowsList(api);
    console.log("✅ Todos os módulos e dados foram carregados com sucesso!");
  } catch (error) {
    console.error("⚠️ Erro durante o carregamento inicial da interface:", error);
  }
});
