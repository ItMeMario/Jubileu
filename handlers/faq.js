// faq.js
module.exports = {
    enviarFAQ: async function(client, userNumber) {
        const faqMessage = 
            `📚 *Perguntas Frequentes (FAQ)*\n\n` +
            `1. *Como faço para me cadastrar?*\n` +
            `   - Basta digitar "menu" e seguir as instruções\n\n` +
            `2. *Quais são os horários disponíveis?*\n` +
            `   - Temos horários de manhã, tarde e noite\n\n` +
            `3. *Posso mudar meu horário depois?*\n` +
            `   - Sim, entre em contato com o administrador\n\n` +
            `Digite "menu" para voltar ao menu principal.`;
        
        await client.sendMessage(userNumber, faqMessage);
    }
};