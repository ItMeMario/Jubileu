const messageController = require('../controllers/messageController');
const groupController = require('../controllers/groupController');
const cityController = require('../controllers/cityController')

async function handleConfigMenu(rl) {
    while (true) {
        console.log('\n=== Menu de Configuração ===');
        console.log('1. Adicionar nova mensagem');
        console.log('2. Ver todas as mensagens');
        console.log('3. Editar uma mensagem');
        console.log('4. Deletar uma mensagem');
        console.log('5. Ver última mensagem adicionada');
        console.log('6. Gerenciar grupos');
        console.log('7. Gerenciar cidades');
        console.log('0. Sair');

        const choice = await new Promise(resolve => {
            rl.question('Escolha uma opção: ', resolve);
        });

        switch (choice) {
            case '1':
                await messageController.handleAddMessage(rl);
                break;
            case '2':
                await messageController.handleListMessages();
                break;
            case '3':
                await messageController.handleEditMessage(rl);
                break;
            case '4':
                await messageController.handleDeleteMessage(rl);
                break;
            case '5':
                await messageController.handleShowLastMessage();
                break;
            case '6':
                await groupController.handleGroupManagement(rl);
                break;
            case '7':
                await cityController.handleCities(rl);
                break;
            case '0':
                console.log('Saindo do menu de configuração...');
                return;
            default:
                console.log('Opção inválida. Tente novamente.');
        }
    }
}

module.exports = {
    handleConfigMenu
};