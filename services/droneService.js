// droneService.js - Serviço responsável pelos disparos de mensagens
const { debug } = require("./debugService");

// Referência para o cliente WhatsApp (será definida externamente)
let whatsappClient = null;

/**
 * Define o cliente WhatsApp para usar nos disparos
 * @param {Object} client - Instância do cliente WhatsApp
 */
function setWhatsAppClient(client) {
  whatsappClient = client;
  console.log("📱 Cliente WhatsApp configurado no droneService");
  debug("📱 Cliente WhatsApp configurado no droneService");
}

/**
 * Verifica se o cliente WhatsApp está disponível e conectado
 * @returns {boolean} Status da conexão
 */
function isClientReady() {
  if (!whatsappClient) {
    console.log("❌ Cliente WhatsApp não foi configurado");
    return false;
  }

  try {
    // Verifica se o cliente tem a propriedade info (indica que está conectado)
    const hasInfo = whatsappClient.info !== undefined;
    console.log(
      `🔍 Status do cliente: ${hasInfo ? "Conectado" : "Desconectado"}`
    );
    return hasInfo;
  } catch (error) {
    console.log(`❌ Erro ao verificar status do cliente: ${error.message}`);
    return false;
  }
}

/**
 * Envia uma mensagem drone para um número específico
 * @param {string} number - Número no formato WhatsApp (com @c.us)
 * @param {string} messageContent - Conteúdo da mensagem
 * @returns {Promise<boolean>} Sucesso do envio
 */
async function sendDroneMessage(number, messageContent) {
  try {
    // Verifica se o cliente está pronto
    if (!isClientReady()) {
      throw new Error("Cliente WhatsApp não está conectado");
    }

    // Garante que o número está no formato correto
    let formattedNumber = number;
    if (!number.includes("@c.us")) {
      formattedNumber = `${number}@c.us`;
    }

    // Remove caracteres especiais do número se necessário
    formattedNumber = formattedNumber.replace(/[^\d@c.us]/g, "");

    // Verifica se o número é válido
    if (!formattedNumber.match(/^\d+@c\.us$/)) {
      throw new Error(`Número inválido: ${number}`);
    }

    await debug(`📤 Enviando mensagem para: ${formattedNumber}`);

    // Envia a mensagem
    const message = await whatsappClient.sendMessage(
      formattedNumber,
      messageContent
    );

    if (message) {
      await debug(`✅ Mensagem enviada com sucesso para: ${formattedNumber}`);
      return true;
    } else {
      await debug(`❌ Falha ao enviar mensagem para: ${formattedNumber}`);
      return false;
    }
  } catch (error) {
    await debug(`❌ Erro ao enviar mensagem para ${number}: ${error.message}`);
    throw new Error(`Falha no envio: ${error.message}`);
  }
}

/**
 * Envia mensagem para múltiplos números (disparo em lote)
 * @param {Array<string>} numbers - Array de números
 * @param {string} messageContent - Conteúdo da mensagem
 * @param {number} delayMs - Delay entre envios em millisegundos (padrão: 2000)
 * @returns {Promise<Object>} Resultado do disparo com estatísticas
 */
async function sendBatchDroneMessages(numbers, messageContent, delayMs = 2000) {
  const result = {
    sent: 0,
    failed: 0,
    total: numbers.length,
    errors: [],
    startTime: new Date(),
    endTime: null,
  };

  try {
    if (!isClientReady()) {
      throw new Error("Cliente WhatsApp não está conectado");
    }

    if (!numbers || numbers.length === 0) {
      throw new Error("Nenhum número fornecido para disparo");
    }

    await debug(`🚁 Iniciando disparo em lote para ${numbers.length} números`);

    for (let i = 0; i < numbers.length; i++) {
      const number = numbers[i];

      try {
        console.log(`📤 Enviando ${i + 1}/${numbers.length}: ${number}`);

        const success = await sendDroneMessage(number, messageContent);

        if (success) {
          result.sent++;
          console.log(`✅ ${i + 1}/${numbers.length} - Sucesso: ${number}`);
        } else {
          result.failed++;
          result.errors.push(`Falha ao enviar para: ${number}`);
          console.log(`❌ ${i + 1}/${numbers.length} - Falhou: ${number}`);
        }
      } catch (error) {
        result.failed++;
        result.errors.push(`Erro para ${number}: ${error.message}`);
        console.log(
          `❌ ${i + 1}/${numbers.length} - Erro: ${number} (${error.message})`
        );
      }

      // Delay entre envios (exceto no último)
      if (i < numbers.length - 1 && delayMs > 0) {
        console.log(`⏳ Aguardando ${delayMs / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    result.endTime = new Date();
    const duration = (result.endTime - result.startTime) / 1000;

    await debug(
      `🏁 Disparo concluído em ${duration}s - Sucessos: ${result.sent}, Falhas: ${result.failed}`
    );

    return result;
  } catch (error) {
    result.endTime = new Date();
    await debug(`❌ Erro no disparo em lote: ${error.message}`);
    throw error;
  }
}

/**
 * Verifica se um número está disponível no WhatsApp
 * @param {string} number - Número para verificar
 * @returns {Promise<boolean>} Se o número existe no WhatsApp
 */
async function checkNumberExists(number) {
  try {
    if (!isClientReady()) {
      throw new Error("Cliente WhatsApp não está conectado");
    }

    // Formata o número
    let formattedNumber = number;
    if (!number.includes("@c.us")) {
      formattedNumber = `${number}@c.us`;
    }

    // Verifica se o número está registrado no WhatsApp
    const isRegistered = await whatsappClient.isRegisteredUser(formattedNumber);

    await debug(
      `🔍 Verificação de número ${formattedNumber}: ${
        isRegistered ? "Existe" : "Não existe"
      }`
    );

    return isRegistered;
  } catch (error) {
    await debug(`❌ Erro ao verificar número ${number}: ${error.message}`);
    return false;
  }
}

/**
 * Obtém informações sobre um chat/número
 * @param {string} number - Número para obter informações
 * @returns {Promise<Object|null>} Informações do chat ou null se não encontrado
 */
async function getChatInfo(number) {
  try {
    if (!isClientReady()) {
      throw new Error("Cliente WhatsApp não está conectado");
    }

    let formattedNumber = number;
    if (!number.includes("@c.us")) {
      formattedNumber = `${number}@c.us`;
    }

    const chat = await whatsappClient.getChatById(formattedNumber);

    return {
      id: chat.id._serialized,
      name: chat.name || chat.id.user,
      isGroup: chat.isGroup,
      timestamp: chat.timestamp,
      unreadCount: chat.unreadCount,
    };
  } catch (error) {
    await debug(
      `❌ Erro ao obter informações do chat ${number}: ${error.message}`
    );
    return null;
  }
}

/**
 * Obtém estatísticas do cliente WhatsApp
 * @returns {Promise<Object>} Estatísticas do cliente
 */
async function getClientStats() {
  try {
    if (!whatsappClient) {
      return {
        connected: false,
        error: "Cliente não foi configurado",
      };
    }

    // Verifica diferentes propriedades para determinar o status
    const hasInfo = whatsappClient.info !== undefined;
    const puppeteer = whatsappClient.pupPage !== undefined;

    if (!hasInfo) {
      return {
        connected: false,
        error: "Cliente não tem informações (ainda não conectou)",
        debug: {
          hasInfo: hasInfo,
          hasPuppeteer: puppeteer,
          clientState: whatsappClient.state || "unknown",
        },
      };
    }

    const info = await whatsappClient.info;
    const chats = await whatsappClient.getChats();

    return {
      connected: true,
      user: {
        number: info.wid.user,
        name: info.pushname || "N/A",
      },
      chats: {
        total: chats.length,
        individual: chats.filter((chat) => !chat.isGroup).length,
        groups: chats.filter((chat) => chat.isGroup).length,
      },
      battery: info.battery || "N/A",
      platform: info.platform || "N/A",
    };
  } catch (error) {
    await debug(`❌ Erro ao obter estatísticas: ${error.message}`);
    return {
      connected: false,
      error: error.message,
      debug: {
        hasClient: !!whatsappClient,
        clientType: typeof whatsappClient,
      },
    };
  }
}

module.exports = {
  setWhatsAppClient,
  isClientReady,
  sendDroneMessage,
  sendBatchDroneMessages,
  checkNumberExists,
  getChatInfo,
  getClientStats,
};
