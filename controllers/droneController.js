const { getDatabaseConnection } = require("../utils/initialize");
const {
  convertToWhatsAppFormat,
  validatePhoneNumber,
} = require("../utils/numberConverter");
const droneService = require("../services/droneService");

// Armazenamento temporário em memória para os números
let numbersList = [];

/**
 * Lista todas as mensagens do tipo 'drone' do banco de dados
 * @returns {Array} Array de mensagens drone
 */
async function listDroneMessages() {
  try {
    const db = await getDatabaseConnection();

    const query = `
      SELECT id, locale, message_type, message_content, created_at 
      FROM messages 
      WHERE message_type = 'drone' 
      ORDER BY created_at DESC
    `;

    const messages = await new Promise((resolve, reject) => {
      db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });

    return messages;
  } catch (error) {
    throw new Error(`Erro ao buscar mensagens drone: ${error.message}`);
  }
}

/**
 * Adiciona números à lista temporária em memória
 * @param {Array} numbers Array de números em vários formatos
 * @returns {Object} Resultado da operação com estatísticas
 */
async function addNumbersToList(numbers) {
  const result = {
    added: 0,
    invalid: [],
    duplicates: 0,
    totalCount: 0,
  };

  try {
    for (const number of numbers) {
      const cleanNumber = number.trim();

      if (!cleanNumber) continue;

      // Validar número
      if (!validatePhoneNumber(cleanNumber)) {
        result.invalid.push(cleanNumber);
        continue;
      }

      // Converter para formato WhatsApp
      const whatsappNumber = convertToWhatsAppFormat(cleanNumber);

      // Verificar duplicata
      if (numbersList.includes(whatsappNumber)) {
        result.duplicates++;
        continue;
      }

      // Adicionar à lista
      numbersList.push(whatsappNumber);
      result.added++;
    }

    result.totalCount = numbersList.length;
    return result;
  } catch (error) {
    throw new Error(`Erro ao adicionar números: ${error.message}`);
  }
}

/**
 * Retorna a lista atual de números
 * @returns {Array} Lista de números em formato WhatsApp
 */
async function showNumbersList() {
  return [...numbersList]; // Retorna uma cópia para evitar modificações externas
}

/**
 * Limpa a lista de números da memória
 * @returns {boolean} Sucesso da operação
 */
async function clearNumbersList() {
  try {
    const previousCount = numbersList.length;
    numbersList = [];

    console.log(`🗑️ ${previousCount} números removidos da lista.`);
    return true;
  } catch (error) {
    throw new Error(`Erro ao limpar lista: ${error.message}`);
  }
}

/**
 * Busca uma mensagem específica por ID
 * @param {number} messageId ID da mensagem
 * @returns {Object} Dados da mensagem
 */
async function getMessageById(messageId) {
  try {
    const db = await getDatabaseConnection();

    const query = `
      SELECT id, locale, message_type, message_content, created_at 
      FROM messages 
      WHERE id = ? AND message_type = 'drone'
    `;

    const message = await new Promise((resolve, reject) => {
      db.get(query, [messageId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });

    if (!message) {
      throw new Error(
        `Mensagem com ID ${messageId} não encontrada ou não é do tipo drone.`
      );
    }

    return message;
  } catch (error) {
    throw new Error(`Erro ao buscar mensagem: ${error.message}`);
  }
}

/**
 * Executa o disparo drone para todos os números da lista
 * @param {number} messageId ID da mensagem a ser enviada
 * @param {Object} options Opções do disparo
 * @returns {Object} Resultado do disparo com estatísticas
 */
async function executeDroneDispatch(messageId, options = {}) {
  const {
    delayMs = 2000,
    clearAfterDispatch = true,
    validateNumbers = false,
  } = options;

  try {
    // Verificar se há números na lista
    if (numbersList.length === 0) {
      throw new Error("Nenhum número na lista para disparo.");
    }

    console.log("🔍 Verificando status do cliente WhatsApp...");

    // Verificar se o cliente está conectado
    if (!droneService.isClientReady()) {
      // Tentar obter mais informações sobre o estado do cliente
      const stats = await droneService.getClientStats();
      console.log("📊 Status detalhado:", stats);
      throw new Error(
        "Cliente WhatsApp não está conectado. Aguarde a conexão."
      );
    }

    console.log("✅ Cliente WhatsApp está conectado e pronto!");

    // Buscar a mensagem
    const message = await getMessageById(messageId);

    console.log(`🚁 Iniciando disparo para ${numbersList.length} números...`);
    console.log(
      `💬 Mensagem: "${message.message_content.substring(0, 50)}${
        message.message_content.length > 50 ? "..." : ""
      }"`
    );

    // Validar números se solicitado
    let validNumbers = [...numbersList];
    if (validateNumbers) {
      console.log("🔍 Validando números...");
      validNumbers = [];

      for (const number of numbersList) {
        const exists = await droneService.checkNumberExists(number);
        if (exists) {
          validNumbers.push(number);
        } else {
          console.log(`⚠️ Número não encontrado no WhatsApp: ${number}`);
        }
      }

      if (validNumbers.length === 0) {
        throw new Error("Nenhum número válido encontrado no WhatsApp.");
      }

      console.log(
        `✅ ${validNumbers.length} números válidos de ${numbersList.length} verificados`
      );
    }

    // Executar disparo usando o service
    const result = await droneService.sendBatchDroneMessages(
      validNumbers,
      message.message_content,
      delayMs
    );

    // Log do resultado final
    console.log(`\n📊 Disparo concluído:`);
    console.log(`   ✅ Sucessos: ${result.sent}`);
    console.log(`   ❌ Falhas: ${result.failed}`);
    console.log(`   📱 Total: ${result.total}`);

    const duration = (result.endTime - result.startTime) / 1000;
    console.log(`   ⏱️ Duração: ${duration.toFixed(1)}s`);

    if (result.errors.length > 0) {
      console.log(`\n⚠️ Detalhes dos erros:`);
      result.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    // Limpar lista após disparo se solicitado
    if (clearAfterDispatch) {
      numbersList = [];
      console.log(`🗑️ Lista de números limpa automaticamente.`);
    }

    return result;
  } catch (error) {
    throw new Error(`Erro durante disparo: ${error.message}`);
  }
}

/**
 * Retorna estatísticas da lista atual
 * @returns {Object} Estatísticas da lista
 */
async function getNumbersListStats() {
  return {
    count: numbersList.length,
    numbers: [...numbersList],
    sample: numbersList.slice(0, 5), // Primeiros 5 números como amostra
    hasNumbers: numbersList.length > 0,
  };
}

/**
 * Remove um número específico da lista
 * @param {string} number Número a ser removido
 * @returns {boolean} Sucesso da operação
 */
async function removeNumberFromList(number) {
  try {
    const whatsappNumber = convertToWhatsAppFormat(number);
    const index = numbersList.indexOf(whatsappNumber);

    if (index > -1) {
      numbersList.splice(index, 1);
      return true;
    }

    return false;
  } catch (error) {
    throw new Error(`Erro ao remover número: ${error.message}`);
  }
}

/**
 * Valida todos os números da lista atual
 * @returns {Object} Resultado da validação
 */
async function validateAllNumbers() {
  if (numbersList.length === 0) {
    return { valid: [], invalid: [], total: 0 };
  }

  const result = { valid: [], invalid: [], total: numbersList.length };

  console.log(`🔍 Validando ${numbersList.length} números...`);

  for (let i = 0; i < numbersList.length; i++) {
    const number = numbersList[i];
    console.log(`📱 Validando ${i + 1}/${numbersList.length}: ${number}`);

    try {
      const exists = await droneService.checkNumberExists(number);
      if (exists) {
        result.valid.push(number);
        console.log(`✅ Válido: ${number}`);
      } else {
        result.invalid.push(number);
        console.log(`❌ Inválido: ${number}`);
      }
    } catch (error) {
      result.invalid.push(number);
      console.log(`❌ Erro ao validar ${number}: ${error.message}`);
    }

    // Pequeno delay para não sobrecarregar
    if (i < numbersList.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  console.log(`\n📊 Validação concluída:`);
  console.log(`   ✅ Válidos: ${result.valid.length}`);
  console.log(`   ❌ Inválidos: ${result.invalid.length}`);

  return result;
}

/**
 * Configura o cliente WhatsApp no droneService
 * @param {Object} client Cliente WhatsApp
 */
function setWhatsAppClient(client) {
  droneService.setWhatsAppClient(client);
  console.log("📱 Cliente WhatsApp configurado no droneController");
}

module.exports = {
  listDroneMessages,
  addNumbersToList,
  showNumbersList,
  clearNumbersList,
  executeDroneDispatch,
  getMessageById,
  getNumbersListStats,
  removeNumberFromList,
  validateAllNumbers,
  setWhatsAppClient,
};
