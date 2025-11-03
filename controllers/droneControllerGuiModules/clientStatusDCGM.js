// controllers/droneControllerGuiModules/clientStatusDCGM.js
const droneService = require("../../services/droneService");

class ClientStatusDCGM {
  constructor() {
    console.log("ClientStatusDCGM inicializado");
  }

  /**
   * Obtém status de conexão do WhatsApp
   * @returns {Promise<Object>} - Status formatado
   */
  async obterStatusCliente() {
    try {
      console.log("Verificando status do cliente WhatsApp...");
      const status = await droneService.verificarStatusCliente();

      const statusTexto = {
        CONNECTED: "✅ Conectado",
        OPENING: "🔄 Conectando...",
        QRCODE: "📱 Aguardando QR Code",
        LOADING_SCREEN: "⏳ Carregando...",
        UNPAIRED: "❌ Desconectado",
        UNPAIRED_IDLE: "😴 Inativo",
        UNKNOWN: "❓ Status desconhecido",
      };

      return {
        success: status.success,
        conectado: status.connected,
        status: status.state,
        statusTexto: statusTexto[status.state] || `❓ ${status.state}`,
        info: status.info,
        error: status.error,
      };
    } catch (error) {
      console.error("Erro ao verificar status:", error);
      return {
        success: false,
        conectado: false,
        status: "ERROR",
        statusTexto: "❌ Erro ao verificar status",
        error: error.message,
      };
    }
  }
}

module.exports = new ClientStatusDCGM();
