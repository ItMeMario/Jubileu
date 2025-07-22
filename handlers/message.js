// message.js - Versão Corrigida para Novo Fluxo MULTI
const client = require("../client/client");
const { enviarMensagemMenu, enviarMenuHorarios, chatContext } = require("../handlers/menuMessage");
const HORARIOS = require("../horarios");
const { normalizarTexto, hasTriggerText, identificarCidadeFuzzy, normalizarTextoHorario } = require("../utils/triggers");
const groupService = require("../services/groupService");
const timeout = require('../utils/timeout');
const indicadores = require('../utils/indicadores');
const faq = require('../utils/faq.js'); // Importa o FAQ

const userStates = {};

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

// 📋 FAQ - Função corrigida para usar o arquivo faq.js
async function enviarFAQ(client, msg) {
  try {
    await faq.enviarFAQ(client, msg); 
  } catch (error) {
    console.error("Erro ao enviar FAQ:", error);
    await client.sendMessage(msg.from, "📋 *FAQ - Perguntas Frequentes*\n\nPara mais informações, digite 'menu' para começar novamente.");
  }
}

// 🔍 Função para verificar se é comando FAQ/AJUDA
function isRequestingHelp(texto) {
  const textoNormalizado = normalizarTexto(texto);
  return textoNormalizado.includes('ajuda') || textoNormalizado.includes('faq') || textoNormalizado.includes('help');
}

module.exports = async function messageHandler(msg) {
  const chat = await msg.getChat();
  const userNumber = msg.from;
  const textoDaMensagem = msg.caption || msg.body || "";

  // 📋 Verifica se é uma solicitação de ajuda/FAQ (em qualquer momento)
  if (isRequestingHelp(textoDaMensagem)) {
    await enviarFAQ(client, msg);
    await timeout.startTimeout(client, userNumber, chat);
    return;
  }

  // 🔁 Reseta conversa com "oi", "menu", etc.
  if (hasTriggerText(textoDaMensagem)) {
    timeout.cancelTimeout(userNumber);
    delete userStates[userNumber];
    delete chatContext[userNumber];

    const currentMode = groupService.getCurrentMode();

    // 👋 Envia saudação e menu de cidades (usa função original)
    await enviarMensagemMenu(client, msg, chat);

    // Define próximo passo com base no modo
    if (currentMode === 'SINGLE') {
      // No modo SINGLE, configura a cidade primary automaticamente
      const primaryGroup = groupService.getAllGroups().find(group => group.isPrimary);
      if (primaryGroup) {
        chatContext[userNumber] = { selectedCityData: primaryGroup };
      }
      
      userStates[userNumber] = { step: "awaiting_time", started: true, forceSingle: true };
      
     
    } else {
      userStates[userNumber] = { step: "awaiting_city", started: true, forceSingle: false };
    }

    await timeout.startTimeout(client, userNumber, chat);
    return;
  }

  // 🏙️ Usuário está escolhendo cidade (apenas no modo MULTI)
  if (userStates[userNumber]?.step === "awaiting_city") {
    const inputCidade = (msg.body?.trim() || "");
    const inputCidadeNormalizado = normalizarTexto(inputCidade);
    const allGroups = groupService.getAllGroups();
    let selectedCityData = null;

    // Busca por número
    const numero = parseInt(inputCidade.trim());
    if (!isNaN(numero) && numero >= 1 && numero <= allGroups.length) {
      selectedCityData = allGroups[numero - 1];
    }

    // Busca por nome exato
    if (!selectedCityData) {
      selectedCityData = allGroups.find(group => 
        normalizarTexto(group.name) === inputCidadeNormalizado
      );
    }

    // Busca parcial
    if (!selectedCityData) {
      selectedCityData = allGroups.find(group => {
        const nomeNormalizado = normalizarTexto(group.name);
        return nomeNormalizado.includes(inputCidadeNormalizado) || 
               inputCidadeNormalizado.includes(nomeNormalizado);
      });
    }

    // Busca fuzzy (inteligente)
    if (!selectedCityData) {
      const fuzzyNomeCidade = identificarCidadeFuzzy(inputCidade);
      if (fuzzyNomeCidade) {
        selectedCityData = allGroups.find(
          (group) => group.name === fuzzyNomeCidade
        );
      }
    }

    // ✅ Cidade encontrada
    if (selectedCityData) {
      chatContext[userNumber] = { selectedCityData };

      await client.sendMessage(
        msg.from,
        `✅ Cidade selecionada: *${selectedCityData.name}*\n\n${selectedCityData.message || ''}`
      );

      // ⏰ Envia menu de horários (logo após cidade)
      await enviarMenuHorarios(client, msg.from, chat);
      userStates[userNumber].step = "awaiting_time";

    } else {
      // ❌ Cidade não encontrada — envia lista de cidades COM opção de ajuda
      let errorMessage = "🤔 Ops, cidade não encontrada! Parece que essa cidade não está na nossa lista ou houve um errinho de digitação.\n\n";
      errorMessage += "📍 *Cidades disponíveis:*\n";

      allGroups.forEach((group, index) => {
        errorMessage += `${index + 1}. ${group.name}\n`;
      });

      errorMessage += "\n💡 Você pode digitar:\n";
      errorMessage += "• O *número* da cidade (1, 2, 3...)\n";
      errorMessage += "• O *nome completo* (São Paulo, Joinville...)\n";
      errorMessage += "• Parte do nome (São, Join...)\n";
      errorMessage += "\nE se precisar de ajuda, digite a palavra *AJUDA* ou *FAQ* que vou te enviar a lista com as dúvidas mais comuns sobre a nossa seleção.\n";
      errorMessage += "\nTente novamente! 😊";

      await client.sendMessage(msg.from, errorMessage);
    }

    await timeout.startTimeout(client, userNumber, chat);
    return;
  }

  // ⏰ Usuário está escolhendo horário
  if (userStates[userNumber]?.step === "awaiting_time") {
    const inputUsuario = msg.body?.trim() || "";

    const opcao = encontrarHorario(inputUsuario);
    if (opcao) {
      userStates[userNumber] = {
        ...userStates[userNumber], // Preserva as configurações anteriores
        step: "awaiting_name",
        selectedTime: `${opcao.horario} - ${opcao.descricao}`,
        selectedTimeObj: opcao,
      };

      await chat.sendStateTyping();
      await client.sendMessage(
        msg.from,
        `Você escolheu *${opcao.horario} - ${opcao.descricao}*.` +
        `\nAgora digite somente o seu *NOME COMPLETO* para confirmar a sua inscrição, por favor!😊`
      );
    } else {
      // ❌ Horário não entendido — COM opção de ajuda
      await client.sendMessage(
        msg.from,
        `🤔 Desculpe, não entendi. Digite apenas o horário que você escolheu.\n\nE se precisar de ajuda, digite a palavra *AJUDA* ou *FAQ* que vou te enviar a lista com as dúvidas mais comuns sobre a nossa seleção.`
      );
    }

    await timeout.startTimeout(client, userNumber, chat);
    return;
  }

  // 🧑 Usuário digitou o nome
  if (userStates[userNumber]?.step === "awaiting_name") {
    const nomeCompleto = msg.body?.trim();
    const horarioSelecionado = userStates[userNumber].selectedTime;

    try {
      timeout.cancelTimeout(userNumber);
      const currentMode = groupService.getCurrentMode();
      const allGroups = groupService.getAllGroups();
      if (allGroups.length === 0) throw new Error("Nenhum grupo configurado");

      let messageText;

      if (currentMode === 'SINGLE' || userStates[userNumber].forceSingle) {
        // 🔗 Modo SINGLE - Envia apenas o link da cidade primary
        const primaryGroup = allGroups.find(group => group.isPrimary);
        if (primaryGroup) {
          messageText = `✅ Pronto, *${nomeCompleto}*! Aqui está o link para ${primaryGroup.name}:\n\n${primaryGroup.link}\n\n⏰ Seu horário: *${horarioSelecionado}* 😁\n\nClique no link para participar!`;
        } else {
          // Fallback caso não encontre cidade primary
          const primaryLink = groupService.getPrimaryGroupLink();
          messageText = `✅ Pronto, *${nomeCompleto}*! Aqui está o link para entrar no grupo:\n\n${primaryLink}\n\n⏰ Seu horário: *${horarioSelecionado}* 😁\n\nClique no link para participar!`;
        }
      } else {
        // 🔗 Modo MULTI
        const selectedCityData = chatContext[userNumber]?.selectedCityData;
        if (selectedCityData) {
          messageText = `✅ Pronto, *${nomeCompleto}*! Aqui está o link para ${selectedCityData.name}:\n\n${selectedCityData.link}\n\n⏰ Seu horário: *${horarioSelecionado}* 😁\n\nClique no link para participar!`;
        } else {
          // Fallback para modo MULTI sem cidade selecionada
          messageText = `✅ Pronto, *${nomeCompleto}*! Aqui estão os links dos grupos disponíveis:\n\n`;
          messageText += allGroups
            .map((group) => `🔗 ${group.descricao || group.name}: ${group.link}`)
            .join("\n\n");
          messageText += `\n\n⏰ Seu horário: *${horarioSelecionado}* 😁\n\nEscolha o grupo que preferir!`;
        }
      }

      await client.sendMessage(msg.from, messageText);
      indicadores.incrementarConvidados();

      delete userStates[userNumber];
      delete chatContext[userNumber];

    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      await msg.reply("❌ Ocorreu um erro ao enviar o(s) link(s) do grupo. Por favor, tente novamente mais tarde.");

      timeout.cancelTimeout(userNumber);
      delete userStates[userNumber];
      delete chatContext[userNumber];
    }
  }
};