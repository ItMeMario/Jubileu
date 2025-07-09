const delay = require('../utils/delay');
const randomDelay = require('../utils/randomDelay');
const fs = require('fs');
const path = require('path');

// Carrega as mensagens do arquivo JSON
const messageStoragePath = path.join(__dirname, '../services/messagesStorage.json');
const messages = JSON.parse(fs.readFileSync(messageStoragePath, 'utf-8'));

// Pega a última mensagem válida (ignorando mensagens muito curtas ou de teste)
const getLatestValidMessage = () => {
  if (!messages || messages.length === 0) return null;
  
  // Ordena por data (da mais recente para a mais antiga)
  const sortedMessages = [...messages].sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );

  // Filtra mensagens que parecem ser oficiais (com mais de 100 caracteres)
  const validMessages = sortedMessages.filter(msg => 
    msg.content && msg.content.length > 100
  );

  return validMessages.length > 0 ? validMessages[0].content : null;
};

async function enviarMensagemMenu(client, msg, chat) {
  await delay(3000);
  await chat.sendStateTyping();

  const contact = await msg.getContact();
  const name = contact.pushname.split(" ")[0];

  // Usa a mensagem dinâmica ou a padrão se não houver mensagens válidas
  const latestMessage = getLatestValidMessage();
  
  const greetingMessage = latestMessage 
    ? `Olá ${name}! Tudo bem?\n${latestMessage}`
    : `Olá ${name}! Tudo bem? 
Aqui é o Léo Rieper, da empresa *Dilson Stein!* 
Estamos organizando um evento para escolher novos modelos...`; // Mensagem padrão

  await client.sendMessage(msg.from, greetingMessage);

  await delay(3000);
  await chat.sendStateTyping();

  let menu = `⚠ *IMPORTANTE:* Escolha seu horário:
  Horários disponíveis `;
  menu += `*Escolha seu horário digitando o número correspondente:*\n\n`;
  menu += `10:00h (Manhã)\n`;
  menu += `12:00h (Meio-dia)\n`;
  menu += `14:00h (Tarde)\n`;
  menu += `15:30h (Tarde)\n`;
  menu += `17:30h (Final da tarde)\n`;
  menu += `19:30h (Noite)\n\n`;

  await client.sendMessage(msg.from, menu);
}

module.exports = enviarMensagemMenu;