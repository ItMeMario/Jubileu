// renderer/guiScripts/appGuiModules/broadcastModules/broadcastState.js
// Estado centralizado e reativo para o Disparador Oficial (Broadcast) do Zwei Chat Premium

let currentRecipients = [];
let broadcastIntervalSelector = null;
let broadcastIsActive = false;

/**
 * Retorna a lista atual de destinatários na fila
 * @returns {Array<object>}
 */
export function getCurrentRecipients() {
  return currentRecipients;
}

/**
 * Define a lista atual de destinatários na fila
 * @param {Array<object>} recipients
 */
export function setCurrentRecipients(recipients) {
  currentRecipients = Array.isArray(recipients) ? recipients : [];
}

/**
 * Retorna a instância do seletor de cadência/intervalo
 * @returns {object|null}
 */
export function getBroadcastIntervalSelector() {
  return broadcastIntervalSelector;
}

/**
 * Define a instância do seletor de cadência/intervalo
 * @param {object|null} selector
 */
export function setBroadcastIntervalSelector(selector) {
  broadcastIntervalSelector = selector;
}

/**
 * Retorna se o disparo está atualmente ativo
 * @returns {boolean}
 */
export function getBroadcastIsActive() {
  return broadcastIsActive;
}

/**
 * Define se o disparo está atualmente ativo
 * @param {boolean} isActive
 */
export function setBroadcastIsActive(isActive) {
  broadcastIsActive = !!isActive;
}

/**
 * Reseta o estado interno do disparador
 */
export function resetBroadcastState() {
  currentRecipients = [];
  broadcastIntervalSelector = null;
  broadcastIsActive = false;
}

// Compatibilidade para testes em ambiente Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    getCurrentRecipients,
    setCurrentRecipients,
    getBroadcastIntervalSelector,
    setBroadcastIntervalSelector,
    getBroadcastIsActive,
    setBroadcastIsActive,
    resetBroadcastState,
  };
}
