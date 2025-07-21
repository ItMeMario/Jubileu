const messageService = require('../services/messageService');
const { 
    showMessageList, 
    showLastMessage,
    promptForMessageContent,
    promptForMessageId
} = require('../views/messageViews');

async function handleAddMessage(rl) {
    const content = await promptForMessageContent(rl);
    if (!content) return;

    const newMessage = await messageService.addMessage(content);
    console.log('\nMensagem adicionada com sucesso!');
    console.log(`ID: ${newMessage.id}`);
    console.log('\nConteúdo:');
    console.log(newMessage.content);
}

async function handleListMessages() {
    const messages = await messageService.getMessages();

    if (!Array.isArray(messages)) {
        console.error('Erro: getMessages() não retornou um array. Valor:', messages);
        return;
    }

    showMessageList(messages);
}

async function handleEditMessage(rl) {
    const messages = await messageService.getMessages();
    if (!Array.isArray(messages) || messages.length === 0) {
        console.log('Nenhuma mensagem para editar.');
        return;
    }

    showMessageList(messages);
    const idToEdit = await promptForMessageId(rl, 'editar');
    const messageToEdit = await messageService.getMessageById(idToEdit);
    if (!messageToEdit) return;

    const newContent = await promptForMessageContent(rl, messageToEdit.content);
    const result = await messageService.updateMessage(idToEdit, newContent);

    if (result.success) {
        console.log('\nMensagem atualizada com sucesso!');
        console.log('Novo conteúdo:');
        console.log(newContent);
    } else {
        console.log('Falha ao atualizar a mensagem.');
    }
}

async function handleDeleteMessage(rl) {
    const messages = await messageService.getMessages();
    if (!Array.isArray(messages) || messages.length === 0) {
        console.log('Nenhuma mensagem para deletar.');
        return;
    }

    showMessageList(messages);
    const idToDelete = await promptForMessageId(rl, 'deletar');
    const deleted = await messageService.deleteMessage(idToDelete);

    if (deleted) {
        console.log('Mensagem deletada com sucesso!');
    } else {
        console.log('Mensagem não encontrada.');
    }
}

async function handleShowLastMessage() {
    const lastMessage = await messageService.getLastMessage();
    showLastMessage(lastMessage);
}

module.exports = {
    handleAddMessage,
    handleListMessages,
    handleEditMessage,
    handleDeleteMessage,
    handleShowLastMessage
};
