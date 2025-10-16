// services/droneServiceModules/clientStatusDSM.js
const { client } = require("../../client/client");

/**
 * Verifica o status de conexão do cliente WhatsApp
 * @returns {Promise<Object>} - Status do cliente
 */
async function verificarStatusCliente() {
  try {
    const state = await client.getState();

    return {
      success: true,
      connected: state === "CONNECTED",
      state: state,
      info: client.info || null,
    };
  } catch (error) {
    return {
      success: false,
      connected: false,
      state: "UNKNOWN",
      error: error.message,
    };
  }
}

module.exports = {
  verificarStatusCliente,
};
