const fs = require('fs');
const path = require('path');

const storagePath = path.join(__dirname, 'messagesStorage.json');

// Inicializa o arquivo de armazenamento se não existir ou estiver vazio/corrompido
function initializeStorage() {
    try {
        if (!fs.existsSync(storagePath)) {
            fs.writeFileSync(storagePath, JSON.stringify([], null, 2));
            return [];
        }
        
        const fileContent = fs.readFileSync(storagePath, 'utf-8');
        if (!fileContent.trim()) {
            fs.writeFileSync(storagePath, JSON.stringify([], null, 2));
            return [];
        }
        
        return JSON.parse(fileContent);
    } catch (error) {
        console.error('Erro ao ler o arquivo de armazenamento, recriando...', error);
        fs.writeFileSync(storagePath, JSON.stringify([], null, 2));
        return [];
    }
}

// Função para salvar todas as mensagens no arquivo
function saveMessages(messages) {
    fs.writeFileSync(storagePath, JSON.stringify(messages, null, 2));
}

// Lê todas as mensagens
function getMessages() {
    return initializeStorage();
}

// Adiciona uma nova mensagem
function addMessage(message) {
    const messages = getMessages();
    const newMessage = {
        id: Date.now().toString(),
        content: message,
        createdAt: new Date().toISOString(),
        updatedAt: null
    };
    messages.push(newMessage);
    saveMessages(messages);
    return newMessage;
}

// Remove uma mensagem pelo ID
function deleteMessage(id) {
    const messages = getMessages();
    const initialLength = messages.length;
    const filteredMessages = messages.filter(msg => msg.id !== id);
    
    if (filteredMessages.length !== initialLength) {
        saveMessages(filteredMessages);
        return true;
    }
    return false;
}

// Obtém a última mensagem adicionada
function getLastMessage() {
    const messages = getMessages();
    return messages.length > 0 ? messages[messages.length - 1] : null;
}

// Obtém uma mensagem específica por ID
function getMessageById(id) {
    const messages = getMessages();
    return messages.find(msg => msg.id === id);
}

// Atualiza uma mensagem existente
function updateMessage(id, newContent) {
    const messages = getMessages();
    const messageIndex = messages.findIndex(msg => msg.id === id);
    
    if (messageIndex === -1) {
        return { success: false, message: 'Mensagem não encontrada' };
    }
    
    messages[messageIndex] = {
        ...messages[messageIndex],
        content: newContent,
        updatedAt: new Date().toISOString()
    };
    
    saveMessages(messages);
    return { success: true, updatedMessage: messages[messageIndex] };
}

// Função para buscar mensagens que contenham determinado texto
function searchMessages(searchTerm) {
    const messages = getMessages();
    return messages.filter(msg => 
        msg.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
}

module.exports = {
    getMessages,
    addMessage,
    deleteMessage,
    getLastMessage,
    getMessageById,
    updateMessage,
    searchMessages
};