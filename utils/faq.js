// faq.js
module.exports = {
    enviarFAQ: async function(client, msg) {
        const faqMessage = 
            `📚 *Perguntas Frequentes (FAQ)*\n\n` +
            ` *Como faço para me cadastrar?*\n` +
            `   - Basta digitar "menu" e seguir as instruções\n\n` +
            ` *Quais são os horários disponíveis?*\n` +
            `   - Os horários disponíveis se encontram nas instruções\n\n` +
            ` *Posso mudar meu horário depois?*\n` +
            `   - Claro que pode, basta falar conosco\n\n` +
            ` *Posso levar acompanhante?*\n` +
            `   - Com certeza! Pai e Mãe, incentivamos a participação da família\n\n` +
            ` *Menor de idade pode participar?*\n` +
            `   - Sim! Desde que esteja acompanhado de um responsável legal\n\n` +
            ` *É permitido o uso de maquiagem?*\n` +
            `   - Sim! Mas em pouca quantidade, excessos podem prejudicar a avaliação\n\n` +
            ` *Vou me tornar modelo automaticamente ao participar da seleção?*\n` +
            `   - Você estará participando da seleção, e poderá haver uma chance, mas não há como prometer resultados. Tudo depende do seu perfil e das necessidades do momento.\n\n` +
            ` *Quem é Dilson Stein?*\n` +
            `   - A empresa atua no mercado desde 1985 com o mesmo nome e descobriu nomes como: Gisele Bündchen, Alessandra Ambrósio, Carol Trentini, Jonas Sulzbach e Daiane Sodré.\n\n` +
            ` *Já faço parte do portal?*\n` +
            `   - O evento presencial é uma programação diferente do portal e dos cursos online. Será tudo novidade.\n\n` +
            ` *Posso participar se tiver tatuagem, cabelo colorido, aparelho dentário ou usar óculos?*\n` +
            `   - Sim! Tatuagens, cabelos tingidos, aparelhos ortodônticos e óculos não impedem sua participação.\n\n` +
            `   - Tem limite de idade?.\n\n` +
            ` *Não há restrição de idade*\n` +
            ` *Você continua com dúvidas?*\n` +
            `   - MARQUE UM HORÁRIO AGORA MESMO e compareça na seleção! Haverá uma equipe para te orientar\n\n` +
            `Digite "menu" para voltar ao menu principal.`;

        await client.sendMessage(msg.from, faqMessage);
    }
};