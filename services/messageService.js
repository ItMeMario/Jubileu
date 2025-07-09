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
        createdAt: new Date().toISOString()
    };
    messages.push(newMessage);
    fs.writeFileSync(storagePath, JSON.stringify(messages, null, 2));
    return newMessage;
}

// Remove uma mensagem pelo ID
function deleteMessage(id) {
    const messages = getMessages();
    const initialLength = messages.length;
    const filteredMessages = messages.filter(msg => msg.id !== id);
    
    if (filteredMessages.length !== initialLength) {
        fs.writeFileSync(storagePath, JSON.stringify(filteredMessages, null, 2));
        return true;
    }
    return false;
}

// Obtém a última mensagem adicionada
function getLastMessage() {
    const messages = getMessages();
    return messages.length > 0 ? messages[messages.length - 1] : null;
}

module.exports = {
    getMessages,
    addMessage,
    deleteMessage,
    getLastMessage
};