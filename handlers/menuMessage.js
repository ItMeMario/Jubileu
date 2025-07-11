const delay = require("../utils/delay");
const fs = require("fs");
const path = require("path");
const groupService = require("../services/groupService");

const messageStorage = require("../services/messageService"); // Ajuste o caminho

// Pega a última mensagem válida de forma mais confiável
const getLatestValidMessage = async () => {
  try {
    // Usa a função getLastMessage() do seu módulo de armazenamento
    const lastMessage = await messageStorage.getLastMessage();

    if (!lastMessage || !lastMessage.content) {
      console.log("Nenhuma mensagem encontrada ou conteúdo vazio");
      return null;
    }

    // Verificação mais flexível do conteúdo
    const trimmedContent = lastMessage.content.trim();
    if (trimmedContent.length > 20) {
      // Reduzido para 20 caracteres mínimos
      return trimmedContent;
    }

    console.log("Mensagem muito curta:", trimmedContent);
    return null;
  } catch (error) {
    console.error("Erro ao recuperar mensagem:", error);
    return null;
  }
};

async function enviarMensagemMenu(client, msg, chat) {
  await delay(3000);
  await chat.sendStateTyping();

  const contact = await msg.getContact();
  const name = contact.pushname.split(" ")[0];

  // Obtém a mensagem dinâmica
  const latestMessage = await getLatestValidMessage();
  
  // Mensagem de saudação
  const greetingMessage = latestMessage 
    ? `Olá ${name}! Tudo bem?\n${latestMessage}`
    : `Olá ${name}! Tudo bem? 
Aqui é o Léo Rieper, da empresa *Dilson Stein!* 
Estamos organizando um evento para escolher novos modelos...`;

  await client.sendMessage(msg.from, greetingMessage);

  // Verifica o modo atual (SINGLE ou MULTI)
  const currentMode = groupService.getCurrentMode(); // Não precisa de await, pois é síncrono

  // Se estiver no MULTI, envia mensagem adicional
  if (currentMode === "MULTI") {
    await delay(3000);
    await chat.sendStateTyping();
    
    const additionalMessage = "🔹 *MODO MULTI ATIVO* 🔹\nEsta é uma mensagem extra que só aparece quando há múltiplos grupos envolvidos!";
    await client.sendMessage(msg.from, additionalMessage);
  }

  // Menu de horários (comum a SINGLE e MULTI)
  await delay(3000);
  await chat.sendStateTyping();

  const menu = `⚠ *IMPORTANTE:* Escolha seu horário:
Horários disponíveis:
*Escolha seu horário digitando o número correspondente:*

10:00h (Manhã)
12:00h (Meio-dia)
14:00h (Tarde)
15:30h (Tarde)
17:30h (Final da tarde)
19:30h (Noite)`;

  await client.sendMessage(msg.from, menu);
}

module.exports = enviarMensagemMenu;
