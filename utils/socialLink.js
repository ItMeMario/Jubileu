// utils/socialLink.js
const messageManagerNHM = require("../handlers/nameHandlerModules/messageManagerNHM");

async function sendSocialLinkIfExists(client, userNumber) {
  try {
    const socialLinkMessage = await messageManagerNHM.getSocialLinkMessage();

    if (socialLinkMessage) {
      await client.sendMessage(userNumber, socialLinkMessage);
    }
  } catch (error) {
    // Silenciosamente não faz nada se houver erro
  }
}

module.exports = { sendSocialLinkIfExists };
