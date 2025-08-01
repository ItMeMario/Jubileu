// inviteManager.js - Módulo para gerenciar convites e verificar participação em grupos
const delay = require("../utils/delay");

class InviteManager {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000;
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

  async isUserInGroup(client, userNumber, groupLink) {
    try {
      const normalizedUserNumber = this.normalizeUserNumber(userNumber);

      if (!this.isValidWhatsAppLink(groupLink)) {
        console.log("⚠️ Link não é válido:", groupLink);
        return { isInGroup: false, error: "Link inválido", isValidLink: false };
      }

      const inviteCode = this.extractGroupIdFromLink(groupLink);
      if (!inviteCode) {
        console.log("❌ Não foi possível extrair código do grupo:", groupLink);
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
        console.log("❌ Grupo não encontrado a partir do código:", inviteCode);
        return {
          isInGroup: false,
          error: "Grupo não encontrado",
          isValidLink: true,
        };
      }

      const cacheKey = `${normalizedUserNumber}-${realGroupId}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        console.log("📋 Usando cache para verificação:", cacheKey);
        return { isInGroup: cached.isInGroup, error: null, isValidLink: true };
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

      console.log("🔄 Método direto falhou, tentando método alternativo...");
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
      await delay.smartDelay({ minMs: 500, maxMs: 1000 });

      const possibleChatIds = [`${groupId}`, groupId.replace("@g.us", "")];
      let chat = null;

      for (const possibleId of possibleChatIds) {
        try {
          console.log(`🔍 Tentando acessar grupo com ID: ${possibleId}`);
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
          console.log(`⚠️ Falha ao acessar ${possibleId}:`, error.message);
        }
      }

      if (!chat) return { success: false, isInGroup: false };

      await delay.smartDelay({ minMs: 800, maxMs: 1200 });

      const participants = chat.groupMetadata?.participants || [];
      const isInGroup = this.checkUserInParticipants(participants, userNumber);
      this.cache.set(`${userNumber}-${groupId}`, {
        isInGroup,
        timestamp: Date.now(),
      });

      console.log(
        `🔍 Usuário ${userNumber} ${
          isInGroup ? "ESTÁ" : "NÃO ESTÁ"
        } no grupo ${groupId}`
      );
      return { success: true, isInGroup };
    } catch (error) {
      console.log("❌ Erro no método direto:", error.message);
      return { success: false, isInGroup: false };
    }
  }

  async checkGroupByAlternativeMethod(client, userNumber, groupId) {
    try {
      console.log(
        "🔍 Usando método alternativo - verificando todos os chats..."
      );
      await delay.smartDelay({ minMs: 2000, maxMs: 3000 });

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
        console.log(
          `⚠️ Grupo ${groupId} não encontrado nos ${chats.length} chats disponíveis`
        );
        const sample = chats.filter((c) => c.isGroup).slice(0, 5);
        console.log(
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
      this.cache.set(`${userNumber}-${groupId}`, {
        isInGroup,
        timestamp: Date.now(),
      });

      console.log(
        `🔍 (Alternativo) Usuário ${userNumber} ${
          isInGroup ? "ESTÁ" : "NÃO ESTÁ"
        } no grupo ${groupId}`
      );
      return { isInGroup, error: null, isValidLink: true };
    } catch (error) {
      console.log("❌ Método alternativo falhou:", error.message);
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

  clearCache() {
    this.cache.clear();
    console.log("🧹 Cache do InviteManager limpo");
  }

  cleanExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp >= this.cacheExpiry) {
        this.cache.delete(key);
      }
    }
  }
}

const inviteManager = new InviteManager();
setInterval(() => inviteManager.cleanExpiredCache(), 10 * 60 * 1000);
module.exports = inviteManager;
