const { chatContext } = require("../menuMessage");
const groupService = require("../../services/groupService");
const inviteManager = require("../../utils/inviteManager");
const delay = require("../../utils/delay");
const messageManagerNHM = require("./messageManagerNHM");
const audioManagerNHM = require("./audioManagerNHM");

class InviteProcessorNHM {
  async handleSingleMode(
    client,
    userNumber,
    nomeCompleto,
    horarioSelecionado,
    allGroups
  ) {
    const primaryGroup = allGroups.find((group) => group.isPrimary);

    if (!primaryGroup) {
      const primaryLink = await groupService.getPrimaryGroupLink();
      const dataEvento = "";
      const textMessage = await messageManagerNHM.getSingleInviteMessage(
        nomeCompleto,
        horarioSelecionado,
        primaryLink,
        dataEvento
      );

      // Enviar texto primeiro, depois áudio
      await client.sendMessage(userNumber, textMessage);
      await audioManagerNHM.sendAudioInviteIfExists(client, userNumber);

      // Enviar social link se existir
      await this.sendSocialLinkIfExists(client, userNumber);

      return "sent_with_audio"; // Indicador especial
    }

    // Verifica se usuário já está no grupo
    if (inviteManager.isValidWhatsAppLink(primaryGroup.link)) {
      const checkResult = await inviteManager.isUserInGroup(
        client,
        userNumber,
        primaryGroup.link
      );

      if (checkResult.isInGroup) {
        const alreadyInMessage =
          await messageManagerNHM.getAlreadyInGroupMessage(
            nomeCompleto,
            primaryGroup.name
          );
        await delay.smartDelay({ minMs: 5000, maxMs: 25000 });
        await client.sendMessage(userNumber, alreadyInMessage);
        return null; // Indica que já foi tratado
      }
    }

    const dataEvento = primaryGroup.date
      ? `\nðŸ"… Dia: ${primaryGroup.date}`
      : "";
    const textMessage = await messageManagerNHM.getSingleInviteMessage(
      nomeCompleto,
      horarioSelecionado,
      primaryGroup.link,
      dataEvento
    );

    // Enviar texto primeiro, depois áudio
    await client.sendMessage(userNumber, textMessage);
    await audioManagerNHM.sendAudioInviteIfExists(client, userNumber);

    // Enviar social link se existir
    await this.sendSocialLinkIfExists(client, userNumber);

    return "sent_with_audio"; // Indicador especial
  }

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
      ? `\nðŸ"… Dia: ${selectedCityData.date}`
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
    await this.sendSocialLinkIfExists(client, userNumber);

    return "sent_with_audio"; // Indicador especial
  }

  async sendSocialLinkIfExists(client, userNumber) {
    try {
      const socialLinkMessage = await messageManagerNHM.getSocialLinkMessage();

      if (socialLinkMessage) {
        await client.sendMessage(userNumber, socialLinkMessage);
      }
    } catch (error) {
      // Silenciosamente não faz nada se houver erro
    }
  }
}

module.exports = new InviteProcessorNHM();
