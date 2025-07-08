// faq.js
module.exports = {
    enviarFAQ: async function(client, msg) {
        const faqMessage = 
            `📚 *Perguntas Frequentes (FAQ)*\n\n` +
            `1. *Como faço para me cadastrar?*\n` +
            `   - Basta digitar "menu" e seguir as instruções\n\n` +
            `2. *Quais são os horários disponíveis?*\n` +
            `   - Os horários disponíveis se encontram nas instruções\n\n` +
            `3. *Posso mudar meu horário depois?*\n` +
            `   - Claro que pode, basta falar conosco\n\n` +
            `4. *Posso levar acompanhante?*\n` +
            `   - Com certeza! Pai e Mãe, incentivamos a participação da família\n\n` +
            `5. *Menor de idade pode participar?*\n` +
            `   - Sim! Desde que esteja acompanhado de um responsável legal\n\n` +
            `7. *É permitido o uso de maquiagem?*\n` +
            `   - Sim! Mas em pouca quantidade, excessos podem prejudicar a avaliação\n\n` +
            `8. *Vou me tornar modelo automaticamente ao participar da seleção?*\n` +
            `   - Você estará participando da seleção, e poderá haver uma chance, mas não há como prometer resultados. Tudo depende do seu perfil e das necessidades do momento.\n\n` +
            `9. *Quem é Dilson Stein?*\n` +
            `   - A empresa atua no mercado desde 1985 com o mesmo nome e descobriu nomes como: Gisele Bündchen, Alessandra Ambrósio, Carol Trentini, Jonas Sulzbach e Daiane Sodré.\n\n` +
            `10. *Você continua com dúvidas?*\n` +
            `   - MARQUE UM HORÁRIO AGORA MESMO e compareça na seleção! Haverá uma equipe para te orientar\n\n` +
            `Digite "menu" para voltar ao menu principal.`;

        await client.sendMessage(msg.from, faqMessage);
    }
};