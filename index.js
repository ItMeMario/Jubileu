const client = require('./client');
const qrcode = require('qrcode-terminal');
const messageHandler = require('./handlers/message');
const readline = require('readline');
const messageService = require('./services/messageService');

async function initializeApp() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const answer = await new Promise(resolve => {
        rl.question('Pressione Enter para continuar ou digite "config" para configurar a mensagem: ', resolve);
    });

    if (answer.toLowerCase() === 'config') {
        await handleConfigMenu(rl);
        rl.close();
        return;
    }

    // Configuração normal do cliente WhatsApp
    client.on('qr', qr => qrcode.generate(qr, { small: true }));
    client.on('ready', () => {
        console.log('Tudo certo! WhatsApp conectado.');
    });
    client.on('message', messageHandler);

    client.initialize();
}

async function handleConfigMenu(rl) {
    while (true) {
        console.log('\n=== Menu de Configuração de Mensagens ===');
        console.log('1. Adicionar nova mensagem');
        console.log('2. Ver todas as mensagens');
        console.log('3. Deletar uma mensagem');
        console.log('4. Ver última mensagem adicionada');
        console.log('5. Sair');

        const choice = await new Promise(resolve => {
            rl.question('Escolha uma opção: ', resolve);
        });

        switch (choice) {
            case '1':
                await handleAddMessage(rl);
                break;
            case '2':
                await handleListMessages();
                break;
            case '3':
                await handleDeleteMessage(rl);
                break;
            case '4':
                await handleShowLastMessage();
                break;
            case '5':
                console.log('Saindo do menu de configuração...');
                return;
            default:
                console.log('Opção inválida. Tente novamente.');
        }
    }
}

async function handleAddMessage(rl) {
    const message = await new Promise(resolve => {
        rl.question('Digite a nova mensagem: ', resolve);
    });
    const newMessage = messageService.addMessage(message);
    console.log('Mensagem adicionada com sucesso!');
    console.log(`ID: ${newMessage.id}`);
    console.log(`Conteúdo: ${newMessage.content}`);
}

async function handleListMessages() {
    const messages = messageService.getMessages();
    if (messages.length === 0) {
        console.log('Nenhuma mensagem cadastrada.');
        return;
    }
    console.log('\n=== Mensagens Cadastradas ===');
    messages.forEach(msg => {
        console.log(`\nID: ${msg.id}`);
        console.log(`Conteúdo: ${msg.content}`);
        console.log(`Data: ${msg.createdAt}`);
    });
}

async function handleDeleteMessage(rl) {
    const messages = messageService.getMessages();
    if (messages.length === 0) {
        console.log('Nenhuma mensagem para deletar.');
        return;
    }

    console.log('\n=== Mensagens Disponíveis para Exclusão ===');
    messages.forEach(msg => {
        console.log(`\nID: ${msg.id}`);
        console.log(`Conteúdo: ${msg.content}`);
    });

    const idToDelete = await new Promise(resolve => {
        rl.question('\nDigite o ID da mensagem que deseja deletar: ', resolve);
    });

    const deleted = messageService.deleteMessage(idToDelete);
    if (deleted) {
        console.log('Mensagem deletada com sucesso!');
    } else {
        console.log('Mensagem não encontrada.');
    }
}

async function handleShowLastMessage() {
    const lastMessage = messageService.getLastMessage();
    if (!lastMessage) {
        console.log('Nenhuma mensagem cadastrada.');
        return;
    }
    console.log('\n=== Última Mensagem Adicionada ===');
    console.log(`ID: ${lastMessage.id}`);
    console.log(`Conteúdo: ${lastMessage.content}`);
    console.log(`Data: ${lastMessage.createdAt}`);
}

// Inicializa a aplicação
initializeApp().catch(err => {
    console.error('Erro durante a inicialização:', err);
    process.exit(1);
});