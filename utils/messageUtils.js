function showMessageList(messages) {
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

function showLastMessage(lastMessage) {
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

async function promptForMessageContent(rl, existingContent = '') {
    console.log('\nDigite sua mensagem (digite "/end" em uma nova linha para finalizar):');
    if (existingContent) {
        console.log('Conteúdo atual:');
        console.log(existingContent);
        console.log('Digite a nova versão:');
    }
    
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
        return null;
    }
    
    return fullMessage;
}

async function promptForMessageId(rl, action) {
    return await new Promise(resolve => {
        rl.question(`\nDigite o ID da mensagem que deseja ${action}: `, resolve);
    });
}

module.exports = {
    showMessageList,
    showLastMessage,
    promptForMessageContent,
    promptForMessageId
};