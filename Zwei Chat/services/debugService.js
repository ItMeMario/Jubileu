// services/debugService.js
// Versão simplificada para o Zwei Chat Lite
async function debug(...args) {
  // Sempre ativa logs de debug no console no Zwei Chat Lite
  console.log("[DEBUG]", ...args);
}

async function toggleDebugMode() {
  return { success: true, debugEnabled: true };
}

async function getDebugStatus() {
  return { debugEnabled: true, lastDebugChanged: null };
}

module.exports = {
  debug,
  toggleDebugMode,
  getDebugStatus,
};
