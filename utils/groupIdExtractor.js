const { getDatabaseConnection } = require("../utils/initialize");
const { debug } = require("../services/debugService");

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

// MUDANÇA: Busca TODAS as cidades com link (incluindo as que já têm link_id)
async function getCitiesForProcessing() {
  return await dbOperation((db, callback) => {
    db.all(
      `SELECT id, name, link, link_id FROM cities 
       WHERE link IS NOT NULL AND link != ''`,
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
 * MUDANÇA: Processa uma única cidade - sempre atualiza baseado no link atual
 */
async function processSingleCity(client, city) {
  try {
    const inviteCode = extractInviteCode(city.link);

    // Link inválido ou não é do WhatsApp
    if (!inviteCode) {
      const updated = await updateCityLinkId(city.id, "0");
      if (updated && city.link_id !== "0") {
        await debug(`🔄 ${city.name}: Link inválido → 0`);
      }
      return updated;
    }

    // Link válido do WhatsApp
    const groupInfo = await fetchGroupInfo(client, inviteCode);
    if (!groupInfo?.id) {
      const updated = await updateCityLinkId(city.id, "0");
      if (updated && city.link_id !== "0") {
        await debug(`⚠️ ${city.name}: Grupo não encontrado → 0`);
      }
      return updated;
    }

    // Atualiza com o ID do grupo
    const updated = await updateCityLinkId(city.id, groupInfo.id);
    if (updated) {
      const action =
        city.link_id !== groupInfo.id ? "atualizado" : "confirmado";
      await debug(`✅ ${city.name}: ${groupInfo.id} (${action})`);
      return true;
    }

    return false;
  } catch (error) {
    await debug(`❌ Erro ao processar cidade ${city.name}: ${error.message}`);
    await updateCityLinkId(city.id, "0");
    return false;
  }
}

/**
 * MUDANÇA: Extrai IDs de grupos para todas as cidades (não só as sem link_id)
 */
async function extractAllGroupIds(client) {
  if (isExtracting) {
    await debug("ℹ️ Extração já em andamento, ignorando...");
    return false;
  }

  if (!client) {
    await debug("❌ Client do WhatsApp não fornecido");
    return false;
  }

  isExtracting = true;
  try {
    const cities = await getCitiesForProcessing();

    if (cities.length === 0) {
      await debug("ℹ️ Nenhuma cidade com link para processar");
      return true;
    }

    await debug(`📋 Processando ${cities.length} cidade(s):`);

    let processed = 0;
    for (const city of cities) {
      const success = await processSingleCity(client, city);
      if (success) processed++;
      // Delay opcional entre processamentos
      // await new Promise(resolve => setTimeout(resolve, 500));
    }

    await debug(`📊 ${processed}/${cities.length} cidades processadas`);
    return true;
  } catch (error) {
    await debug(`❌ Erro durante extração: ${error.message}`);
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
    await debug("ℹ️ Extração já iniciada, ignorando nova solicitação");
    return;
  }

  try {
    await debug(
      `🚀 Extração de IDs de grupos iniciará em ${delay / 1000} segundos...`
    );

    setTimeout(async () => {
      if (isExtracting) return; // Double check

      await debug("⏰ Iniciando extração...");
      const success = await extractAllGroupIds(client);

      await debug(success ? "🎉 Extração concluída!" : "⚠️ Extração falhou");
    }, delay);
  } catch (error) {
    await debug(`❌ Erro na extração: ${error.message}`);
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
  getCitiesForProcessing,
  processSingleCity,
  extractAllGroupIds,
  startBackgroundExtraction,
  resetExtractionFlag,
};
