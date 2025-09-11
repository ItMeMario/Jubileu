// utils/groupIdExtractor.js
const { client } = require("../client/client");

class GroupIdExtractor {
  /**
   * Extrai o código do convite do link do WhatsApp
   * @param {string} link - Link do grupo do WhatsApp
   * @returns {string|null} - Código do convite ou null se inválido
   */
  static extractInviteCode(link) {
    if (!link || typeof link !== "string") return null;

    const regex =
      /(?:https?:\/\/)?(?:www\.)?(?:chat\.)?whatsapp\.com\/(?:invite\/)?([A-Za-z0-9]+)/i;
    const match = link.match(regex);

    return match && match[1] ? match[1] : null;
  }

  /**
   * Verifica se o link é um convite do WhatsApp
   * @param {string} link
   * @returns {boolean}
   */
  static isWhatsAppLink(link) {
    if (!link || typeof link !== "string") return false;
    return /(?:https?:\/\/)?(?:www\.)?(?:chat\.)?whatsapp\.com\//i.test(link);
  }

  /**
   * Busca o ID real do grupo usando o código do convite
   * @param {string} inviteCode - Código extraído do link
   * @returns {Promise<string|null>} - ID do grupo ou null se não encontrar
   */
  static async getGroupIdFromInvite(inviteCode) {
    try {
      if (!client || !client.isReady) return null;

      const inviteInfo = await client.getInviteInfo(inviteCode);
      return inviteInfo && inviteInfo.id ? inviteInfo.id._serialized : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Processa um link e retorna o ID apropriado para usar como chave primária
   * @param {string} link - Link fornecido (WhatsApp ou qualquer outro)
   * @returns {Promise<string>} - ID do grupo ou o próprio link como fallback
   */
  static async processLink(link) {
    if (!link) return `fallback_${Date.now()}`;

    // Se é link do WhatsApp, tenta extrair o ID real
    if (this.isWhatsAppLink(link)) {
      const inviteCode = this.extractInviteCode(link);

      if (inviteCode) {
        const groupId = await this.getGroupIdFromInvite(inviteCode);
        if (groupId) return groupId;
      }
    }

    // Fallback: usa o link original como ID (mais simples que gerar ID único)
    return link;
  }
}

module.exports = GroupIdExtractor;
