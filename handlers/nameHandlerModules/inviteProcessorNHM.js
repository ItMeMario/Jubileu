const { chatContext } = require("../menuMessage");
const inviteManager = require("../../utils/inviteManager");
const delay = require("../../utils/delay");
const messageManagerNHM = require("./messageManagerNHM");
const audioManagerNHM = require("./audioManagerNHM");
const { sendSocialLinkIfExists } = require("../../utils/socialLink");

class InviteProcessorNHM {
  async handleMultiMode(client, userNumber, nomeCompleto, horarioSelecionado) {
    const selectedCityData = chatContext[userNumber]?.selectedCityData;

    if (selectedCityData) {
      return await this.handleSpecificCity(
        client,
        userNumber,
        nomeCompleto,
        horarioSelecionado,
        selectedCityData
      );
    } else {
      throw new Error("Nenhuma cidade selecionada no modo multi");
    }
  }

  async handleSpecificCity(
    client,
    userNumber,
    nomeCompleto,
    horarioSelecionado,
    selectedCityData
  ) {
    if (inviteManager.isValidWhatsAppLink(selectedCityData.link)) {
      const checkResult = await inviteManager.isUserInGroup(
        client,
        userNumber,
        selectedCityData.link
      );

      if (checkResult.isInGroup) {
        const alreadyInMessage =
          await messageManagerNHM.getAlreadyInGroupMessage(
            nomeCompleto,
            selectedCityData.name
          );
        await delay.smartDelay({ minMs: 5000, maxMs: 25000 });
        await client.sendMessage(userNumber, alreadyInMessage);
        return null;
      }
    }

    const dataEvento = selectedCityData.date
      ? `\n📅 Dia: ${selectedCityData.date}`
      : "";
    const textMessage = await messageManagerNHM.getMultiInviteMessage(
      nomeCompleto,
      horarioSelecionado,
      selectedCityData.link,
      selectedCityData.name,
      dataEvento
    );

    // Enviar texto primeiro, depois áudio
    await client.sendMessage(userNumber, textMessage);
    await audioManagerNHM.sendAudioInviteIfExists(client, userNumber);

    // Enviar social link se existir
    await sendSocialLinkIfExists(client, userNumber);

    return "sent_with_audio"; // Indicador especial
  }
}

module.exports = new InviteProcessorNHM();
