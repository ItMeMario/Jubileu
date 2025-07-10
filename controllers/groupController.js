const groupService = require('../services/groupService');
const { 
    showGroupManagementMenu,
    showGroupList,
    promptForGroupLink,
    promptForGroupId,
    confirmAction
} = require('../views/groupViews');

async function handleGroupManagement(rl) {
    while (true) {
        const currentGroups = groupService.getAllGroups();
        const currentMode = groupService.getCurrentMode();
        
        const option = await showGroupManagementMenu(rl, currentGroups, currentMode);
        
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
                await handleSetPrimaryGroup(rl);
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
    showGroupList(currentGroups, currentMode, true);
    console.log('\nPressione Enter para continuar...');
    await new Promise(resolve => rl.question('', resolve));
}

async function handleAddGroup(rl) {
    const link = await promptForGroupLink(rl);
    if (!link) return;

    const groups = groupService.getAllGroups();
    const isFirstGroup = groups.length === 0;
    
    const newGroup = groupService.addGroup(link, isFirstGroup);
    
    console.log('\n✅ Grupo adicionado com sucesso!');
    console.log(`🆔 ID: ${newGroup.id}`);
    console.log(`🔗 Link: ${newGroup.link}`);
    if (newGroup.isPrimary) {
        console.log('⭐ Este é o grupo primário (modo SINGLE)');
    }
}

async function handleEditGroup(rl) {
    const groups = groupService.getAllGroups();
    if (groups.length === 0) {
        console.log('Nenhum grupo cadastrado para editar.');
        return;
    }

    showGroupList(groups);
    const id = await promptForGroupId(rl, 'editar');
    const group = groupService.getGroupById(id);
    if (!group) return;

    const newLink = await promptForGroupLink(rl, group.link);
    if (!newLink) return;

    const success = groupService.updateGroup(id, newLink);
    if (success) {
        console.log('\nGrupo atualizado com sucesso!');
    } else {
        console.log('Falha ao atualizar o grupo.');
    }
}

async function handleDeleteGroup(rl) {
    const groups = groupService.getAllGroups();
    if (groups.length === 0) {
        console.log('Nenhum grupo cadastrado para remover.');
        return;
    }

    showGroupList(groups);
    const id = await promptForGroupId(rl, 'remover');
    const group = groupService.getGroupById(id);
    if (!group) return;

    const shouldDelete = await confirmAction(rl, `remover o grupo ${id}`);
    if (!shouldDelete) {
        console.log('Operação cancelada.');
        return;
    }

    const success = groupService.deleteGroup(id);
    if (success) {
        console.log('Grupo removido com sucesso!');
    } else {
        console.log('Falha ao remover o grupo.');
    }
}

async function handleSetPrimaryGroup(rl) {
    const groups = groupService.getAllGroups();
    if (groups.length === 0) {
        console.log('\n❌ Nenhum grupo cadastrado.');
        return;
    }

    console.log('\nSelecione o grupo primário:');
    groups.forEach((group, index) => {
        console.log(`${index + 1}. ${group.id} | ${group.link} ${group.isPrimary ? '(ATUAL)' : ''}`);
    });

    const choice = await new Promise(resolve => {
        rl.question('\nDigite o número do grupo: ', resolve);
    });

    const index = parseInt(choice) - 1;
    if (isNaN(index) || index < 0 || index >= groups.length) {
        console.log('\n❌ Opção inválida.');
        return;
    }

    const selectedGroup = groups[index];
    groupService.setPrimaryGroup(selectedGroup.id);
    
    console.log(`\n✅ Grupo ${selectedGroup.id} definido como primário!`);
    console.log(`🔗 Link: ${selectedGroup.link}`);
}

async function handleToggleMode(rl) {
    const currentMode = groupService.getCurrentMode();
    const newMode = currentMode === 'SINGLE' ? 'MULTI' : 'SINGLE';

    console.log(`\nModo atual: ${currentMode}`);
    console.log(`Novo modo: ${newMode}`);
    console.log('\nIMPORTANTE:');
    console.log('- SINGLE: Usará apenas o grupo marcado como "primário"');
    console.log('- MULTI: Usará todos os grupos cadastrados');

    const shouldToggle = await confirmAction(rl, `mudar para modo ${newMode}`);
    if (!shouldToggle) {
        console.log('\nOperação cancelada.');
        return;
    }

    groupService.setMode(newMode);
    console.log(`\n✅ Modo alterado para ${newMode}!`);
    
    // Se mudou para SINGLE e não há grupo primário, define o primeiro
    if (newMode === 'SINGLE') {
        const groups = groupService.getAllGroups();
        if (groups.length > 0 && !groups.some(g => g.isPrimary)) {
            groupService.setPrimaryGroup(groups[0].id);
            console.log(`⚠️ Grupo ${groups[0].id} definido como primário automaticamente.`);
        }
    }
}

module.exports = {
    handleGroupManagement,
    handleViewGroups,
    handleAddGroup,
    handleEditGroup,
    handleDeleteGroup,
    handleSetPrimaryGroup,
    handleToggleMode
};