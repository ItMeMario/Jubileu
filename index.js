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
        console.log('3. Editar uma mensagem');
        console.log('4. Deletar uma mensagem');
        console.log('5. Ver última mensagem adicionada');
        console.log('0. Sair');

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
                await handleEditMessage(rl);
                break;
            case '4':
                await handleDeleteMessage(rl);
                break;
            case '5':
                await handleShowLastMessage();
                break;
            case '0':
                console.log('Saindo do menu de configuração...');
                return;
            default:
                console.log('Opção inválida. Tente novamente.');
        }
    }
}

async function handleAddMessage(rl) {
    console.log('\nDigite sua mensagem (digite "/end" em uma nova linha para finalizar):');
    
    let messageLines = [];
    let collecting = true;
    
    while (collecting) {
        const line = await new Promise(resolve => rl.question('> ', resolve));
        if (line.trim() === '/end') {
            collecting = false;
        } else {
            messageLines.push(line);
        }
    }
    
    const fullMessage = messageLines.join('\n');
    
    if (fullMessage.trim() === '') {
        console.log('Mensagem vazia não foi salva.');
        return;
    }
    
    const newMessage = messageService.addMessage(fullMessage);
    console.log('\nMensagem adicionada com sucesso!');
    console.log(`ID: ${newMessage.id}`);
    console.log('\nConteúdo:');
    console.log(newMessage.content);
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
        console.log(`Criada em: ${msg.createdAt}`);
        if (msg.updatedAt) {
            console.log(`Atualizada em: ${msg.updatedAt}`);
        }
        console.log('Conteúdo:');
        console.log(msg.content);
        console.log('─'.repeat(50));
    });
}

async function handleShowLastMessage() {
    const lastMessage = messageService.getLastMessage();
    if (!lastMessage) {
        console.log('Nenhuma mensagem cadastrada.');
        return;
    }
    
    console.log('\n=== Última Mensagem Adicionada ===');
    console.log(`ID: ${lastMessage.id}`);
    console.log(`Data: ${lastMessage.createdAt}`);
    console.log('Conteúdo:');
    console.log(lastMessage.content);
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

async function handleEditMessage(rl) {
    const messages = messageService.getMessages();
    if (messages.length === 0) {
        console.log('Nenhuma mensagem para editar.');
        return;
    }

    console.log('\n=== Mensagens Disponíveis para Edição ===');
    messages.forEach(msg => {
        console.log(`\nID: ${msg.id}`);
        console.log('Conteúdo:');
        console.log(msg.content);
        console.log('─'.repeat(50));
    });

    const idToEdit = await new Promise(resolve => {
        rl.question('\nDigite o ID da mensagem que deseja editar: ', resolve);
    });

    const messageToEdit = messageService.getMessageById(idToEdit);
    if (!messageToEdit) {
        console.log('Mensagem não encontrada.');
        return;
    }

    console.log('\nEditando mensagem:');
    console.log(messageToEdit.content);
    console.log('\nDigite a nova versão da mensagem (digite "/end" em uma nova linha para finalizar):');

    let messageLines = [];
    let collecting = true;
    
    while (collecting) {
        const line = await new Promise(resolve => rl.question('> ', resolve));
        if (line.trim() === '/end') {
            collecting = false;
        } else {
            messageLines.push(line);
        }
    }

    const newContent = messageLines.join('\n');
    const success = messageService.updateMessage(idToEdit, newContent);

    if (success) {
        console.log('\nMensagem atualizada com sucesso!');
        console.log('Novo conteúdo:');
        console.log(newContent);
    } else {
        console.log('Falha ao atualizar a mensagem.');
    }
}

// Inicializa a aplicação
initializeApp().catch(err => {
    console.error('Erro durante a inicialização:', err);
    process.exit(1);
});