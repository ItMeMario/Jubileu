const { getDatabaseConnection } = require("../utils/initialize");
const { debug } = require("../services/debugService");

/**
 * Extrai o código do convite de um link do WhatsApp
 * @param {string} link - Link do grupo do WhatsApp
 * @returns {string|null} - Código do convite ou null se inválido
 */
async function extractInviteCode(link) {
  try {
    if (!link || typeof link !== "string") {
      return null;
    }

    // Regex aprimorada para extrair código do link do WhatsApp
    const whatsappLinkRegex = /https:\/\/chat\.whatsapp\.com\/([A-Za-z0-9_-]+)/;
    const match = link.match(whatsappLinkRegex);

    if (match && match[1]) {
      await debug(`✅ Código extraído com sucesso: ${match[1]}`);
      return match[1];
    }

    await debug(`⚠️ Link não é um link válido do WhatsApp: ${link}`);
    return null;
  } catch (error) {
    await debug(`❌ Erro ao extrair código do convite: ${error.message}`);
    return null;
  }
}

/**
 * Busca informações do grupo usando diferentes métodos disponíveis
 * @param {object} client - Instância do client do WhatsApp Web.js
 * @param {string} inviteCode - Código do convite do grupo
 * @returns {object|null} - Informações do grupo ou null se não encontrado
 */
async function fetchGroupInfoFromWhatsApp(client, inviteCode) {
  try {
    if (!client || !inviteCode) {
      await debug(`❌ Client ou inviteCode não fornecido`);
      return null;
    }

    // Verifica se o client está pronto
    if (!client.info || !client.info.wid) {
      await debug(`⚠️ Client do WhatsApp não está pronto para usar`);
      return null;
    }

    await debug(
      `🔍 Tentando obter informações do grupo para código: ${inviteCode}`
    );

    // Método 1: Tenta getInviteInfo (pode estar disponível)
    try {
      if (typeof client.getInviteInfo === "function") {
        await debug(`📱 Tentando método getInviteInfo...`);
        const groupInfo = await client.getInviteInfo(inviteCode);

        if (groupInfo) {
          await debug(
            `✅ Informações obtidas via getInviteInfo: ${JSON.stringify(
              groupInfo
            )}`
          );

          // Extrai o ID de forma mais robusta
          let groupId = null;
          if (typeof groupInfo === "string") {
            groupId = groupInfo;
          } else if (groupInfo.id) {
            // Se groupInfo.id é um objeto, converte para string
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
              size: groupInfo.size || 0,
              owner: groupInfo.owner || null,
              desc: groupInfo.desc || "",
              method: "getInviteInfo",
            };
          }
        }
      }
    } catch (error) {
      await debug(`⚠️ Método getInviteInfo falhou: ${error.message}`);
    }

    // Método 2: Tenta acceptInvite para obter informações (sem aceitar)
    try {
      if (typeof client.acceptInvite === "function") {
        await debug(`📱 Tentando método alternativo...`);
        // Nota: Este método pode aceitar o convite, use com cuidado
        // const result = await client.acceptInvite(inviteCode);
        // Por segurança, vamos pular este método por enquanto
      }
    } catch (error) {
      await debug(`⚠️ Método alternativo falhou: ${error.message}`);
    }

    // Método 3: Constrói o ID baseado no padrão do WhatsApp
    try {
      await debug(`🔨 Construindo ID baseado no código do convite...`);
      // Formato típico do WhatsApp: código@g.us
      const constructedId = `${inviteCode}@g.us`;

      // Tenta verificar se o grupo existe
      if (typeof client.getChatById === "function") {
        try {
          const chat = await client.getChatById(constructedId);
          if (chat && chat.id) {
            await debug(
              `✅ Grupo encontrado via ID construído: ${constructedId}`
            );
            return {
              id:
                typeof chat.id === "object" && chat.id._serialized
                  ? chat.id._serialized
                  : String(chat.id),
              subject: chat.name || "Sem nome",
              size: chat.participants ? chat.participants.length : 0,
              owner: null,
              desc: chat.description || "",
              method: "constructed",
            };
          }
        } catch (chatError) {
          await debug(
            `⚠️ Chat não encontrado com ID construído: ${chatError.message}`
          );
        }
      }

      // Se não conseguiu verificar, retorna o ID construído mesmo assim
      return {
        id: constructedId,
        subject: "Desconhecido",
        size: 0,
        owner: null,
        desc: "",
        method: "fallback",
      };
    } catch (error) {
      await debug(`❌ Erro no método de construção: ${error.message}`);
    }

    await debug(`❌ Nenhum método funcionou para obter informações do grupo`);
    return null;
  } catch (error) {
    await debug(
      `❌ Erro geral ao buscar informações do grupo: ${error.message}`
    );
    return null;
  }
}

/**
 * Atualiza o link_id de uma cidade no banco de dados
 * @param {number} cityId - ID da cidade no banco
 * @param {string|null} groupId - ID do grupo do WhatsApp ou null para link inválido
 * @returns {boolean} - true se atualizado com sucesso
 */
async function updateCityLinkId(cityId, groupId) {
  let db;
  try {
    db = await getDatabaseConnection();

    // Garante que o groupId seja uma string válida
    const linkIdValue = groupId ? String(groupId) : "0";

    await debug(`🔄 Atualizando cidade ${cityId} com link_id: ${linkIdValue}`);

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

    if (changes === 0) {
      await debug(
        `⚠️ Nenhuma cidade encontrada com ID ${cityId} para atualizar link_id`
      );
      return false;
    }

    await debug(
      `✅ Cidade ${cityId} atualizada com sucesso: link_id = ${linkIdValue}`
    );
    return true;
  } catch (error) {
    await debug(`❌ Erro ao atualizar link_id da cidade: ${error.message}`);
    return false;
  } finally {
    if (db && typeof db.close === "function") {
      db.close();
    }
  }
}

/**
 * Busca todas as cidades que não possuem link_id definido
 * @returns {Array} - Array de cidades sem link_id
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
    await debug(`❌ Erro ao buscar cidades sem link_id: ${error.message}`);
    return [];
  } finally {
    if (db && typeof db.close === "function") {
      db.close();
    }
  }
}

/**
 * Processa uma única cidade para extrair e salvar o ID do grupo
 * @param {object} client - Instância do client do WhatsApp Web.js
 * @param {object} city - Objeto da cidade com id, name e link
 * @returns {boolean} - true se processado com sucesso
 */
async function processSingleCity(client, city) {
  try {
    await debug(`🏙️ Processando cidade: ${city.name}`);
    await debug(`🔗 Link da cidade: ${city.link}`);

    const inviteCode = await extractInviteCode(city.link);

    if (!inviteCode) {
      await debug(
        `⚠️ Não foi possível extrair código do convite para cidade: ${city.name}`
      );
      await updateCityLinkId(city.id, "0");
      return true;
    }

    const groupInfo = await fetchGroupInfoFromWhatsApp(client, inviteCode);

    if (!groupInfo || !groupInfo.id) {
      await debug(
        `⚠️ Não foi possível obter informações do grupo para cidade: ${city.name}`
      );
      await updateCityLinkId(city.id, "0");
      return true;
    }

    // Debug detalhado das informações obtidas
    await debug(`📊 Informações do grupo obtidas:`);
    await debug(`   - ID: ${groupInfo.id}`);
    await debug(`   - Nome: ${groupInfo.subject}`);
    await debug(`   - Método: ${groupInfo.method}`);
    await debug(`   - Tamanho: ${groupInfo.size}`);

    const updated = await updateCityLinkId(city.id, groupInfo.id);

    if (updated) {
      await debug(`✅ Cidade processada com sucesso: ${city.name}`);
      return true;
    }

    await debug(`❌ Falha ao atualizar cidade: ${city.name}`);
    return false;
  } catch (error) {
    await debug(`❌ Erro ao processar cidade ${city.name}: ${error.message}`);
    await debug(`📍 Stack trace: ${error.stack}`);
    await updateCityLinkId(city.id, "0");
    return false;
  }
}

/**
 * Lista todos os métodos disponíveis no client
 * @param {object} client - Instância do client do WhatsApp Web.js
 */
async function debugClientMethods(client) {
  try {
    await debug(`🔍 Métodos disponíveis no client:`);
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(client))
      .filter((name) => typeof client[name] === "function")
      .filter((name) => !name.startsWith("_"));

    await debug(`📋 Total de métodos públicos: ${methods.length}`);
    methods.forEach((method) => {
      console.log(`   - ${method}`);
    });

    // Verifica métodos específicos que nos interessam
    const importantMethods = [
      "getInviteInfo",
      "acceptInvite",
      "getChatById",
      "getChats",
      "getGroups",
    ];

    await debug(`🎯 Verificando métodos importantes:`);
    importantMethods.forEach((method) => {
      const exists = typeof client[method] === "function";
      console.log(
        `   - ${method}: ${exists ? "✅ Disponível" : "❌ Não disponível"}`
      );
    });
  } catch (error) {
    await debug(`❌ Erro ao listar métodos do client: ${error.message}`);
  }
}

/**
 * Extrai IDs de grupos para todas as cidades que não possuem link_id
 * @param {object} client - Instância do client do WhatsApp Web.js
 * @returns {object} - Resultado da operação com estatísticas
 */
async function extractAllGroupIds(client) {
  try {
    if (!client) {
      await debug(`❌ Client do WhatsApp não fornecido para extração de IDs`);
      return {
        success: false,
        error: "Client do WhatsApp não fornecido",
        processed: 0,
        successful: 0,
        failed: 0,
        cities: [],
      };
    }

    await debug(`🚀 Iniciando extração de IDs de grupos...`);

    // Debug do client
    await debugClientMethods(client);

    const cities = await getCitiesWithoutLinkId();

    if (cities.length === 0) {
      await debug(`ℹ️ Nenhuma cidade encontrada sem link_id definido`);
      return {
        success: true,
        processed: 0,
        successful: 0,
        failed: 0,
        cities: [],
      };
    }

    await debug(`📋 Encontradas ${cities.length} cidade(s) para processar`);

    let successful = 0;
    let failed = 0;
    const processedCities = [];

    for (const city of cities) {
      const result = await processSingleCity(client, city);

      if (result) {
        successful++;
      } else {
        failed++;
      }

      processedCities.push({
        id: city.id,
        name: city.name,
        success: result,
      });

      // Delay entre processamentos
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    const summary = {
      success: true,
      processed: cities.length,
      successful,
      failed,
      cities: processedCities,
    };

    await debug(
      `🎯 Extração concluída: ${successful} sucessos, ${failed} falhas`
    );
    return summary;
  } catch (error) {
    await debug(`❌ Erro durante extração de IDs de grupos: ${error.message}`);
    return {
      success: false,
      error: error.message,
      processed: 0,
      successful: 0,
      failed: 0,
      cities: [],
    };
  }
}

/**
 * Função para ser chamada quando o client estiver pronto
 */
async function startBackgroundExtraction(client) {
  try {
    await debug(
      `🚀 Iniciando extração automática de IDs de grupos em background...`
    );

    // Verifica se o client está realmente pronto
    if (client && client.info && client.info.wid) {
      await debug(`📱 Client info: ${JSON.stringify(client.info, null, 2)}`);
    } else {
      await debug(`⚠️ Client não parece estar totalmente inicializado`);
    }

    // Delay maior para garantir inicialização completa
    setTimeout(async () => {
      await debug(`⏰ Executando extração após delay de inicialização...`);

      const result = await extractAllGroupIds(client);

      if (result.success && result.processed > 0) {
        await debug(
          `🎉 Extração automática concluída: ${result.successful}/${result.processed} cidades processadas com sucesso`
        );
        await generateExtractionReport(result);
      } else if (result.processed === 0) {
        await debug(`✅ Todas as cidades já possuem link_id definido`);
      } else {
        await debug(
          `⚠️ Extração automática falhou: ${
            result.error || "Erro desconhecido"
          }`
        );
      }
    }, 10000); // Delay de 10 segundos
  } catch (error) {
    await debug(`❌ Erro na extração automática: ${error.message}`);
  }
}

/**
 * Gera um arquivo TXT com o relatório da extração
 * @param {object} result - Resultado da extração
 */
async function generateExtractionReport(result) {
  try {
    const fs = require("fs").promises;
    const path = require("path");

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `extraction_report_${timestamp}.txt`;
    const filepath = path.join(process.cwd(), filename);

    let content = `=== RELATÓRIO DE EXTRAÇÃO DE IDs DE GRUPOS ===\n`;
    content += `Data/Hora: ${new Date().toLocaleString()}\n`;
    content += `Total processado: ${result.processed}\n`;
    content += `Sucessos: ${result.successful}\n`;
    content += `Falhas: ${result.failed}\n\n`;

    content += `=== DETALHES POR CIDADE ===\n`;

    let db;
    try {
      db = await getDatabaseConnection();

      for (const city of result.cities) {
        const cityDetails = await new Promise((resolve, reject) => {
          db.get(
            `SELECT name, link, link_id FROM cities WHERE id = ?`,
            [city.id],
            (err, result) => (err ? reject(err) : resolve(result))
          );
        });

        if (cityDetails) {
          content += `\nCidade: ${cityDetails.name}\n`;
          content += `Link: ${cityDetails.link}\n`;
          content += `Link ID: ${cityDetails.link_id || "null"}\n`;
          content += `Status: ${city.success ? "SUCESSO" : "FALHA"}\n`;
          content += `${"=".repeat(50)}\n`;
        }
      }
    } finally {
      if (db && typeof db.close === "function") {
        db.close();
      }
    }

    await fs.writeFile(filepath, content, "utf8");
    await debug(`📄 Relatório gerado: ${filepath}`);
  } catch (error) {
    await debug(`❌ Erro ao gerar relatório: ${error.message}`);
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
  debugClientMethods, // Nova função para debug
};
