const { getDatabaseConnection } = require("../utils/initialize");

// Flag para evitar execução duplicada
let isExtracting = false;

/**
 * Extrai o código do convite de um link do WhatsApp
 */
function extractInviteCode(link) {
  if (!link || typeof link !== "string") return null;

  const match = link.match(/https:\/\/chat\.whatsapp\.com\/([A-Za-z0-9_-]+)/);
  return match?.[1] || null;
}

/**
 * Busca informações do grupo usando diferentes métodos disponíveis
 */
async function fetchGroupInfo(client, inviteCode) {
  if (!client?.info?.wid || !inviteCode) return null;

  try {
    // Método 1: getInviteInfo
    if (typeof client.getInviteInfo === "function") {
      const groupInfo = await client.getInviteInfo(inviteCode);
      if (groupInfo) {
        const groupId =
          typeof groupInfo === "string"
            ? groupInfo
            : groupInfo.id?._serialized ||
              groupInfo._serialized ||
              JSON.stringify(groupInfo.id || groupInfo);

        if (groupId) {
          return {
            id: groupId,
            subject: groupInfo.subject || "Sem nome",
          };
        }
      }
    }
  } catch (error) {
    // Continua para próximo método
  }

  try {
    // Método 2: Construção manual + verificação
    const constructedId = `${inviteCode}@g.us`;

    if (typeof client.getChatById === "function") {
      const chat = await client.getChatById(constructedId);
      if (chat?.id) {
        return {
          id: chat.id._serialized || String(chat.id),
          subject: chat.name || "Sem nome",
        };
      }
    }

    // Fallback: ID construído
    return { id: constructedId, subject: "Desconhecido" };
  } catch (error) {
    return null;
  }
}

/**
 * Operações de banco de dados
 */
async function dbOperation(operation) {
  const db = await getDatabaseConnection();
  try {
    return await new Promise((resolve, reject) => {
      operation(db, (err, result) => (err ? reject(err) : resolve(result)));
    });
  } finally {
    if (db?.close) db.close();
  }
}

async function getCitiesWithoutLinkId() {
  return await dbOperation((db, callback) => {
    db.all(
      `SELECT id, name, link FROM cities 
       WHERE (link_id IS NULL OR link_id = '' OR link_id = '0') 
       AND link IS NOT NULL AND link != ''`,
      [],
      callback
    );
  }).catch(() => []);
}

async function updateCityLinkId(cityId, groupId) {
  const changes = await dbOperation((db, callback) => {
    db.run(
      `UPDATE cities SET link_id = ? WHERE id = ?`,
      [groupId ? String(groupId) : "0", cityId],
      function (err) {
        callback(err, this.changes);
      }
    );
  }).catch(() => 0);

  return changes > 0;
}

/**
 * Processa uma única cidade
 */
async function processSingleCity(client, city) {
  try {
    const inviteCode = extractInviteCode(city.link);
    if (!inviteCode) {
      await updateCityLinkId(city.id, "0");
      return false;
    }

    const groupInfo = await fetchGroupInfo(client, inviteCode);
    if (!groupInfo?.id) {
      await updateCityLinkId(city.id, "0");
      return false;
    }

    const updated = await updateCityLinkId(city.id, groupInfo.id);
    if (updated) {
      console.log(`✅ ${city.name}: ${groupInfo.id}`);
      return true;
    }

    return false;
  } catch (error) {
    console.log(`Erro ao processar cidade ${city.name}: ${error.message}`);
    await updateCityLinkId(city.id, "0");
    return false;
  }
}

/**
 * Extrai IDs de grupos para todas as cidades
 */
async function extractAllGroupIds(client) {
  if (isExtracting) {
    console.log("ℹ️ Extração já em andamento, ignorando...");
    return false;
  }

  if (!client) {
    console.log("❌ Client do WhatsApp não fornecido");
    return false;
  }

  isExtracting = true;
  try {
    const cities = await getCitiesWithoutLinkId();

    if (cities.length === 0) {
      console.log("ℹ️ Todas as cidades já possuem link_id definido");
      return true;
    }

    console.log(`📋 Processando ${cities.length} cidade(s):`);

    for (const city of cities) {
      await processSingleCity(client, city);
      // Delay opcional entre processamentos
      // await new Promise(resolve => setTimeout(resolve, 500));
    }

    return true;
  } catch (error) {
    console.log(`❌ Erro durante extração: ${error.message}`);
    return false;
  } finally {
    isExtracting = false;
  }
}

/**
 * Função principal - inicia extração com delay e proteção contra duplicação
 */
async function startBackgroundExtraction(client, delay = 5000) {
  if (isExtracting) {
    console.log("ℹ️ Extração já iniciada, ignorando nova solicitação");
    return;
  }

  try {
    console.log(
      `🚀 Extração de IDs de grupos iniciará em ${delay / 1000} segundos...`
    );

    setTimeout(async () => {
      if (isExtracting) return; // Double check

      console.log("⏰ Iniciando extração...");
      const success = await extractAllGroupIds(client);

      console.log(success ? "🎉 Extração concluída!" : "⚠️ Extração falhou");
    }, delay);
  } catch (error) {
    console.log(`❌ Erro na extração: ${error.message}`);
    isExtracting = false;
  }
}

// Função para resetar flag (útil para testes)
function resetExtractionFlag() {
  isExtracting = false;
}

module.exports = {
  extractInviteCode,
  fetchGroupInfo,
  updateCityLinkId,
  getCitiesWithoutLinkId,
  processSingleCity,
  extractAllGroupIds,
  startBackgroundExtraction,
  resetExtractionFlag,
};
