// message.js - Versão Corrigida para Novo Fluxo MULTI com FAQ modular + Correção triggers indevidos + Anti-Spam + Tratamento de Áudio + InviteManager + FILTRO DE GRUPOS
const client = require("../client/client");
const {
  enviarMensagemMenu,
  enviarMenuHorarios,
  chatContext,
} = require("../handlers/menuMessage");
const HORARIOS = require("../horarios");
const {
  normalizarTexto,
  hasTriggerText,
  identificarCidadeFuzzy,
  normalizarTextoHorario,
  isRequestingHelp, // Importa a função do triggers.js
  enviarFAQ, // Importa a função do triggers.js
} = require("../utils/triggers");
const groupService = require("../services/groupService");
const timeout = require("../utils/timeout");
const indicadores = require("../utils/indicadores");
const delay = require("../utils/delay");
const { updateLastMenuTime } = require("../utils/lastActivity"); // 🆕 Importa a função
const { antiSpamManager } = require("../utils/antiSpam"); // 🆕 Importa o anti-spam
const { messageTypeHandler } = require("../handlers/messageType"); // 🆕 Importa o handler de tipos de mensagem
const inviteManager = require("../utils/inviteManager");

// 🆕 IMPORTA O FILTRO DE GRUPOS
const {
  shouldIgnoreMessage,
  getChatInfo,
  logChatStats,
} = require("../utils/groupFilter");

const userStates = {};

// 🆕 Inicializa o anti-spam manager
(async () => {
  await antiSpamManager.initialize();
})();

// 🧠 Função auxiliar para encontrar horário
function encontrarHorario(inputUsuario) {
  const inputNormalizado = normalizarTextoHorario(inputUsuario);
  if (/^[1-6]$/.test(inputNormalizado)) {
    const opcao = parseInt(inputNormalizado);
    const horario = Object.values(HORARIOS).find((h) => h.id === opcao);
    return horario ? { ...horario, id: opcao } : null;
  }
  return HORARIOS[inputNormalizado] || null;
}

module.exports = async function messageHandler(msg) {
  // 🛡️ PRIMEIRA VERIFICAÇÃO: Filtro de grupos (MAIS IMPORTANTE)
  const shouldIgnore = await shouldIgnoreMessage(msg);
  if (shouldIgnore) {
    // Opcionalmente pode logar informações para debug
    const chatInfo = await getChatInfo(msg);
    logChatStats(chatInfo);
    return; // PARA AQUI - Ignora completamente mensagens de grupos
  }

  console.log("✅ Mensagem aceita para processamento - conversa privada");

  const chat = await msg.getChat();
  const userNumber = msg.from;
  const contact = await msg.getContact();
  const name = contact.pushname?.split(" ")[0] || "";

  const textoDaMensagem = msg.caption || msg.body || "";

  // 🆕 SEGUNDA VERIFICAÇÃO: Verifica tipos de mensagem não suportados (áudio, vídeo, etc.)
  const unsupportedResult = await messageTypeHandler.processMessage(
    client,
    msg
  );
  if (unsupportedResult.handled) {
    console.log(
      `📱 Mensagem não suportada tratada: ${unsupportedResult.action}`
    );

    // Se foi suspenso ou já estava suspenso, inicia timeout e retorna
    if (unsupportedResult.action === "suspended") {
      await timeout.startTimeout(client, userNumber, chat, name);
    }
    return;
  }

  // 🆕 Verificação de usuário suspenso - Anti-Spam (TERCEIRA VERIFICAÇÃO)
  if (antiSpamManager.isUserSuspended(userNumber)) {
    const remainingMinutes =
      antiSpamManager.getSuspensionTimeRemaining(userNumber);
    await antiSpamManager.handleSpamAction(client, msg, "suspended", {
      remainingMinutes,
    });
    return;
  }

  // 🔍 Verificação de FAQ/AJUDA usando a função do triggers.js
  if (isRequestingHelp(textoDaMensagem)) {
    await enviarFAQ(client, msg);
    await timeout.startTimeout(client, userNumber, chat, name);
    return;
  }

  // 🆕 MODIFICAÇÃO PRINCIPAL: Passa o userState para hasTriggerText
  if (
    hasTriggerText(textoDaMensagem, userStates[userNumber]) &&
    userStates[userNumber]?.step !== "awaiting_name"
  ) {
    timeout.cancelTimeout(userNumber);
    delete userStates[userNumber];
    delete chatContext[userNumber];

    // 🆕 Reset contador anti-spam quando usuário reinicia conversa
    await antiSpamManager.resetUserAttempts(userNumber);

    const currentMode = groupService.getCurrentMode();
    await enviarMensagemMenu(client, msg, chat);

    // 🆕 Atualiza o horário do último menu enviado
    updateLastMenuTime();

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

    await timeout.startTimeout(client, userNumber, chat, name);
    return;
  }

  if (userStates[userNumber]?.step === "awaiting_city") {
    const inputCidade = msg.body?.trim() || "";
    const inputCidadeNormalizado = normalizarTexto(inputCidade);
    const allGroups = await groupService.getAllGroups();

    let selectedCityData = null;

    const numero = parseInt(inputCidade.trim());
    if (!isNaN(numero) && numero >= 1 && numero <= allGroups.length) {
      selectedCityData = allGroups[numero - 1];
    }

    if (!selectedCityData) {
      selectedCityData = allGroups.find(
        (group) => normalizarTexto(group.name) === inputCidadeNormalizado
      );
    }

    if (!selectedCityData) {
      selectedCityData = allGroups.find((group) => {
        const nomeNormalizado = normalizarTexto(group.name);
        return (
          nomeNormalizado.includes(inputCidadeNormalizado) ||
          inputCidadeNormalizado.includes(nomeNormalizado)
        );
      });
    }

    if (!selectedCityData) {
      const fuzzyNomeCidade = identificarCidadeFuzzy(inputCidade);
      if (fuzzyNomeCidade) {
        selectedCityData = allGroups.find(
          (group) => group.name === fuzzyNomeCidade
        );
      }
    }

    if (selectedCityData) {
      // 🆕 Reset contador anti-spam quando usuário acerta a cidade
      await antiSpamManager.resetUserAttempts(userNumber);

      chatContext[userNumber] = { selectedCityData };

      // Delay antes da mensagem de confirmação da cidade
      await delay.smartDelay({ minMs: 5000, maxMs: 25000 });
      await client.sendMessage(
        msg.from,
        `✅ Cidade selecionada: *${selectedCityData.name}*\n\n${
          selectedCityData.message || ""
        }`
      );

      if (!userStates[userNumber]) {
        userStates[userNumber] = {};
      }

      userStates[userNumber].step = "awaiting_time";
      await enviarMenuHorarios(client, msg.from, chat);
    } else {
      // 🆕 Anti-Spam: Incrementa tentativas e verifica ação necessária
      const spamCheck = await antiSpamManager.incrementAttempts(userNumber);

      if (spamCheck.action === "send_faq") {
        await antiSpamManager.handleSpamAction(client, msg, "send_faq");
      } else if (spamCheck.action === "suspend") {
        await antiSpamManager.handleSpamAction(client, msg, "suspend", {
          suspendDurationMinutes: spamCheck.suspendDurationMinutes,
        });
        return;
      } else {
        // Mensagem normal de erro
        let errorMessage =
          "🤔 Ops, cidade não encontrada! Parece que essa cidade não está na nossa lista ou houve um errinho de digitação.\n\n";
        errorMessage += "📍 *Cidades disponíveis:*\n";

        allGroups.forEach((group, index) => {
          errorMessage += `${index + 1}. ${group.name}\n`;
        });

        errorMessage += "\n💡 Você pode digitar:\n";
        errorMessage += "• O *número* da cidade (1, 2, 3...)\n";
        errorMessage += "• O *nome completo* (São Paulo, Joinville...)\n";
        errorMessage += "• Parte do nome (São, Join...)\n";
        errorMessage +=
          "\nE se precisar de ajuda, digite a palavra *AJUDA* ou *FAQ* que vou te enviar a lista com as dúvidas mais comuns sobre a nossa seleção.\n";
        errorMessage += "\nTente novamente! 😊";

        await client.sendMessage(msg.from, errorMessage);
      }
    }

    await timeout.startTimeout(client, userNumber, chat, name);
    return;
  }

  if (userStates[userNumber]?.step === "awaiting_time") {
    const inputUsuario = msg.body?.trim() || "";
    const opcao = encontrarHorario(inputUsuario);

    if (opcao) {
      // 🆕 Reset contador anti-spam quando usuário acerta o horário
      await antiSpamManager.resetUserAttempts(userNumber);

      indicadores.incrementarHorario(opcao.id);

      userStates[userNumber] = {
        ...userStates[userNumber],
        step: "awaiting_name",
        selectedTime: `${opcao.horario} - ${opcao.descricao}`,
        selectedTimeObj: opcao,
      };

      await chat.sendStateTyping();
      // Delay antes da confirmação do horário
      await delay.smartDelay({ minMs: 5000, maxMs: 25000 });
      await client.sendMessage(
        msg.from,
        `Você escolheu *${opcao.horario} - ${opcao.descricao}*.\nAgora digite somente o seu *NOME COMPLETO* para confirmar a sua inscrição, por favor!😊`
      );
    } else {
      // 🆕 Anti-Spam: Incrementa tentativas e verifica ação necessária
      const spamCheck = await antiSpamManager.incrementAttempts(userNumber);

      if (spamCheck.action === "send_faq") {
        await antiSpamManager.handleSpamAction(client, msg, "send_faq");
      } else if (spamCheck.action === "suspend") {
        await antiSpamManager.handleSpamAction(client, msg, "suspend", {
          suspendDurationMinutes: spamCheck.suspendDurationMinutes,
        });
        return;
      } else {
        // Mensagem normal de erro
        await client.sendMessage(
          msg.from,
          `🤔 Desculpe, horário não reconhecido. Digite apenas o horário que você escolheu.\n\nE se precisar de ajuda, digite a palavra *AJUDA* ou *FAQ* que vou te enviar a lista com as dúvidas mais comuns sobre a nossa seleção.`
        );
      }
    }

    await timeout.startTimeout(client, userNumber, chat, name);
    return;
  }

  if (userStates[userNumber]?.step === "awaiting_name") {
    const nomeCompleto = msg.body?.trim();
    const horarioSelecionado = userStates[userNumber].selectedTime;

    try {
      timeout.cancelTimeout(userNumber);
      const currentMode = groupService.getCurrentMode();
      const allGroups = await groupService.getAllGroups();
      if (allGroups.length === 0) throw new Error("Nenhum grupo configurado");

      let messageText;

      if (currentMode === "SINGLE" || userStates[userNumber].forceSingle) {
        const primaryGroup = allGroups.find((group) => group.isPrimary);
        if (primaryGroup) {
          // 🆕 VERIFICAÇÃO SE USUÁRIO JÁ ESTÁ NO GRUPO (MODO SINGLE)
          console.log("🔍 Verificando se usuário já está no grupo primário...");

          // Só verifica se for um link válido do WhatsApp
          if (inviteManager.isValidWhatsAppLink(primaryGroup.link)) {
            const checkResult = await inviteManager.isUserInGroup(
              client,
              userNumber,
              primaryGroup.link
            );

            if (checkResult.isInGroup) {
              // Usuário já está no grupo
              const alreadyInMessage =
                inviteManager.generateAlreadyInGroupMessage(
                  nomeCompleto,
                  primaryGroup.name
                );

              await delay.smartDelay({ minMs: 5000, maxMs: 25000 });
              await client.sendMessage(msg.from, alreadyInMessage);

              // Reset contador anti-spam e limpa estados
              await antiSpamManager.resetUserAttempts(userNumber);
              delete userStates[userNumber];
              delete chatContext[userNumber];
              return;
            }
          }

          // Usuário não está no grupo ou link não é do WhatsApp - envia normalmente
          const dataEvento = primaryGroup.date
            ? `\n📅 Dia: ${primaryGroup.date}`
            : "";
          messageText = `✅ Parabéns, *${nomeCompleto}*! A sua presença está confirmada!${dataEvento}\n\n${primaryGroup.link}\n\n⏰ Seu horário: *${horarioSelecionado}* 😁\n\n*Clique no link para participar!*`;
        } else {
          const primaryLink = await groupService.getPrimaryGroupLink();
          messageText = `✅ Parabéns, *${nomeCompleto}*! A sua presença está confirmada!\n\n${primaryLink}\n\n⏰ Seu horário: *${horarioSelecionado}* 😁\n\n*Clique no link para participar!*`;
        }
      } else {
        // 🆕 VERIFICAÇÃO PARA MODO MÚLTIPLOS GRUPOS
        const selectedCityData = chatContext[userNumber]?.selectedCityData;

        if (selectedCityData) {
          // Modo com cidade específica selecionada
          console.log(
            "🔍 Verificando se usuário já está no grupo da cidade selecionada..."
          );

          if (inviteManager.isValidWhatsAppLink(selectedCityData.link)) {
            const checkResult = await inviteManager.isUserInGroup(
              client,
              userNumber,
              selectedCityData.link
            );

            if (checkResult.isInGroup) {
              // Usuário já está no grupo
              const alreadyInMessage =
                inviteManager.generateAlreadyInGroupMessage(
                  nomeCompleto,
                  selectedCityData.name
                );

              await delay.smartDelay({ minMs: 5000, maxMs: 25000 });
              await client.sendMessage(msg.from, alreadyInMessage);

              // Reset contador anti-spam e limpa estados
              await antiSpamManager.resetUserAttempts(userNumber);
              delete userStates[userNumber];
              delete chatContext[userNumber];
              return;
            }
          }

          // Usuário não está no grupo - envia normalmente
          const dataEvento = selectedCityData.date
            ? `\n📅 Dia: ${selectedCityData.date}`
            : "";
          messageText = `✅ Parabéns, *${nomeCompleto}*! A sua presença está confirmada!${dataEvento}\n\n${selectedCityData.link}\n\n⏰ Seu horário: *${horarioSelecionado}* 😁\n\nAqui está o acesso para o grupo de ${selectedCityData.name}:\n*Clique no link para participar!*`;
        } else {
          // Modo todos os grupos - verifica participação em múltiplos grupos
          console.log("🔍 Verificando participação em múltiplos grupos...");

          const { availableGroups, userInAnyGroup } =
            await inviteManager.getAvailableGroups(
              client,
              userNumber,
              allGroups
            );

          if (availableGroups.length === 0 && userInAnyGroup) {
            // Usuário já está em todos os grupos
            const alreadyInMessage =
              inviteManager.generateAlreadyInGroupMessage(nomeCompleto);

            await delay.smartDelay({ minMs: 5000, maxMs: 25000 });
            await client.sendMessage(msg.from, alreadyInMessage);

            // Reset contador anti-spam e limpa estados
            await antiSpamManager.resetUserAttempts(userNumber);
            delete userStates[userNumber];
            delete chatContext[userNumber];
            return;
          } else if (
            availableGroups.length < allGroups.length &&
            userInAnyGroup
          ) {
            // Usuário está em alguns grupos, mas não em todos
            const partialMessage = inviteManager.generatePartialGroupMessage(
              nomeCompleto,
              availableGroups,
              horarioSelecionado
            );

            await delay.smartDelay({ minMs: 5000, maxMs: 25000 });
            await client.sendMessage(msg.from, partialMessage);

            // Reset contador anti-spam e limpa estados
            await antiSpamManager.resetUserAttempts(userNumber);
            delete userStates[userNumber];
            delete chatContext[userNumber];
            return;
          } else {
            // Usuário não está em nenhum grupo ou todos os grupos estão disponíveis
            messageText = `✅ Parabéns, *${nomeCompleto}*! Aqui está o acesso para os grupos disponíveis:\n\n`;
            messageText += availableGroups
              .map((group) => `📍 *${group.name}*\n${group.link}`)
              .join("\n\n");
            messageText += `\n\n⏰ Seu horário: *${horarioSelecionado}* 😁\n\nEscolha o grupo que preferir!`;
          }
        }
      }

      // Delay antes da mensagem final com links
      await delay.smartDelay({ minMs: 5000, maxMs: 25000 });
      await client.sendMessage(msg.from, messageText);
      indicadores.incrementarConvidados();

      // 🆕 Reset contador anti-spam após sucesso completo
      await antiSpamManager.resetUserAttempts(userNumber);

      delete userStates[userNumber];
      delete chatContext[userNumber];
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      // Mensagem de erro - SEM delay
      await msg.reply(
        "❌ Ocorreu um erro ao enviar o(s) link(s) do grupo. Por favor, tente novamente mais tarde."
      );

      timeout.cancelTimeout(userNumber);
      delete userStates[userNumber];
      delete chatContext[userNumber];
    }
  }
};
