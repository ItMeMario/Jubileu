// services/droneServiceModules/clientStatusDSM.js
const { droneInstanceManager } = require("./droneInstanceManagerDSM");

/**
 * Verifica o status de conexão do cliente WhatsApp de uma instância específica do Drone
 * @param {string} instanceId - ID da instância (opcional para compatibilidade)
 * @returns {Promise<Object>} - Status do cliente
 */
async function verificarStatusCliente(instanceId = null) {
  try {
    // Se não passou instanceId, tenta pegar a primeira instância conectada do Drone
    if (!instanceId) {
      const instances = await droneInstanceManager.listInstances();
      const connectedInstance = instances.find(i => i.status === "connected");
      
      if (!connectedInstance) {
        return {
          success: false,
          connected: false,
          state: "NO_INSTANCE",
          error: "Nenhuma instância do Drone conectada",
        };
      }
      
      instanceId = connectedInstance.instance_id;
    }

    const client = droneInstanceManager.getClient(instanceId);

    if (!client) {
      return {
        success: false,
        connected: false,
        state: "NOT_INITIALIZED",
        error: "Cliente não inicializado para esta instância do Drone",
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
 * Verifica o status de todas as instâncias do Drone
 * @returns {Promise<Object>} - Status de todas as instâncias
 */
async function verificarStatusTodasInstancias() {
  try {
    const instances = await droneInstanceManager.listInstances();
    
    const statusList = await Promise.all(
      instances.map(async (instance) => {
        const client = droneInstanceManager.getClient(instance.instance_id);
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
 * Lista apenas instâncias conectadas do Drone
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