// handlers/faqHandler.js
const { isRequestingHelp, enviarFAQ } = require("../utils/triggers");

class faqHandler {
  shouldHandle(msg) {
    const textoDaMensagem = msg.caption || msg.body || "";
    return isRequestingHelp(textoDaMensagem);
  }

  async process(client, msg) {
    await enviarFAQ(client, msg);
  }
}

module.exports = faqHandler;
