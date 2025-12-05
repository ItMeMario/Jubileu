// services/droneServiceModules/clientStatusDSM.js
const { instanceManager } = require("../instanceManager");

/**
 * Verifica o status de conexão do cliente WhatsApp de uma instância específica
 * @param {string} instanceId - ID da instância (opcional para compatibilidade)
 * @returns {Promise<Object>} - Status do cliente
 */
async function verificarStatusCliente(instanceId = null) {
  try {
    // Se não passou instanceId, tenta pegar a primeira instância conectada
    if (!instanceId) {
      const instances = await instanceManager.listInstances();
      const connectedInstance = instances.find(i => i.status === "connected");
      
      if (!connectedInstance) {
        return {
          success: false,
          connected: false,
          state: "NO_INSTANCE",
          error: "Nenhuma instância conectada",
        };
      }
      
      instanceId = connectedInstance.instance_id;
    }

    const client = instanceManager.getClient(instanceId);

    if (!client) {
      return {
        success: false,
        connected: false,
        state: "NOT_INITIALIZED",
        error: "Cliente não inicializado para esta instância",
        instanceId: instanceId,
      };
    }

    const state = await client.getState();

    return {
      success: true,
      connected: state === "CONNECTED",
      state: state,
      info: client.info || null,
      instanceId: instanceId,
    };
  } catch (error) {
    return {
      success: false,
      connected: false,
      state: "UNKNOWN",
      error: error.message,
      instanceId: instanceId,
    };
  }
}

/**
 * Verifica o status de todas as instâncias
 * @returns {Promise<Object>} - Status de todas as instâncias
 */
async function verificarStatusTodasInstancias() {
  try {
    const instances = await instanceManager.listInstances();
    
    const statusList = await Promise.all(
      instances.map(async (instance) => {
        const client = instanceManager.getClient(instance.instance_id);
        let state = "DISCONNECTED";
        let info = null;

        if (client) {
          try {
            state = await client.getState();
            info = client.info || null;
          } catch (e) {
            state = "ERROR";
          }
        }

        return {
          instanceId: instance.instance_id,
          name: instance.name,
          status: instance.status,
          connected: state === "CONNECTED",
          state: state,
          phoneNumber: instance.phone_number || info?.wid?.user || null,
          info: info,
        };
      })
    );

    return {
      success: true,
      instances: statusList,
      total: statusList.length,
      connected: statusList.filter(i => i.connected).length,
    };
  } catch (error) {
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
 * Lista apenas instâncias conectadas (para seleção no Drone)
 * @returns {Promise<Object>} - Lista de instâncias conectadas
 */
async function listarInstanciasConectadas() {
  try {
    const result = await verificarStatusTodasInstancias();
    
    if (!result.success) {
      return result;
    }

    const conectadas = result.instances.filter(i => i.connected);

    return {
      success: true,
      instances: conectadas,
      total: conectadas.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      instances: [],
      total: 0,
    };
  }
}

module.exports = {
  verificarStatusCliente,
  verificarStatusTodasInstancias,
  listarInstanciasConectadas,
};