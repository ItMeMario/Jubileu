const { getDatabaseConnection } = require("../utils/initialize");

/**
 * Extrai o código do convite de um link do WhatsApp
 */
async function extractInviteCode(link) {
  try {
    if (!link || typeof link !== "string") {
      return null;
    }

    const whatsappLinkRegex = /https:\/\/chat\.whatsapp\.com\/([A-Za-z0-9_-]+)/;
    const match = link.match(whatsappLinkRegex);

    return match && match[1] ? match[1] : null;
  } catch (error) {
    console.log(`Erro ao extrair código do convite: ${error.message}`);
    return null;
  }
}

/**
 * Busca informações do grupo usando diferentes métodos disponíveis
 */
async function fetchGroupInfoFromWhatsApp(client, inviteCode) {
  try {
    if (!client || !inviteCode) {
      return null;
    }

    // Verifica se o client está pronto
    if (!client.info || !client.info.wid) {
      return null;
    }

    // Método 1: getInviteInfo (principal)
    try {
      if (typeof client.getInviteInfo === "function") {
        const groupInfo = await client.getInviteInfo(inviteCode);

        if (groupInfo) {
          let groupId = null;
          if (typeof groupInfo === "string") {
            groupId = groupInfo;
          } else if (groupInfo.id) {
            groupId =
              typeof groupInfo.id === "object"
                ? JSON.stringify(groupInfo.id)
                : String(groupInfo.id);
          } else if (groupInfo._serialized) {
            groupId = groupInfo._serialized;
          }

          if (groupId) {
            return {
              id: groupId,
              subject: groupInfo.subject || "Sem nome",
            };
          }
        }
      }
    } catch (error) {
      // Método falhou, continua para próximo
    }

    // Método 3: Construção manual do ID
    try {
      const constructedId = `${inviteCode}@g.us`;

      // Tenta verificar se o grupo existe
      if (typeof client.getChatById === "function") {
        try {
          const chat = await client.getChatById(constructedId);
          if (chat && chat.id) {
            return {
              id:
                typeof chat.id === "object" && chat.id._serialized
                  ? chat.id._serialized
                  : String(chat.id),
              subject: chat.name || "Sem nome",
            };
          }
        } catch (chatError) {
          // Chat não encontrado, continua
        }
      }

      // Retorna ID construído como fallback
      return {
        id: constructedId,
        subject: "Desconhecido",
      };
    } catch (error) {
      // Método falhou
    }

    return null;
  } catch (error) {
    console.log(`Erro ao buscar informações do grupo: ${error.message}`);
    return null;
  }
}

/**
 * Atualiza o link_id de uma cidade no banco de dados
 */
async function updateCityLinkId(cityId, groupId) {
  let db;
  try {
    db = await getDatabaseConnection();
    const linkIdValue = groupId ? String(groupId) : "0";

    const changes = await new Promise((resolve, reject) => {
      db.run(
        `UPDATE cities SET link_id = ? WHERE id = ?`,
        [linkIdValue, cityId],
        function (err) {
          if (err) return reject(err);
          resolve(this.changes);
        }
      );
    });

    return changes > 0;
  } catch (error) {
    console.log(`Erro ao atualizar link_id da cidade: ${error.message}`);
    return false;
  } finally {
    if (db && typeof db.close === "function") {
      db.close();
    }
  }
}

/**
 * Busca todas as cidades que não possuem link_id definido
 */
async function getCitiesWithoutLinkId() {
  let db;
  try {
    db = await getDatabaseConnection();

    const rows = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, name, link FROM cities WHERE (link_id IS NULL OR link_id = '' OR link_id = '0') AND link IS NOT NULL AND link != ''`,
        [],
        (err, result) => (err ? reject(err) : resolve(result))
      );
    });

    return rows || [];
  } catch (error) {
    console.log(`Erro ao buscar cidades sem link_id: ${error.message}`);
    return [];
  } finally {
    if (db && typeof db.close === "function") {
      db.close();
    }
  }
}

/**
 * Processa uma única cidade para extrair e salvar o ID do grupo
 */
async function processSingleCity(client, city) {
  try {
    const inviteCode = await extractInviteCode(city.link);

    if (!inviteCode) {
      await updateCityLinkId(city.id, "0");
      return false;
    }

    const groupInfo = await fetchGroupInfoFromWhatsApp(client, inviteCode);

    if (!groupInfo || !groupInfo.id) {
      await updateCityLinkId(city.id, "0");
      return false;
    }

    const updated = await updateCityLinkId(city.id, groupInfo.id);

    if (updated) {
      // LOG PRINCIPAL: Cidade e seu link_id
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
 * Extrai IDs de grupos para todas as cidades que não possuem link_id
 */
async function extractAllGroupIds(client) {
  try {
    if (!client) {
      console.log("❌ Client do WhatsApp não fornecido");
      return false;
    }

    const cities = await getCitiesWithoutLinkId();

    if (cities.length === 0) {
      console.log("ℹ️ Todas as cidades já possuem link_id definido");
      return true;
    }

    console.log(`📋 Processando ${cities.length} cidade(s):`);

    for (const city of cities) {
      await processSingleCity(client, city);
      // Delay opcional (descomente se necessário)
      // await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return true;
  } catch (error) {
    console.log(`❌ Erro durante extração: ${error.message}`);
    return false;
  }
}

/**
 * Função principal - executa 5 segundos após o bot iniciar
 */
async function startBackgroundExtraction(client) {
  try {
    console.log("🚀 Extração de IDs de grupos iniciará em 5 segundos...");

    setTimeout(async () => {
      console.log("⏰ Iniciando extração...");

      const success = await extractAllGroupIds(client);

      if (success) {
        console.log("🎉 Extração concluída!");
      } else {
        console.log("⚠️ Extração falhou");
      }
    }, 5000); // 5 segundos
  } catch (error) {
    console.log(`❌ Erro na extração: ${error.message}`);
  }
}

module.exports = {
  extractInviteCode,
  fetchGroupInfoFromWhatsApp,
  updateCityLinkId,
  getCitiesWithoutLinkId,
  processSingleCity,
  extractAllGroupIds,
  startBackgroundExtraction,
};
