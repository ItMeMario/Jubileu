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
 * @returns {Object} Resultado do disparo com estatísticas
 */
async function executeDroneDispatch(messageId) {
  const result = {
    sent: 0,
    failed: 0,
    total: 0,
    errors: [],
  };


    // Verificar se há números na lista
    if (numbersList.length === 0) {
      throw new Error("Nenhum número na lista para disparo.");
    }

    // Buscar a mensagem
    const message = await getMessageById(messageId);

    result.total = numbersList.length;

    console.log(`🚁 Iniciando disparo para ${numbersList.length} números...`);
    console.log(
      `💬 Mensagem: "${message.message_content.substring(0, 50)}${
        message.message_content.length > 50 ? "..." : ""
      }"`
    );

    // Processar cada número
    for (let i = 0; i < numbersList.length; i++) {
      const number = numbersList[i];

      try {
        console.log(`📤 Enviando ${i + 1}/${numbersList.length}: ${number}`);

        const success = await droneService.sendDroneMessage(
          number,
          message.message_content
        );

        if (success) {
          result.sent++;
          console.log(`✅ Enviado para: ${number}`);
        } else {
          result.failed++;
          result.errors.push(`Falha ao enviar para: ${number}`);
          console.log(`❌ Falhou para: ${number}`);
        }

        // Delay entre envios para evitar spam
        if (i < numbersList.length - 1) {
          console.log(`⏳ Aguardando 2 segundos...`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (error) {
        result.failed++;
        result.errors.push(`Erro para ${number}: ${error.message}`);
        console.log(`❌ Erro para ${number}: ${error.message}`);
      }
    }

    // Log do resultado final
    console.log(`\n📊 Disparo concluído:`);
    console.log(`   ✅ Sucessos: ${result.sent}`);
    console.log(`   ❌ Falhas: ${result.failed}`);
    console.log(`   📱 Total: ${result.total}`);

    // Opcional: limpar a lista após o disparo
    const clearAfterDispatch = true; // Pode ser configurável
    if (clearAfterDispatch) {
      numbersList = [];
      console.log(`🗑️ Lista de números limpa automaticamente.`);
    }

    return result;
  } 
/**
 * Retorna estatísticas da lista atual
 * @returns {Object} Estatísticas da lista
 */
async function getNumbersListStats() {
  return {
    count: numbersList.length,
    numbers: [...numbersList],
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

module.exports = {
  listDroneMessages,
  addNumbersToList,
  showNumbersList,
  clearNumbersList,
  executeDroneDispatch,
  getMessageById,
  getNumbersListStats,
  removeNumberFromList,
};
