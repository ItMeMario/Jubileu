
const { chatContext } = require("./menuMessage");
const groupService = require("../services/groupService");
const inviteManager = require("../utils/inviteManager");
const indicadores = require("../utils/indicadores");
const delay = require("../utils/delay");
const timeout = require("../utils/timeout");
const { debug } = require("../services/debugService");

class nameHandler {
  async process(client, msg, userStates, userNumber, antiSpamManager) {
    const nomeCompleto = msg.body?.trim();
    const horarioSelecionado = userStates[userNumber].selectedTime;

    try {
      timeout.cancelTimeout(userNumber);
      
      const messageText = await this.generateInviteMessage(
        client, userNumber, nomeCompleto, horarioSelecionado, userStates
      );

      if (messageText === null) {
        // Usuário já está no grupo - cleanup foi feito internamente
        await antiSpamManager.resetUserAttempts(userNumber);
        delete userStates[userNumber];
        delete chatContext[userNumber];
        return;
      }

      await delay.smartDelay({ minMs: 5000, maxMs: 25000 });
      await client.sendMessage(msg.from, messageText);

      await this.updateCounters();
      await antiSpamManager.resetUserAttempts(userNumber);
      
      // Cleanup
      delete userStates[userNumber];
      delete chatContext[userNumber];

    } catch (error) {
      await this.handleError(msg, userNumber, error);
    }
  }

  async generateInviteMessage(client, userNumber, nomeCompleto, horarioSelecionado, userStates) {
    const currentMode = groupService.getCurrentMode();
    const allGroups = await groupService.getAllGroups();
    
    if (allGroups.length === 0) {
      throw new Error("Nenhum grupo configurado");
    }

    if (currentMode === "SINGLE" || userStates[userNumber].forceSingle) {
      return await this.handleSingleMode(client, userNumber, nomeCompleto, horarioSelecionado, allGroups);
    } else {
      return await this.handleMultiMode(client, userNumber, nomeCompleto, horarioSelecionado, allGroups);
    }
  }

  async handleSingleMode(client, userNumber, nomeCompleto, horarioSelecionado, allGroups) {
    const primaryGroup = allGroups.find((group) => group.isPrimary);
    
    if (!primaryGroup) {
      const primaryLink = await groupService.getPrimaryGroupLink();
      return `✅ Parabéns, *${nomeCompleto}*! A sua presença está confirmada!\n\n${primaryLink}\n\n⏰ Seu horário: *${horarioSelecionado}* 😄\n\n*Clique no link para participar!*`;
    }

    // Verifica se usuário já está no grupo
    if (inviteManager.isValidWhatsAppLink(primaryGroup.link)) {
      const checkResult = await inviteManager.isUserInGroup(client, userNumber, primaryGroup.link);
      
      if (checkResult.isInGroup) {
        const alreadyInMessage = inviteManager.generateAlreadyInGroupMessage(nomeCompleto, primaryGroup.name);
        await delay.smartDelay({ minMs: 5000, maxMs: 25000 });
        await client.sendMessage(userNumber, alreadyInMessage);
        return null; // Indica que já foi tratado
      }
    }

    const dataEvento = primaryGroup.date ? `\n📅 Dia: ${primaryGroup.date}` : "";
    return `✅ Parabéns, *${nomeCompleto}*! A sua presença está confirmada!${dataEvento}\n\n${primaryGroup.link}\n\n⏰ Seu horário: *${horarioSelecionado}* 😄\n\n*Clique no link para participar!*`;
  }

  async handleMultiMode(client, userNumber, nomeCompleto, horarioSelecionado, allGroups) {
    const selectedCityData = chatContext[userNumber]?.selectedCityData;

    if (selectedCityData) {
      return await this.handleSpecificCity(client, userNumber, nomeCompleto, horarioSelecionado, selectedCityData);
    } else {
      return await this.handleAllGroups(client, userNumber, nomeCompleto, horarioSelecionado, allGroups);
    }
  }

  async handleSpecificCity(client, userNumber, nomeCompleto, horarioSelecionado, selectedCityData) {
    if (inviteManager.isValidWhatsAppLink(selectedCityData.link)) {
      const checkResult = await inviteManager.isUserInGroup(client, userNumber, selectedCityData.link);
      
      if (checkResult.isInGroup) {
        const alreadyInMessage = inviteManager.generateAlreadyInGroupMessage(nomeCompleto, selectedCityData.name);
        await delay.smartDelay({ minMs: 5000, maxMs: 25000 });
        await client.sendMessage(userNumber, alreadyInMessage);
        return null;
      }
    }

    const dataEvento = selectedCityData.date ? `\n📅 Dia: ${selectedCityData.date}` : "";
    return `✅ Parabéns, *${nomeCompleto}*! A sua presença está confirmada!${dataEvento}\n\n${selectedCityData.link}\n\n⏰ Seu horário: *${horarioSelecionado}* 😄\n\nAqui está o acesso para o grupo de ${selectedCityData.name}:\n*Clique no link para participar!*`;
  }

  async handleAllGroups(client, userNumber, nomeCompleto, horarioSelecionado, allGroups) {
    const { availableGroups, userInAnyGroup } = await inviteManager.getAvailableGroups(client, userNumber, allGroups);

    if (availableGroups.length === 0 && userInAnyGroup) {
      const alreadyInMessage = inviteManager.generateAlreadyInGroupMessage(nomeCompleto);
      await delay.smartDelay({ minMs: 5000, maxMs: 25000 });
      await client.sendMessage(userNumber, alreadyInMessage);
      return null;
    }
    
    if (availableGroups.length < allGroups.length && userInAnyGroup) {
      const partialMessage = inviteManager.generatePartialGroupMessage(nomeCompleto, availableGroups, horarioSelecionado);
      await delay.smartDelay({ minMs: 5000, maxMs: 25000 });
      await client.sendMessage(userNumber, partialMessage);
      return null;
    }

    let messageText = `✅ Parabéns, *${nomeCompleto}*! Aqui está o acesso para os grupos disponíveis:\n\n`;
    messageText += availableGroups.map((group) => `🔗 *${group.name}*\n${group.link}`).join("\n\n");
    messageText += `\n\n⏰ Seu horário: *${horarioSelecionado}* 😄\n\nEscolha o grupo que preferir!`;
    
    return messageText;
  }

  async updateCounters() {
    try {
      await indicadores.incrementarConvidados();
      await debug("✅ Cliente convidado incrementado no banco");
    } catch (error) {
      console.error("Erro ao incrementar convidados:", error);
    }
  }

  async handleError(msg, userNumber, error) {
    console.error("Erro ao enviar mensagem:", error);
    
    await msg.reply("⚠️ Ocorreu um erro ao enviar o(s) link(s) do grupo. Por favor, tente novamente mais tarde.");
    
    timeout.cancelTimeout(userNumber);
    delete userStates[userNumber];
    delete chatContext[userNumber];
  }
}

module.exports = nameHandler;