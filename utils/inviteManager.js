// inviteManager.js - Módulo para gerenciar convites e verificar participação em grupos
const delay = require("../utils/delay");
const { debug } = require("../services/debugService");

class InviteManager {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000;
    // Adiciona controle de tentativas para revalidação inteligente
    this.revalidationAttempts = new Map();
  }

  extractGroupIdFromLink(groupLink) {
    if (!groupLink || typeof groupLink !== "string" || groupLink.trim() === "")
      return null;
    const match = groupLink.match(
      /(?:https?:\/\/)?(?:www\.)?(?:chat\.)?whatsapp\.com\/(?:invite\/)?([A-Za-z0-9_-]+)/i
    );
    return match ? match[1] : null;
  }

  isValidWhatsAppLink(groupLink) {
    if (!groupLink || typeof groupLink !== "string" || groupLink.trim() === "")
      return false;
    return /(?:https?:\/\/)?(?:www\.)?(?:chat\.)?whatsapp\.com\/(?:invite\/)?[A-Za-z0-9_-]+/i.test(
      groupLink
    );
  }

  normalizeUserNumber(userNumber) {
    if (!userNumber) return "";
    let normalized = userNumber.replace(/[\s\-\(\)]/g, "");
    if (!normalized.endsWith("@c.us")) {
      normalized = normalized.replace("@", "") + "@c.us";
    }
    return normalized;
  }

  async resolveGroupIdFromInviteCode(client, inviteCode) {
    const chats = await client.getChats();
    const groupChats = chats.filter((chat) => chat.isGroup);

    for (const group of groupChats) {
      try {
        const currentInviteCode = await group.getInviteCode();
        if (currentInviteCode === inviteCode) {
          return group.id._serialized;
        }
      } catch (_) {
        continue;
      }
    }

    return null;
  }

  // Método para verificar se o cache deve ser revalidado
  async shouldRevalidateCache(cacheKey, cached) {
    const now = Date.now();

    // Se o cache expirou, sempre revalidar
    if (now - cached.timestamp >= this.cacheExpiry) {
      return true;
    }

    // NOVA LÓGICA MAIS AMIGÁVEL:
    // Se o resultado anterior foi "não está no grupo", sempre revalida na próxima consulta
    // Mas com proteção contra spam (máximo 1 revalidação por minuto)
    if (!cached.isInGroup) {
      const attempts = this.revalidationAttempts.get(cacheKey) || {
        lastAttempt: 0,
      };
      const timeSinceLastAttempt = now - attempts.lastAttempt;

      // Revalida se passou pelo menos 1 minuto da última verificação
      // OU se é a primeira tentativa após o cache negativo
      if (attempts.lastAttempt === 0 || timeSinceLastAttempt >= 60 * 1000) {
        this.revalidationAttempts.set(cacheKey, {
          lastAttempt: now,
        });

        await debug(`🔄 Revalidando cache negativo para ${cacheKey}`);
        await debug(
          `⏱️ Tempo desde última verificação: ${Math.round(
            timeSinceLastAttempt / 1000
          )}s`
        );
        return true;
      } else {
        const waitTime = Math.ceil((60 * 1000 - timeSinceLastAttempt) / 1000);
        await debug(
          `⏳ Aguardando ${waitTime}s para próxima revalidação de ${cacheKey}`
        );
      }
    }

    return false;
  }

  async isUserInGroup(client, userNumber, groupLink) {
    try {
      const normalizedUserNumber = this.normalizeUserNumber(userNumber);

      if (!this.isValidWhatsAppLink(groupLink)) {
        await debug("⚠️ Link não é válido:", groupLink);
        return { isInGroup: false, error: "Link inválido", isValidLink: false };
      }

      const inviteCode = this.extractGroupIdFromLink(groupLink);
      if (!inviteCode) {
        await debug("❌ Não foi possível extrair código do grupo:", groupLink);
        return {
          isInGroup: false,
          error: "Código inválido",
          isValidLink: false,
        };
      }

      const realGroupId = await this.resolveGroupIdFromInviteCode(
        client,
        inviteCode
      );
      if (!realGroupId) {
        await debug("❌ Grupo não encontrado a partir do código:", inviteCode);
        return {
          isInGroup: false,
          error: "Grupo não encontrado",
          isValidLink: true,
        };
      }

      const cacheKey = `${normalizedUserNumber}-${realGroupId}`;
      const cached = this.cache.get(cacheKey);

      // Verifica se deve usar cache ou revalidar
      if (cached && !(await this.shouldRevalidateCache(cacheKey, cached))) {
        await debug("📋 Usando cache para verificação:", cacheKey);
        return { isInGroup: cached.isInGroup, error: null, isValidLink: true };
      }

      if (cached) {
        await debug("🔄 Cache encontrado mas será revalidado:", cacheKey);
      }

      const directResult = await this.checkGroupDirectly(
        client,
        normalizedUserNumber,
        realGroupId
      );
      if (directResult.success) {
        return {
          isInGroup: directResult.isInGroup,
          error: null,
          isValidLink: true,
        };
      }

      await debug("🔄 Método direto falhou, tentando método alternativo...");
      return await this.checkGroupByAlternativeMethod(
        client,
        normalizedUserNumber,
        realGroupId
      );
    } catch (error) {
      console.error("❌ Erro inesperado:", error.message);
      return {
        isInGroup: false,
        error: `Erro inesperado: ${error.message}`,
        isValidLink: true,
      };
    }
  }

  async checkGroupDirectly(client, userNumber, groupId) {
    try {
      const possibleChatIds = [`${groupId}`, groupId.replace("@g.us", "")];
      let chat = null;

      for (const possibleId of possibleChatIds) {
        try {
          await debug(`🔍 Tentando acessar grupo com ID: ${possibleId}`);
          const chatResult = await Promise.race([
            client.getChatById(possibleId),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Timeout")), 8000)
            ),
          ]);
          if (chatResult && chatResult.isGroup) {
            chat = chatResult;
            break;
          }
        } catch (error) {
          await debug(`⚠️ Falha ao acessar ${possibleId}:`, error.message);
        }
      }

      if (!chat) return { success: false, isInGroup: false };

      const participants = chat.groupMetadata?.participants || [];
      const isInGroup = this.checkUserInParticipants(participants, userNumber);

      // Atualiza o cache com o novo resultado
      const cacheKey = `${userNumber}-${groupId}`;
      this.cache.set(cacheKey, {
        isInGroup,
        timestamp: Date.now(),
      });

      // Se o usuário foi encontrado no grupo, limpa os dados de revalidação
      if (isInGroup) {
        this.revalidationAttempts.delete(cacheKey);
        await debug(
          `✅ Usuário encontrado no grupo - limpando histórico de revalidação`
        );
      }

      await debug(
        `🔍 Usuário ${userNumber} ${
          isInGroup ? "ESTÁ" : "NÃO ESTÁ"
        } no grupo ${groupId}`
      );
      return { success: true, isInGroup };
    } catch (error) {
      await debug("❌ Erro no método direto:", error.message);
      return { success: false, isInGroup: false };
    }
  }

  async checkGroupByAlternativeMethod(client, userNumber, groupId) {
    try {
      await debug(
        "🔍 Usando método alternativo - verificando todos os chats..."
      );

      const chats = await Promise.race([
        client.getChats(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 15000)
        ),
      ]);

      const expectedChatId = groupId;

      const targetChat = chats.find((chat) => {
        if (!chat || !chat.isGroup) return false;

        const chatId = chat.id._serialized || chat.id;
        const metaId =
          chat.groupMetadata?.id?._serialized || chat.groupMetadata?.id;

        return (
          chatId === expectedChatId ||
          chatId.includes(groupId.replace("@g.us", "")) ||
          (typeof metaId === "string" &&
            metaId.includes(groupId.replace("@g.us", "")))
        );
      });

      if (!targetChat) {
        await debug(
          `⚠️ Grupo ${groupId} não encontrado nos ${chats.length} chats disponíveis`
        );
        const sample = chats.filter((c) => c.isGroup).slice(0, 5);
        await debug(
          "📋 Alguns grupos:",
          sample.map((c) => c.id._serialized || c.id)
        );
        return {
          isInGroup: false,
          error: "Grupo não encontrado",
          isValidLink: true,
        };
      }

      const participants = targetChat.groupMetadata?.participants || [];
      const isInGroup = this.checkUserInParticipants(participants, userNumber);

      // Atualiza o cache com o novo resultado
      const cacheKey = `${userNumber}-${groupId}`;
      this.cache.set(cacheKey, {
        isInGroup,
        timestamp: Date.now(),
      });

      // Se o usuário foi encontrado no grupo, limpa os dados de revalidação
      if (isInGroup) {
        this.revalidationAttempts.delete(cacheKey);
        await debug(
          `✅ Usuário encontrado no grupo - limpando histórico de revalidação`
        );
      }

      await debug(
        `🔍 (Alternativo) Usuário ${userNumber} ${
          isInGroup ? "ESTÁ" : "NÃO ESTÁ"
        } no grupo ${groupId}`
      );
      return { isInGroup, error: null, isValidLink: true };
    } catch (error) {
      await debug("❌ Método alternativo falhou:", error.message);
      return {
        isInGroup: false,
        error: `Erro alternativo: ${error.message}`,
        isValidLink: true,
      };
    }
  }

  checkUserInParticipants(participants, userNumber) {
    if (!Array.isArray(participants)) return false;
    const cleanUser = userNumber.replace("@c.us", "");
    return participants.some((p) => {
      const id = p.id._serialized || p.id;
      const cleanId = id.replace("@c.us", "");
      return (
        id === userNumber ||
        cleanId === cleanUser ||
        id.includes(cleanUser) ||
        cleanId.includes(cleanUser.replace(/^\+/, ""))
      );
    });
  }

  async checkMultipleGroups(client, userNumber, groups) {
    const results = [];
    for (const group of groups) {
      const isValidWhatsAppLink = this.isValidWhatsAppLink(group.link);
      let isInGroup = false;
      let error = null;

      if (isValidWhatsAppLink) {
        const result = await this.isUserInGroup(client, userNumber, group.link);
        isInGroup = result.isInGroup;
        error = result.error;
        if (groups.length > 1)
          await delay.smartDelay({ minMs: 2000, maxMs: 3000 });
      } else {
        error = "Link não é do WhatsApp";
      }

      results.push({ group, isInGroup, isValidWhatsAppLink, error });
    }
    return results;
  }

  async getAvailableGroups(client, userNumber, groups) {
    const results = await this.checkMultipleGroups(client, userNumber, groups);
    const availableGroups = [];
    let userInAnyGroup = false;
    let successfulChecks = 0;

    for (const result of results) {
      if (!result.isValidWhatsAppLink || result.error) {
        availableGroups.push(result.group);
      } else if (!result.isInGroup) {
        availableGroups.push(result.group);
        successfulChecks++;
      } else {
        userInAnyGroup = true;
        successfulChecks++;
      }
    }

    if (successfulChecks === 0 && groups.length > 0) {
      return {
        availableGroups: groups,
        userInAnyGroup: false,
        allGroupsChecked: false,
      };
    }

    return { availableGroups, userInAnyGroup, allGroupsChecked: true };
  }

  generateAlreadyInGroupMessage(userName, groupName = null) {
    const groupText = groupName ? ` de *${groupName}*` : "";
    return `👋 Olá *${userName}*!\n\n✅ Você já está participando do grupo${groupText}!\n\n🎯 Não é necessário entrar novamente. Você já tem acesso a todas as informações e pode participar normalmente.\n\n😊 Obrigado!`;
  }

  generatePartialGroupMessage(userName, availableGroups, selectedTime) {
    let message = `👋 Olá *${userName}*!\n\n`;
    message += `✅ Detectamos que você já participa de alguns dos nossos grupos!\n\n`;
    message += `🎯 Aqui estão os grupos disponíveis onde você ainda não está:\n\n`;
    availableGroups.forEach((group) => {
      message += `📍 *${group.name}*\n${group.link}\n\n`;
    });
    message += `⏰ Seu horário: *${selectedTime}* 😁\n\n*Clique no(s) link(s) para participar!*`;
    return message;
  }

  async clearCache() {
    this.cache.clear();
    this.revalidationAttempts.clear(); // Limpa também os dados de revalidação
    await debug("🧹 Cache do InviteManager limpo");
  }

  async cleanExpiredCache() {
    const now = Date.now();

    // Limpa cache expirado
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp >= this.cacheExpiry) {
        this.cache.delete(key);
      }
    }

    // Limpa dados de revalidação antigos (mais de 1 hora)
    for (const [key, value] of this.revalidationAttempts.entries()) {
      if (now - value.lastAttempt >= 60 * 60 * 1000) {
        this.revalidationAttempts.delete(key);
      }
    }
  }

  // Método adicional para forçar revalidação de um usuário específico
  async forceRevalidateUser(userNumber, groupId = null) {
    if (groupId) {
      const normalizedUserNumber = this.normalizeUserNumber(userNumber);
      const cacheKey = `${normalizedUserNumber}-${groupId}`;
      this.cache.delete(cacheKey);
      this.revalidationAttempts.delete(cacheKey);
      await debug(`🔄 Forçando revalidação para ${cacheKey}`);
    } else {
      // Remove todas as entradas relacionadas ao usuário
      const normalizedUserNumber = this.normalizeUserNumber(userNumber);
      for (const key of this.cache.keys()) {
        if (key.startsWith(normalizedUserNumber)) {
          this.cache.delete(key);
          this.revalidationAttempts.delete(key);
        }
      }
      await debug(
        `🔄 Forçando revalidação para todas as entradas do usuário ${normalizedUserNumber}`
      );
    }
  }
}

const inviteManager = new InviteManager();
setInterval(() => inviteManager.cleanExpiredCache(), 10 * 60 * 1000);
module.exports = inviteManager;
