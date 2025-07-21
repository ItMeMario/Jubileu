// message.js - Versão Corrigida
const client = require("../client/client");
const { enviarMensagemMenu, enviarMenuHorarios, chatContext } = require("../handlers/menuMessage");
const HORARIOS = require("../horarios");
const { normalizarTexto, hasTriggerText, identificarCidadeFuzzy } = require("../utils/triggers");
const groupService = require("../services/groupService");
const timeout = require('../utils/timeout');
const indicadores = require('../utils/indicadores');

const userStates = {};

function encontrarHorario(inputUsuario) {
  const inputNormalizado = normalizarTexto(inputUsuario);
  if (/^[1-6]$/.test(inputNormalizado)) {
    const opcao = parseInt(inputNormalizado);
    const horario = Object.values(HORARIOS).find((h) => h.id === opcao);
    return horario ? { ...horario, id: opcao } : null;
  }
  return HORARIOS[inputNormalizado] || null;
}

async function enviarFAQ(client, msg) {
  // Implementação da FAQ aqui
  await client.sendMessage(msg.from, "📋 *FAQ - Perguntas Frequentes*\n\nPara mais informações, digite 'menu' para começar novamente.");
}

module.exports = async function messageHandler(msg) {
  const chat = await msg.getChat();
  const userNumber = msg.from;
  const textoDaMensagem = msg.caption || msg.body || "";

  console.log(`[DEBUG] Mensagem recebida de ${userNumber}: "${textoDaMensagem}"`);
  console.log(`[DEBUG] Estado atual do usuário:`, userStates[userNumber]);

  if (textoDaMensagem.toLowerCase() === "ajuda" || textoDaMensagem.toLowerCase() === "faq") {
    await enviarFAQ(client, msg);
    timeout.cancelTimeout(userNumber);
    return;
  }

  if (hasTriggerText(textoDaMensagem)) {
    timeout.cancelTimeout(userNumber);
    delete userStates[userNumber];
    delete chatContext[userNumber];
    const currentMode = groupService.getCurrentMode();

    console.log(`[DEBUG] Trigger detectado. Modo atual: ${currentMode}`);

    await enviarMensagemMenu(client, msg, chat);
    if (currentMode === 'MULTI') {
      userStates[userNumber] = { step: "awaiting_city", started: true };
      console.log(`[DEBUG] Usuário ${userNumber} aguardando cidade`);
    } else {
      userStates[userNumber] = { step: "awaiting_time", started: true };
      console.log(`[DEBUG] Usuário ${userNumber} aguardando horário`);
    }
    await timeout.startTimeout(client, userNumber, chat);
    return;
  }

  if (userStates[userNumber]?.step === "awaiting_city") {
    console.log(`[DEBUG] Processando seleção de cidade para ${userNumber}`);
    
    const inputCidade = (msg.body?.trim() || "");
    const inputCidadeNormalizado = normalizarTexto(inputCidade);
    const allGroups = groupService.getAllGroups();
    let selectedCityData = null;

    console.log(`[DEBUG] Input cidade: "${inputCidade}" -> Normalizado: "${inputCidadeNormalizado}"`);
    console.log(`[DEBUG] Grupos disponíveis:`, allGroups.map(g => ({ id: g.id, name: g.name })));

    // Primeiro: tentar por número
    const numero = parseInt(inputCidade.trim());
    if (!isNaN(numero) && numero >= 1 && numero <= allGroups.length) {
      selectedCityData = allGroups[numero - 1];
      console.log(`[DEBUG] Cidade selecionada por número: ${numero} -> ${selectedCityData?.name}`);
    }

    // Segundo: busca exata normalizada (nome completo)
    if (!selectedCityData) {
      selectedCityData = allGroups.find(group => 
        normalizarTexto(group.name) === inputCidadeNormalizado
      );
      console.log(`[DEBUG] Busca exata:`, selectedCityData ? `Encontrado: ${selectedCityData.name}` : 'Não encontrado');
    }

    // Terceiro: busca parcial (contém)
    if (!selectedCityData) {
      selectedCityData = allGroups.find(group => {
        const nomeNormalizado = normalizarTexto(group.name);
        return nomeNormalizado.includes(inputCidadeNormalizado) || 
               inputCidadeNormalizado.includes(nomeNormalizado);
      });
      console.log(`[DEBUG] Busca parcial:`, selectedCityData ? `Encontrado: ${selectedCityData.name}` : 'Não encontrado');
    }

    // Quarto: fuzzy matching
    if (!selectedCityData) {
      console.log(`[DEBUG] Tentando fuzzy matching...`);
      const fuzzyNomeCidade = identificarCidadeFuzzy(inputCidade);
      console.log(`[DEBUG] Fuzzy result: "${fuzzyNomeCidade}"`);
      
      if (fuzzyNomeCidade) {
        selectedCityData = allGroups.find(
          (group) => group.name === fuzzyNomeCidade
        );
        console.log(`[DEBUG] Cidade encontrada via fuzzy:`, selectedCityData?.name);
      }
    }

    if (selectedCityData) {
      console.log(`[DEBUG] Cidade selecionada com sucesso: ${selectedCityData.name}`);
      chatContext[userNumber] = { selectedCityData };
      
      // Enviar confirmação da cidade selecionada
      await client.sendMessage(
        msg.from,
        `✅ Cidade selecionada: *${selectedCityData.name}*\n\n${selectedCityData.message || ''}`
      );
      
      await enviarMenuHorarios(client, msg.from, chat);
      userStates[userNumber].step = "awaiting_time";
      await timeout.startTimeout(client, userNumber, chat);
    } else {
      console.log(`[DEBUG] Cidade não encontrada. Enviando mensagem de erro.`);
      
      // Melhorar a mensagem de erro com sugestões
      let errorMessage = "🤔 Desculpe, não encontrei essa cidade.\n\n";
      errorMessage += "📍 *Cidades disponíveis:*\n";
      
      allGroups.forEach((group, index) => {
        errorMessage += `${index + 1}. ${group.name}\n`;
      });
      
      errorMessage += "\n💡 Você pode digitar:\n";
      errorMessage += "• O *número* da cidade (1, 2, 3...)\n";
      errorMessage += "• O *nome completo* (São Paulo, Joinville...)\n";
      errorMessage += "• Parte do nome (São, Join...)\n";
      errorMessage += "\nTente novamente! 😊";
      
      await client.sendMessage(msg.from, errorMessage);
      await timeout.startTimeout(client, userNumber, chat);
    }
    return;
  }

  if (userStates[userNumber]?.step === "awaiting_time") {
    const inputUsuario = msg.body?.trim() || "";
    if (inputUsuario.toLowerCase() === "ajuda") {
      await enviarFAQ(client, msg);
      timeout.cancelTimeout(userNumber);
      return;
    }

    const opcao = encontrarHorario(inputUsuario);
    if (opcao) {
      userStates[userNumber] = {
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
      await timeout.startTimeout(client, userNumber, chat);
    } else {
      timeout.cancelTimeout(userNumber);
      await client.sendMessage(
        msg.from,
        `🤔 Desculpe, não entendi. Digite apenas o horário que você escolheu.`
      );
      await timeout.startTimeout(client, userNumber, chat);
    }
    return;
  }

  if (userStates[userNumber]?.step === "awaiting_name") {
    const nomeCompleto = msg.body?.trim();
    const horarioSelecionado = userStates[userNumber].selectedTime;

    try {
      timeout.cancelTimeout(userNumber);
      const currentMode = groupService.getCurrentMode();
      const allGroups = groupService.getAllGroups();
      if (allGroups.length === 0) throw new Error("Nenhum grupo configurado");

      let messageText;
      if (currentMode === "SINGLE") {
        const primaryLink = groupService.getPrimaryGroupLink();
        messageText = `✅ Pronto, *${nomeCompleto}*! Aqui está o link para entrar no grupo:\n\n${primaryLink}\n\n⏰ Seu horário: *${horarioSelecionado}* 😁\n\nClique no link para participar!`;
      } else {
        const selectedCityData = chatContext[userNumber]?.selectedCityData;
        if (selectedCityData) {
          messageText = `✅ Pronto, *${nomeCompleto}*! Aqui está o link para ${selectedCityData.name}:\n\n${selectedCityData.link}\n\n⏰ Seu horário: *${horarioSelecionado}* 😁\n\nClique no link para participar!`;
        } else {
          messageText = `✅ Pronto, *${nomeCompleto}*! Aqui estão os links dos grupos disponíveis:\n\n`;
          messageText += allGroups
            .map((group) => `🔗 ${group.descricao || `Grupo ${group.id}`}: ${group.link}`)
            .join("\n\n");
          messageText += `\n\n⏰ Seu horário: *${horarioSelecionado}* 😁\n\nEscolha o grupo que preferir!`;
        }
        delete chatContext[userNumber];
      }

      await client.sendMessage(msg.from, messageText);
      indicadores.incrementarConvidados();
      delete userStates[userNumber];
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      await msg.reply("❌ Ocorreu um erro ao enviar o(s) link(s) do grupo. Por favor, tente novamente mais tarde.");
      timeout.cancelTimeout(userNumber);
      delete userStates[userNumber];
      delete chatContext[userNumber];
    }
  }
};