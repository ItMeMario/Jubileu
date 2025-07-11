const delay = require("../utils/delay");
const fs = require("fs");
const path = require("path");
const groupService = require("../services/groupService");
const messageStorage = require("../services/messageService");

// Carrega as cidades do JSON
const CITIES_FILE = path.join(__dirname, '../data/cities.json');
let cities = [];
try {
  cities = JSON.parse(fs.readFileSync(CITIES_FILE, 'utf8'));
} catch (error) {
  console.error("Erro ao carregar cities.json:", error);
  cities = []; // Fallback para array vazio
}

// Objeto para controlar seleção em andamento
const activeSelections = {};

// Objeto para armazenar o contexto das conversas
const chatContext = {};

// Pega a última mensagem válida (mantido igual)
const getLatestValidMessage = async () => {
  try {
    const lastMessage = await messageStorage.getLastMessage();
    if (!lastMessage || !lastMessage.content) {
      console.log("Nenhuma mensagem encontrada ou conteúdo vazio");
      return null;
    }

    const trimmedContent = lastMessage.content.trim();
    if (trimmedContent.length > 20) {
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
  const chatId = msg.from;

  // Verifica se já há uma seleção em andamento para este chat
  if (activeSelections[chatId]) {
    return;
  }

  await delay(3000);
  await chat.sendStateTyping();

  const contact = await msg.getContact();
  const name = contact.pushname.split(" ")[0];

  // Mensagem de saudação (mantido igual)
  const latestMessage = await getLatestValidMessage();
  const greetingMessage = latestMessage 
    ? `Olá ${name}! Tudo bem?\n${latestMessage}`
    : `Olá ${name}! Tudo bem? 
Aqui é o Léo Rieper, da empresa *Dilson Stein!* 
Estamos organizando um evento para escolher novos modelos...`;

  await client.sendMessage(chatId, greetingMessage);

  // Verifica o modo atual
  const currentMode = groupService.getCurrentMode();

  // Se estiver no MULTI, mostra menu de cidades
  if (currentMode === "MULTI") {
    activeSelections[chatId] = true;

    await delay(3000);
    await chat.sendStateTyping();

    let cityMenu = "📍 *SELECIONE SUA CIDADE* 📍\n";
    cityMenu += "Por favor, responda com o NÚMERO da sua cidade:\n\n";
    
    cities.forEach((city, index) => {
      cityMenu += `${index + 1} - ${city.name}\n`;
    });

    await client.sendMessage(chatId, cityMenu);

    // Handler temporário para capturar a resposta
    const tempHandler = async (response) => {
      if (response.from === chatId) {
        client.removeListener('message_create', tempHandler);
        delete activeSelections[chatId];

        const selectedNum = parseInt(response.body);
        if (selectedNum >= 1 && selectedNum <= cities.length) {
          const selectedCity = cities[selectedNum - 1].name;
          const selectedCityData = cities[selectedNum - 1];
          
          // Armazena os dados no contexto do chat
          chatContext[chatId] = {
            selectedCity: selectedCity,
            selectedCityData: selectedCityData
          };

          await client.sendMessage(
            chatId,
            `✅ Cidade selecionada: ${selectedCity}`
          );
        } else {
          await client.sendMessage(chatId, "❌ Número inválido. Por favor, inicie novamente.");
          return;
        }

        // Continua com o menu de horários
        await delay(3000);
        await chat.sendStateTyping();
        
        const timeMenu = `⚠ *Escolha seu horário:*
1️⃣ - 10:00h (Manhã)
2️⃣ - 12:00h (Meio-dia)
3️⃣ - 14:00h (Tarde)
4️⃣ - 15:30h (Tarde)
5️⃣ - 17:30h (Final da tarde)
6️⃣ - 19:30h (Noite)`;
        
        await client.sendMessage(chatId, timeMenu);
      }
    };
    client.on('message_create', tempHandler);
  } else {
    // Modo SINGLE - mostra apenas o menu de horários
    await delay(3000);
    await chat.sendStateTyping();
    
    const timeMenu = `⚠ *Escolha seu horário:*
1️⃣ - 10:00h (Manhã)
2️⃣ - 12:00h (Meio-dia)
3️⃣ - 14:00h (Tarde)
4️⃣ - 15:30h (Tarde)
5️⃣ - 17:30h (Final da tarde)
6️⃣ - 19:30h (Noite)`;
    
    await client.sendMessage(chatId, timeMenu);
  }
}

// Exporta também o chatContext para ser acessado por outros módulos
module.exports = {
  enviarMensagemMenu,
  chatContext
};