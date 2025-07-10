async function showGroupManagementMenu(rl, groups, currentMode) {
    console.log('\n=== Gerenciamento de Grupos ===');
    console.log(`Modo atual: ${currentMode} (${currentMode === 'SINGLE' ? 'Usa apenas o grupo primário' : 'Usa todos os grupos'})`);
    
    if (groups.length > 0) {
        console.log('\nGrupos cadastrados:');
        groups.forEach((group, index) => {
            const primaryStatus = group.isPrimary ? ' [PRIMÁRIO]' : '';
            console.log(`${index + 1}. ${group.id} | ${group.link}${primaryStatus}`);
        });
    } else {
        console.log('\nNenhum grupo cadastrado.');
    }

    console.log('\n1. Visualizar detalhes dos grupos');
    console.log('2. Adicionar novo grupo');
    console.log('3. Editar grupo');
    console.log('4. Remover grupo');
    console.log('5. Definir grupo primário');
    console.log('6. Alternar modo (SINGLE/MULTI)');
    console.log('0. Voltar');

    return await new Promise(resolve => {
        rl.question('\nEscolha uma opção: ', resolve);
    });
}

function showGroupList(groups, mode = null, showDetails = false) {
    if (groups.length === 0) {
        console.log('\nNenhum grupo cadastrado para visualizar.');
        return;
    }

    if (showDetails) {
        console.log('\n=== Detalhes dos Grupos ===');
        if (mode) console.log(`Modo atual: ${mode}`);
        console.log(`Total de grupos: ${groups.length}`);
        console.log(`Grupos ativos: ${mode === 'SINGLE' ? '1 (o primeiro)' : 'Todos'}`);
    } else {
        console.log('\nGrupos disponíveis:');
    }
    
    groups.forEach((group, index) => {
        if (showDetails) {
            console.log('\n' + '═'.repeat(50));
            console.log(`Grupo ${index + 1} de ${groups.length}`);
            console.log('─'.repeat(50));
        }
        console.log(`ID: ${group.id}`);
        console.log(`Link: ${group.link}`);
        if (showDetails) {
            console.log(`Criado em: ${group.createdAt}`);
            console.log(`Última atualização: ${group.updatedAt}`);
            if (index === 0 && mode === 'SINGLE') {
                console.log('STATUS: PRINCIPAL (usado no modo SINGLE)');
            }
        }
    });
}

async function promptForGroupLink(rl, currentLink = '') {
    const prompt = currentLink 
        ? `\nDigite o novo link do grupo (atual: ${currentLink}): `
        : '\nDigite o link do grupo: ';
    
    const link = await new Promise(resolve => rl.question(prompt, resolve));
    if (!link) {
        console.log('❌ Link não pode ser vazio.');
        return null;
    }
    return link;
}

async function promptForGroupId(rl, action) {
    return await new Promise(resolve => {
        rl.question(`\nDigite o ID do grupo que deseja ${action}: `, resolve);
    });
}

async function confirmAction(rl, action) {
    const response = await new Promise(resolve => {
        rl.question(`\nTem certeza que deseja ${action}? (s/n): `, resolve);
    });
    return response.toLowerCase() === 's';
}

module.exports = {
    showGroupManagementMenu,
    showGroupList,
    promptForGroupLink,
    promptForGroupId,
    confirmAction
};