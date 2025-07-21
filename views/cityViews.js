async function showCityManagementMenu(rl, cities) {
    console.log('\n=== Gerenciamento de Cidades ===');
    
    if (cities.length > 0) {
        console.log('\nCidades cadastradas:');
        cities.forEach((city, index) => {
            const primaryStatus = city.isPrimary ? ' [PRIMÁRIA]' : '';
            console.log(`${index + 1}. ${city.name}${primaryStatus}`);
        });
    } else {
        console.log('\nNenhuma cidade cadastrada.');
    }

    console.log('\n1. Adicionar cidade');
    console.log('2. Editar cidade');
    console.log('3. Definir cidade primária');
    console.log('4. Ver cidades cadastradas');
    console.log('5. Excluir cidade');
    console.log('0. Voltar');

    return await new Promise(resolve => {
        rl.question('\nEscolha uma opção: ', resolve);
    });
}

function showCityList(cities, showDetails = false) {
    if (cities.length === 0) {
        console.log('\nNenhuma cidade cadastrada para visualizar.');
        return;
    }

    if (showDetails) {
        console.log('\n=== Detalhes das Cidades ===');
        console.log(`Total de cidades: ${cities.length}`);
        console.log(`Cidade primária: ${cities.find(c => c.isPrimary)?.name || 'Nenhuma'}`);
    } else {
        console.log('\nCidades disponíveis:');
    }
    
    cities.forEach((city, index) => {
        if (showDetails) {
            console.log('\n' + '═'.repeat(50));
            console.log(`Cidade ${index + 1} de ${cities.length}`);
            console.log('─'.repeat(50));
        }
        console.log(`Nome: ${city.name}`);
        if (showDetails) {
            console.log(`Link: ${city.link || 'Nenhum link cadastrado'}`);
            console.log(`Primária: ${city.isPrimary ? 'Sim' : 'Não'}`);
            console.log(`Criada em: ${city.createdAt}`);
            console.log(`Última atualização: ${city.updatedAt}`);
        }
    });
}

async function promptForCityName(rl, currentName = '') {
    const prompt = currentName 
        ? `\nDigite o novo nome da cidade (atual: ${currentName}): `
        : '\nDigite o nome da cidade: ';
    
    const name = await new Promise(resolve => rl.question(prompt, resolve));
    if (!name) {
        console.log('❌ Nome da cidade não pode ser vazio.');
        return null;
    }
    return name;
}

async function promptForCityLink(rl, currentLink = '') {
    const prompt = currentLink 
        ? `\nDigite o novo link da cidade (deixe em branco para manter o atual: ${currentLink}): `
        : '\nDigite o link da cidade (opcional): ';
    
    const link = await new Promise(resolve => rl.question(prompt, resolve));
    return link.trim(); // Retorna o link ou string vazia
}

async function promptForCityMessage(rl, currentMessage = '') {
    const prompt = currentMessage 
        ? `\nDigite a nova mensagem (atual: ${currentMessage}): `
        : '\nDigite a mensagem da cidade: ';
    
    const message = await new Promise(resolve => rl.question(prompt, resolve));
    return message.trim();
}

async function promptForCitySelection(rl, cities, action) {
    if (cities.length === 0) {
        console.log('\nNenhuma cidade cadastrada para esta ação.');
        return null;
    }

    console.log('\nSelecione uma cidade:');
    cities.forEach((city, index) => {
        console.log(`${index + 1}. ${city.name}${city.isPrimary ? ' [PRIMÁRIA]' : ''}`);
    });

    const choice = await new Promise(resolve => {
        rl.question(`\nDigite o número da cidade que deseja ${action}: `, resolve);
    });

    const index = parseInt(choice) - 1;
    if (isNaN(index) || index < 0 || index >= cities.length) {
        console.log('❌ Seleção inválida.');
        return null;
    }

    return index;
}

async function confirmAction(rl, action) {
    const response = await new Promise(resolve => {
        rl.question(`\nTem certeza que deseja ${action}? (s/n): `, resolve);
    });
    return response.toLowerCase() === 's';
}

module.exports = {
    showCityManagementMenu,
    showCityList,
    promptForCityName,
    promptForCityLink, 
    promptForCitySelection,
    promptForCityMessage,
    confirmAction
};