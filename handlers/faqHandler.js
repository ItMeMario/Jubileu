// handlers/faqHandler.js
const { isRequestingHelp, enviarFAQ } = require("../utils/triggers");
const { sendSocialLinkIfExists } = require("../utils/socialLink");

class faqHandler {
  shouldHandle(msg) {
    const textoDaMensagem = msg.caption || msg.body || "";
    return isRequestingHelp(textoDaMensagem);
  }

  async process(client, msg) {
    await enviarFAQ(client, msg);
    await sendSocialLinkIfExists(client, msg.from);
  }
}

module.exports = faqHandler;
