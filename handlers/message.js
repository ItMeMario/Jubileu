const client = require('../client');
const enviarMensagemMenu = require('./menuMessage');
const delay = require('../utils/delay');

// Defina o ID do seu grupo
const GRUPO_UNICO = "5511999999999-9999999999@g.us";

// Mapeamento de opções numéricas para horários
const HORARIOS = {
    1: "10:00h - Manhã",
    2: "12:00h - Meio-dia",
    3: "14:00h - Tarde",
    4: "15:30h - Tarde",
    5: "17:30h - Final da tarde",
    6: "19:30h - Noite"
};

// Objeto para controlar o estado dos usuários
const userStates = {};

module.exports = async function messageHandler(msg) {
    const chat = await msg.getChat();
    const userNumber = msg.from;

    // Se for mensagem inicial (menu, oi, etc.)
    if (msg.body.match(/(menu|dia|tarde|noite|oi|olá|ola)/i) && msg.from.endsWith('@c.us')) {
        await enviarMensagemMenu(client, msg, chat);
        userStates[userNumber] = { step: 'awaiting_time' }; // Define estado
    }

    // Se o usuário está no estado "awaiting_time" (escolhendo horário)
    else if (userStates[userNumber]?.step === 'awaiting_time') {
        const opcao = parseInt(msg.body.trim());

        if (opcao >= 1 && opcao <= 6) {
            userStates[userNumber] = {
                step: 'awaiting_name',
                selectedTime: HORARIOS[opcao]
            };
            await chat.sendStateTyping();
            await client.sendMessage(msg.from, `Você escolheu *${HORARIOS[opcao]}*.\nAgora, *digite seu nome completo* para confirmar:`);
        } else {
            await client.sendMessage(msg.from, "❌ Opção inválida. Digite um número de 1 a 6.");
        }
    }

    // Se o usuário está no estado "awaiting_name" (enviando nome)
    else if (userStates[userNumber]?.step === 'awaiting_name') {
        const nomeCompleto = msg.body.trim();
        const horarioSelecionado = userStates[userNumber].selectedTime;

        try {
            const group = await client.getChatById(GRUPO_UNICO);
            await group.addParticipants([userNumber]);

            // Mensagem no grupo
            await client.sendMessage(
                GRUPO_UNICO,
                `✅ *${nomeCompleto}* entrou no evento!\n⏰ Horário: *${horarioSelecionado}*`
            );

            // Confirmação no privado
            await msg.reply(`✅ Pronto! Você foi adicionado ao grupo. Seu horário: *${horarioSelecionado}*`);
            
            // Limpa o estado
            delete userStates[userNumber];
        } catch (error) {
            console.error("Erro ao adicionar:", error);
            await msg.reply('❌ Erro ao adicionar. Verifique:\n1. O Jubileu não é admin do grupo\n2. Seu número não está nos contatos do Jubileu');
            delete userStates[userNumber]; // Limpa o estado mesmo em caso de erro
        }
    }
};