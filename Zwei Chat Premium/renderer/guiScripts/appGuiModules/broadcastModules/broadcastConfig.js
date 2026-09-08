// renderer/guiScripts/appGuiModules/broadcastModules/broadcastConfig.js
// Gestão e persistência das opções de formatação de números (9º dígito, DDD, DDI) e cadência

import { $ } from "../domUtils.js";
import { customAlert } from "../../utils/confirmModal.js";
import { getBroadcastIntervalSelector } from "./broadcastState.js";

/**
 * Carrega as opções salvas de formatação e cadência
 * @param {object} api
 */
export async function loadBroadcastConfig(api) {
  if (!api || typeof api.getBroadcastConfig !== "function") return;

  try {
    const config = await api.getBroadcastConfig();
    if (!config) return;

    const opt9Digit = $("#bc-opt-9digit");
    const optDDD = $("#bc-opt-ddd");
    const optDDDVal = $("#bc-opt-ddd-val");
    const optPrefix = $("#bc-opt-prefix");
    const optPrefixVal = $("#bc-opt-prefix-val");

    if (opt9Digit) opt9Digit.checked = !!config.add9thDigit;
    if (optDDD) optDDD.checked = !!config.addDDD;
    if (optDDDVal) optDDDVal.value = config.defaultDDD || "11";
    if (optPrefix) optPrefix.checked = !!config.addCountryPrefix;
    if (optPrefixVal) optPrefixVal.value = config.defaultCountryPrefix || "55";

    const broadcastIntervalSelector = getBroadcastIntervalSelector();
    if (broadcastIntervalSelector && config.dispatchInterval) {
      broadcastIntervalSelector.setValue(config.dispatchInterval);
    }
  } catch (err) {
    console.error("Erro ao carregar configurações de broadcast:", err);
  }
}

/**
 * Registra os listeners para salvar as configurações de formatação e cadência
 * @param {object} api
 */
export function setupBroadcastConfigHandlers(api) {
  const btnSaveConfig = $("#bc-btn-save-format-config");
  if (btnSaveConfig) {
    btnSaveConfig.addEventListener("click", async () => {
      const opt9Digit = $("#bc-opt-9digit");
      const optDDD = $("#bc-opt-ddd");
      const optDDDVal = $("#bc-opt-ddd-val");
      const optPrefix = $("#bc-opt-prefix");
      const optPrefixVal = $("#bc-opt-prefix-val");

      const broadcastIntervalSelector = getBroadcastIntervalSelector();
      const intervalVal = broadcastIntervalSelector ? broadcastIntervalSelector.getValue() : null;

      const configToSave = {
        add9thDigit: !!opt9Digit?.checked,
        addDDD: !!optDDD?.checked,
        defaultDDD: optDDDVal?.value?.trim() || "11",
        addCountryPrefix: !!optPrefix?.checked,
        defaultCountryPrefix: optPrefixVal?.value?.trim() || "55",
      };

      if (intervalVal) {
        configToSave.dispatchInterval = intervalVal;
      }

      try {
        await api.saveBroadcastConfig(configToSave);
        await customAlert("Configurações de formatação e intervalo salvas com sucesso!");
      } catch (err) {
        await customAlert(`Erro ao salvar configurações: ${err.message}`);
      }
    });
  }
}

// Compatibilidade para testes em ambiente Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    loadBroadcastConfig,
    setupBroadcastConfigHandlers,
  };
}
