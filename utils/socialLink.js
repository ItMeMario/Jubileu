// utils/socialLink.js
const messageManagerNHM = require("../handlers/nameHandlerModules/messageManagerNHM");
const { debug } = require("../services/debugService");
const { sendMessageOptions } = require("../config/compatibility/whatsappCompatibility");

async function sendSocialLinkIfExists(client, userNumber) {
  try {
    const socialLinkMessage = await messageManagerNHM.getSocialLinkMessage();

    if (socialLinkMessage) {
      await client.sendMessage(userNumber, socialLinkMessage, sendMessageOptions);
    }
  } catch (error) {
    // Silenciosamente não faz nada se houver erro
    debug("ℹ️ Social link não disponível (ignorando silenciosamente).");
  }
}

module.exports = { sendSocialLinkIfExists };
