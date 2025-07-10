const delay = require('../utils/delay');
const randomDelay = require('../utils/randomDelay');
const fs = require('fs');
const path = require('path');
const messagesDir = path.join(__dirname, '../data/messages');

// Carrega as mensagens do arquivo JSON
const messageStoragePath = path.join(__dirname, '../data/messages.json');
const messages = JSON.parse(fs.readFileSync(messageStoragePath, 'utf-8'));

// Pega a última mensagem válida (ignorando mensagens muito curtas ou de teste)
const getLatestValidMessage = () => {
  if (!messages || messages.length === 0) return null;

  const sortedMessages = [...messages].sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  );

  for (const msg of sortedMessages) {
    const filePath = path.join(messagesDir, msg.filename);

    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf8');

    if (content && content.length > 100) {
      return content;
    }
  }

  return null; // fallback padrão
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