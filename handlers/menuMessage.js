const { Buttons } = require('whatsapp-web.js');
const delay = require('../utils/delay');

async function enviarMensagemMenu(client, msg, chat) {
    await delay(3000);
    await chat.sendStateTyping();

    const contact = await msg.getContact();
    const name = contact.pushname.split(" ")[0];

    await client.sendMessage(msg.from, `Olá ${name}!
Oi, tudo bem? 
Aqui é o Jubileu, da empresa Jubileu e CIA! 
Estamos organizando um evento para escolher novos modelos, atores, atrizes e influencers em Nome de cidade. E eu gostaria de convidar VOCÊ para participar!

⚠ A seleção acontecerá dia X, QUINTA-FEIRA, no salão de eventos do Salão nome.
Endereço: Rua X, X - Setor X, XX

✔ Roupas: Calça ou short jeans e camiseta básica PRETA OU BRANCA. Nos pés, salto ou tênis.   
✔ Taxa de inscrição: 5KG de arroz.  
✔ Não precisa ter experiência, haverá uma equipe para orientar você!

Redes sociais:
Instagram: @Jubileu
Tiktok: @Jubileu`);

    await delay(3000);
    await chat.sendStateTyping();

    let menu = `⚠ IMPORTANTE: Escolha seu horário:
    Horários disponíveis `;
    menu += `*Escolha seu horário digitando o número correspondente:*\n\n`;
    menu += `1 - 10:00h (Manhã)\n`;
    menu += `2 - 12:00h (Meio-dia)\n`;
    menu += `3 - 14:00h (Tarde)\n`;
    menu += `4 - 15:30h (Tarde)\n`;
    menu += `5 - 17:30h (Final da tarde)\n`;
    menu += `6 - 19:30h (Noite)\n\n`;
    menu += `_Exemplo: Digite *3* para o horário das 14:00h._`;

    await client.sendMessage(msg.from, menu);

}

module.exports = enviarMensagemMenu;
