const client = require('../client');
const enviarMensagemMenu = require('./menuMessage');
const delay = require('../utils/delay');
const HORARIOS = require('../horarios'); // Importa o novo mapeamento

// Defina o ID do seu grupo
const GRUPO_UNICO = "5511999999999-9999999999@g.us";

// Objeto para controlar o estado dos usuários
const userStates = {};

// Função para normalizar o texto de entrada
function normalizarTexto(texto) {
    return texto
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/[^a-z0-9\s]/g, "") // Remove caracteres especiais
        .trim();
}

// Função para encontrar horário
function encontrarHorario(inputUsuario) {
    const inputNormalizado = normalizarTexto(inputUsuario);
    
    // Verifica se é um número direto (1-6)
    if (/^[1-6]$/.test(inputNormalizado)) {
        const opcao = parseInt(inputNormalizado);
        const horario = Object.values(HORARIOS).find(h => h.id === opcao);
        return horario ? { ...horario, id: opcao } : null;
    }
    
    return HORARIOS[inputNormalizado] || null;
}

module.exports = async function messageHandler(msg) {
    const chat = await msg.getChat();
    const userNumber = msg.from;

    // Se for mensagem inicial (menu, oi, etc.)
    if (msg.body.match(/(menu)/i) && msg.from.endsWith('@c.us')) {
        await enviarMensagemMenu(client, msg, chat);
        userStates[userNumber] = { step: 'awaiting_time' }; // Define estado
    }

    // Se o usuário está no estado "awaiting_time" (escolhendo horário)
    else if (userStates[userNumber]?.step === 'awaiting_time') {
        const opcao = encontrarHorario(msg.body.trim());

        if (opcao) {
            userStates[userNumber] = {
                step: 'awaiting_name',
                selectedTime: `${opcao.horario} - ${opcao.descricao}`,
                selectedTimeObj: opcao // Guarda o objeto completo para referência
            };
            await chat.sendStateTyping();
            await client.sendMessage(msg.from, `Você escolheu *${opcao.horario} - ${opcao.descricao}*.\nAgora, *digite seu nome completo* para confirmar:`);
        } else {
            // Mensagem de erro mais informativa
            const exemplos = ["10h", "15:30", "tarde", "noite", "sete e meia", "1-6"];
            await client.sendMessage(msg.from, `🤔 Desculpe, não entendi. Qual horário você gostaria mesmo?`);
        }
    }

    // Se o usuário está no estado "awaiting_name" (enviando nome) - MANTIDO IGUAL
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
            delete userStates[userNumber];
        }
    }

};