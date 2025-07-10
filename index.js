const client = require('./client');
const qrcode = require('qrcode-terminal');
const messageHandler = require('./handlers/message');
const readline = require('readline');
const messageService = require('./services/messageService');
const configService = require('./services/configServices');
const groupService = require('./services/groupService');

async function initializeApp() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const answer = await new Promise(resolve => {
        rl.question('Pressione Enter para continuar ou digite "config" para configurar: ', resolve);
    });

    if (answer.toLowerCase() === 'config') {
        await handleConfigMenu(rl);
        rl.close();
        return;
    }

    client.on('qr', qr => qrcode.generate(qr, { small: true }));
    client.on('ready', () => {
        console.log('Tudo certo! WhatsApp conectado.');
    });
    client.on('message', messageHandler);

    client.initialize();
}

async function handleConfigMenu(rl) {
    while (true) {
        console.log('\n=== Menu de Configuração ===');
        console.log('1. Adicionar nova mensagem');
        console.log('2. Ver todas as mensagens');
        console.log('3. Editar uma mensagem');
        console.log('4. Deletar uma mensagem');
        console.log('5. Ver última mensagem adicionada');
        console.log('6. Gerenciar grupos');
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
            case '6':
                await handleGroupManagement(rl);
                break;
            case '0':
                console.log('Saindo do menu de configuração...');
                return;
            default:
                console.log('Opção inválida. Tente novamente.');
        }
    }
}

async function handleGroupManagement(rl) {
    while (true) {
        const currentGroups = groupService.getAllGroups();
        const currentMode = groupService.getCurrentMode();

        console.log('\n=== Gerenciamento de Grupos ===');
        console.log(`Modo atual: ${currentMode}`);
        
        if (currentGroups.length > 0) {
            console.log('\nResumo dos grupos cadastrados:');
            currentGroups.forEach((group, index) => {
                console.log(`${index + 1}. ID: ${group.id} | Link: ${group.link} ${index === 0 && currentMode === 'SINGLE' ? '(PRINCIPAL)' : ''}`);
            });
        } else {
            console.log('\nNenhum grupo cadastrado.');
        }

        console.log('\n1. Visualizar detalhes dos grupos');
        console.log('2. Adicionar novo grupo');
        console.log('3. Editar grupo');
        console.log('4. Remover grupo');
        console.log('5. Definir como primeiro grupo (modo SINGLE)');
        console.log('6. Alternar modo (SINGLE/MULTI)');
        console.log('0. Voltar');

        const option = await new Promise(resolve => {
            rl.question('\nEscolha uma opção: ', resolve);
        });

        switch (option) {
            case '1':
                await handleViewGroups(rl);
                break;
            case '2':
                await handleAddGroup(rl);
                break;
            case '3':
                await handleEditGroup(rl);
                break;
            case '4':
                await handleDeleteGroup(rl);
                break;
            case '5':
                await handleSetFirstGroup(rl);
                break;
            case '6':
                await handleToggleMode(rl);
                break;
            case '0':
                return;
            default:
                console.log('Opção inválida.');
        }
    }
}

async function handleViewGroups(rl) {
    const currentGroups = groupService.getAllGroups();
    const currentMode = groupService.getCurrentMode();

    if (currentGroups.length === 0) {
        console.log('\nNenhum grupo cadastrado para visualizar.');
        return;
    }

    console.log('\n=== Detalhes dos Grupos ===');
    console.log(`Modo atual: ${currentMode}`);
    console.log(`Total de grupos: ${currentGroups.length}`);
    console.log(`Grupos ativos: ${currentMode === 'SINGLE' ? '1 (o primeiro)' : 'Todos'}`);
    
    currentGroups.forEach((group, index) => {
        console.log('\n' + '═'.repeat(50));
        console.log(`Grupo ${index + 1} de ${currentGroups.length}`);
        console.log('─'.repeat(50));
        console.log(`ID: ${group.id}`);
        console.log(`Link: ${group.link}`);
        console.log(`Criado em: ${group.createdAt}`);
        console.log(`Última atualização: ${group.updatedAt}`);
        if (index === 0 && currentMode === 'SINGLE') {
            console.log('STATUS: PRINCIPAL (usado no modo SINGLE)');
        }
    });

    console.log('\nPressione Enter para continuar...');
    await new Promise(resolve => rl.question('', resolve));
}

async function handleSetFirstGroup(rl) {
    const groups = groupService.getAllGroups();
    if (groups.length < 2) {
        console.log('\nÉ necessário ter pelo menos 2 grupos para reordenar.');
        return;
    }

    console.log('\nSelecione o grupo que será o primeiro:');
    groups.forEach((group, index) => {
        console.log(`${index + 1}. ID: ${group.id} | Link: ${group.link}`);
    });

    const selectedId = await new Promise(resolve => {
        rl.question('\nDigite o ID do grupo que deve ser o primeiro: ', resolve);
    });

    const selectedGroup = groupService.getGroupById(selectedId);
    if (!selectedGroup) {
        console.log('ID inválido ou grupo não encontrado.');
        return;
    }

    // Move o grupo selecionado para a primeira posição
    const updatedGroups = groupService.getAllGroups();
    const groupIndex = updatedGroups.findIndex(g => g.id === selectedId);
    
    if (groupIndex > 0) {
        const [movedGroup] = updatedGroups.splice(groupIndex, 1);
        updatedGroups.unshift(movedGroup);
        groupService.updateGroupsOrder(updatedGroups);
        console.log(`\nGrupo ${selectedId} definido como primeiro com sucesso!`);
    } else {
        console.log('\nEste grupo já é o primeiro.');
    }
}


async function handleSetFirstGroup(rl) {
    const groups = groupService.getAllGroups();
    if (groups.length < 2) {
        console.log('\nÉ necessário ter pelo menos 2 grupos para reordenar.');
        return;
    }

    console.log('\nSelecione o grupo que será o primeiro:');
    groups.forEach((group, index) => {
        console.log(`${index + 1}. ID: ${group.id} | Link: ${group.link}`);
    });

    const selectedId = await new Promise(resolve => {
        rl.question('\nDigite o ID do grupo que deve ser o primeiro: ', resolve);
    });

    const selectedGroup = groupService.getGroupById(selectedId);
    if (!selectedGroup) {
        console.log('ID inválido ou grupo não encontrado.');
        return;
    }

    // Move o grupo selecionado para a primeira posição
    const updatedGroups = groupService.getAllGroups();
    const groupIndex = updatedGroups.findIndex(g => g.id === selectedId);
    
    if (groupIndex > 0) {
        const [movedGroup] = updatedGroups.splice(groupIndex, 1);
        updatedGroups.unshift(movedGroup);
        groupService.updateGroupsOrder(updatedGroups);
        console.log(`\nGrupo ${selectedId} definido como primeiro com sucesso!`);
    } else {
        console.log('\nEste grupo já é o primeiro.');
    }
}

async function handleAddGroup(rl) {
    const link = await new Promise(resolve => {
        rl.question('\nDigite o link do grupo: ', resolve);
    });

    if (!link) {
        console.log('Link não pode ser vazio.');
        return;
    }

    const newGroup = groupService.addGroup(link);
    console.log('\nGrupo adicionado com sucesso!');
    console.log(`ID: ${newGroup.id}`);
    console.log(`Link: ${newGroup.link}`);
}

async function handleEditGroup(rl) {
    const groups = groupService.getAllGroups();
    if (groups.length === 0) {
        console.log('Nenhum grupo cadastrado para editar.');
        return;
    }

    console.log('\nGrupos disponíveis para edição:');
    groups.forEach(group => {
        console.log(`\nID: ${group.id}`);
        console.log(`Link: ${group.link}`);
        console.log('─'.repeat(50));
    });

    const id = await new Promise(resolve => {
        rl.question('\nDigite o ID do grupo que deseja editar: ', resolve);
    });

    const group = groupService.getGroupById(id);
    if (!group) {
        console.log('Grupo não encontrado.');
        return;
    }

    const newLink = await new Promise(resolve => {
        rl.question(`\nDigite o novo link para o grupo (atual: ${group.link}): `, resolve);
    });

    if (!newLink) {
        console.log('Link não pode ser vazio.');
        return;
    }

    const success = groupService.updateGroup(id, newLink);
    if (success) {
        console.log('\nGrupo atualizado com sucesso!');
    } else {
        console.log('Falha ao atualizar o grupo.');
    }
}

async function handleToggleMode(rl) {
    const currentMode = groupService.getCurrentMode();
    const newMode = currentMode === 'SINGLE' ? 'MULTI' : 'SINGLE';

    console.log(`\nModo atual: ${currentMode}`);
    console.log(`Novo modo: ${newMode}`);
    console.log('\nNo modo SINGLE, apenas o primeiro grupo cadastrado será utilizado.');
    console.log('No modo MULTI, todos os grupos cadastrados serão utilizados.');

    const confirm = await new Promise(resolve => {
        rl.question(`\nDeseja alterar para modo ${newMode}? (s/n): `, resolve);
    });

    if (confirm.toLowerCase() === 's') {
        groupService.setMode(newMode);
        console.log(`Modo alterado para ${newMode} com sucesso!`);
    } else {
        console.log('Operação cancelada.');
    }
}

async function handleDeleteGroup(rl) {
    const groups = groupService.getAllGroups();
    if (groups.length === 0) {
        console.log('Nenhum grupo cadastrado para remover.');
        return;
    }

    console.log('\nGrupos disponíveis para remoção:');
    groups.forEach(group => {
        console.log(`\nID: ${group.id}`);
        console.log(`Link: ${group.link}`);
        console.log('─'.repeat(50));
    });

    const id = await new Promise(resolve => {
        rl.question('\nDigite o ID do grupo que deseja remover: ', resolve);
    });

    const group = groupService.getGroupById(id);
    if (!group) {
        console.log('Grupo não encontrado.');
        return;
    }

    const confirm = await new Promise(resolve => {
        rl.question(`\nTem certeza que deseja remover o grupo ${id}? (s/n): `, resolve);
    });

    if (confirm.toLowerCase() === 's') {
        const success = groupService.deleteGroup(id);
        if (success) {
            console.log('Grupo removido com sucesso!');
        } else {
            console.log('Falha ao remover o grupo.');
        }
    } else {
        console.log('Operação cancelada.');
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

initializeApp().catch(err => {
    console.error('Erro durante a inicialização:', err);
    process.exit(1);
});