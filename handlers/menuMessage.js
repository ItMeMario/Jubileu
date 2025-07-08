const delay = require('../utils/delay');
const randomDelay = require('../utils/randomDelay')

async function enviarMensagemMenu(client, msg, chat) {
    await delay(3000); //delay de 3 segundos para testes
    //await randomDelay(60, 180)
    await chat.sendStateTyping();

    const contact = await msg.getContact();
    const name = contact.pushname.split(" ")[0];

    await client.sendMessage(msg.from, `Olá ${name}! Tudo bem? 
Aqui é o Léo Rieper, da empresa *Dilson Stein!* 
Estamos organizando um evento para escolher novos modelos, atores, atrizes e influencers em *VITÓRIA-ES.* E eu gostaria de convidar VOCÊ para participar!
 
⚠️ A seleção acontecerá dia *17 de julho, QUINTA-FEIRA*, no salão de eventos do Vitória Praia Hotel.
*Endereço: Av. Dante Michelini, 1057 - Jardim da Penha, Vitória - ES*

✔️ *Roupas:* Calça ou short jeans e camiseta básica PRETA OU BRANCA. Nos pés, salto ou tênis.   
✔️ *Taxa de inscrição:* 5KG de arroz.  
✔️ Não precisa ter experiência, haverá uma equipe para orientar você!
-
*Redes sociais:*
Instagram: @Leorieper
Tiktok: @Leonardorieper`);
     await delay(3000);  //delay de 3 segundos para testes
    //await randomDelay(60, 180)
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
