// controllers/droneControllerGuiModules/clientStatusDCGM.js
const {
  verificarStatusCliente,
  verificarStatusTodasInstancias,
  listarInstanciasConectadas,
} = require("../../services/droneServiceModules/clientStatusDSM");

class ClientStatusDCGM {
  constructor() {
    console.log("ClientStatusDCGM inicializado");
  }

  /**
   * Obtém status de conexão do WhatsApp de uma instância específica
   * @param {string} instanceId - ID da instância (opcional)
   * @returns {Promise<Object>} - Status formatado
   */
  async obterStatusCliente(instanceId = null) {
    try {
      console.log(
        `Verificando status do cliente WhatsApp${
          instanceId ? ` (${instanceId})` : ""
        }...`
      );
      const status = await verificarStatusCliente(instanceId);

      const statusTexto = {
        CONNECTED: "✅ Conectado",
        OPENING: "🔄 Conectando...",
        QRCODE: "📱 Aguardando QR Code",
        LOADING_SCREEN: "⏳ Carregando...",
        UNPAIRED: "❌ Desconectado",
        UNPAIRED_IDLE: "😴 Inativo",
        NOT_INITIALIZED: "⚪ Não inicializado",
        NO_INSTANCE: "⚪ Nenhuma instância",
        UNKNOWN: "❓ Status desconhecido",
      };

      return {
        success: status.success,
        conectado: status.connected,
        status: status.state,
        statusTexto: statusTexto[status.state] || `❓ ${status.state}`,
        info: status.info,
        error: status.error,
        instanceId: status.instanceId,
      };
    } catch (error) {
      console.error("Erro ao verificar status:", error);
      return {
        success: false,
        conectado: false,
        status: "ERROR",
        statusTexto: "❌ Erro ao verificar status",
        error: error.message,
        instanceId: instanceId,
      };
    }
  }

  /**
   * Obtém status de todas as instâncias
   * @returns {Promise<Object>} - Status de todas as instâncias formatado
   */
  async obterStatusTodasInstancias() {
    try {
      console.log("Verificando status de todas as instâncias...");
      const resultado = await verificarStatusTodasInstancias();

      if (!resultado.success) {
        return {
          success: false,
          error: resultado.error,
          instances: [],
          total: 0,
          connected: 0,
        };
      }

      const statusTexto = {
        CONNECTED: "✅ Conectado",
        OPENING: "🔄 Conectando...",
        QRCODE: "📱 Aguardando QR Code",
        LOADING_SCREEN: "⏳ Carregando...",
        UNPAIRED: "❌ Desconectado",
        UNPAIRED_IDLE: "😴 Inativo",
        DISCONNECTED: "⚪ Desconectado",
        NOT_INITIALIZED: "⚪ Não inicializado",
        ERROR: "❌ Erro",
        UNKNOWN: "❓ Desconhecido",
      };

      // Formata cada instância para a GUI
      const instancesFormatadas = resultado.instances.map((inst) => ({
        instanceId: inst.instanceId,
        name: inst.name,
        status: inst.status,
        state: inst.state,
        stateTexto: statusTexto[inst.state] || `❓ ${inst.state}`,
        connected: inst.connected,
        phoneNumber: inst.phoneNumber,
        phoneFormatted: inst.phoneNumber
          ? this.formatPhoneNumber(inst.phoneNumber)
          : null,
        info: inst.info,
      }));

      return {
        success: true,
        instances: instancesFormatadas,
        total: resultado.total,
        connected: resultado.connected,
      };
    } catch (error) {
      console.error("Erro ao verificar status de todas as instâncias:", error);
      return {
        success: false,
        error: error.message,
        instances: [],
        total: 0,
        connected: 0,
      };
    }
  }

  /**
   * Lista apenas instâncias conectadas (para dropdown do Drone)
   * @returns {Promise<Object>} - Lista de instâncias conectadas
   */
  async listarInstanciasConectadas() {
    try {
      console.log("Listando instâncias conectadas...");
      const resultado = await listarInstanciasConectadas();

      if (!resultado.success) {
        return {
          success: false,
          error: resultado.error,
          instances: [],
          total: 0,
        };
      }

      // Formata para exibição no dropdown
      const instancesFormatadas = resultado.instances.map((inst) => ({
        instanceId: inst.instanceId,
        name: inst.name,
        phoneNumber: inst.phoneNumber,
        phoneFormatted: inst.phoneNumber
          ? this.formatPhoneNumber(inst.phoneNumber)
          : null,
        displayName: this.buildDisplayName(inst),
      }));

      return {
        success: true,
        instances: instancesFormatadas,
        total: resultado.total,
      };
    } catch (error) {
      console.error("Erro ao listar instâncias conectadas:", error);
      return {
        success: false,
        error: error.message,
        instances: [],
        total: 0,
      };
    }
  }

  /**
   * Formata número de telefone para exibição
   * @param {string} phone - Número do telefone
   * @returns {string} - Número formatado
   */
  formatPhoneNumber(phone) {
    if (!phone) return null;

    const cleaned = phone.replace(/\D/g, "");

    // Formato brasileiro: +55 11 99999-9999
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(
        4,
        9
      )}-${cleaned.slice(9)}`;
    } else if (cleaned.length === 12) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(
        4,
        8
      )}-${cleaned.slice(8)}`;
    }

    return phone;
  }

  /**
   * Constrói nome de exibição para o dropdown
   * @param {Object} instance - Dados da instância
   * @returns {string} - Nome formatado para exibição
   */
  buildDisplayName(instance) {
    const name = instance.name || "Sem nome";
    const phone = instance.phoneNumber
      ? this.formatPhoneNumber(instance.phoneNumber)
      : null;

    if (phone) {
      return `${name} (${phone})`;
    }

    return name;
  }
}

module.exports = new ClientStatusDCGM();
