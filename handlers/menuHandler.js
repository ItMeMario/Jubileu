// handlers/menuHandler.js
const { enviarMensagemMenu, chatContext } = require("./menuMessage");
const { hasTriggerText } = require("../utils/triggers");
const { updateLastMenuTime } = require("../utils/lastActivity");
const groupService = require("../services/groupService");
const timeout = require("../utils/timeout");

class menuHandler {
  shouldHandle(msg, userState) {
    const textoDaMensagem = msg.caption || msg.body || "";

    return (
      hasTriggerText(textoDaMensagem, userState) &&
      userState?.step !== "awaiting_name"
    );
  }

  async process(client, msg, userStates, userNumber) {
    // Limpa estados anteriores
    timeout.cancelTimeout(userNumber);
    delete userStates[userNumber];
    delete chatContext[userNumber];

    // Reset anti-spam
    const { antiSpamManager } = require("../utils/antiSpam");
    await antiSpamManager.resetUserAttempts(userNumber);

    // Envia menu
    const chat = await msg.getChat();
    await enviarMensagemMenu(client, msg, chat);
    updateLastMenuTime();

    // Define próximo estado baseado no modo
    const currentMode = groupService.getCurrentMode();

    if (currentMode === "SINGLE") {
      const primaryGroup = (await groupService.getAllGroups()).find(
        (group) => group.isPrimary
      );

      if (primaryGroup) {
        chatContext[userNumber] = { selectedCityData: primaryGroup };
      }

      userStates[userNumber] = {
        step: "awaiting_time",
        started: true,
        forceSingle: true,
      };
    } else {
      userStates[userNumber] = {
        step: "awaiting_city",
        started: true,
        forceSingle: false,
      };
    }
  }
}

module.exports = menuHandler;
