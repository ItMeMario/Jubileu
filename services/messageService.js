const fs = require('fs');
const path = require('path');

// Configurações de caminhos
const baseDir = path.join(__dirname, '../data');
const messagesDir = path.join(baseDir, 'messagesTxt');
const storagePath = path.join(baseDir, 'messages.json');

// Verifica e cria diretórios se necessário
function ensureDirectoriesExist() {
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  if (fs.existsSync(messagesDir) && !fs.lstatSync(messagesDir).isDirectory()) {
    throw new Error(`'${messagesDir}' deve ser um diretório, não um arquivo`);
  }

  if (!fs.existsSync(messagesDir)) {
    fs.mkdirSync(messagesDir, { recursive: true });
  }
}

// Inicializa o armazenamento
function initializeStorage() {
  ensureDirectoriesExist();

  if (!fs.existsSync(storagePath)) {
    fs.writeFileSync(storagePath, JSON.stringify([], null, 2));
    return [];
  }

  try {
    const content = fs.readFileSync(storagePath, 'utf-8');
    return content.trim() ? JSON.parse(content) : [];
  } catch (err) {
    console.error('Erro ao analisar o arquivo JSON, recriando:', err);
    fs.writeFileSync(storagePath, JSON.stringify([], null, 2));
    return [];
  }
}

// Funções principais
function saveIndex(messages) {
  try {
    fs.writeFileSync(storagePath, JSON.stringify(messages, null, 2), 'utf8');
  } catch (error) {
    console.error('Erro ao salvar índice de mensagens:', error);
    throw error;
  }
}

function addMessage(rawContent) {
  if (!rawContent || typeof rawContent !== 'string') {
    throw new Error('Conteúdo da mensagem inválido');
  }

  const id = Date.now().toString();
  const filename = `${id}.txt`;
  const filePath = path.join(messagesDir, filename);

  try {
    fs.writeFileSync(filePath, rawContent, 'utf8');
    
    const messages = initializeStorage();
    const newMeta = {
      id,
      filename,
      createdAt: new Date().toISOString(),
      updatedAt: null
    };
    
    messages.push(newMeta);
    saveIndex(messages);
    
    return newMeta;
  } catch (error) {
    console.error('Erro ao adicionar mensagem:', error);
    throw error;
  }
}

function getMessages() {
  return initializeStorage();
}

function getMessageById(id) {
  if (!id) return null;

  const messages = getMessages();
  const meta = messages.find((msg) => msg.id === id);
  if (!meta) return null;

  try {
    const filePath = path.join(messagesDir, meta.filename);
    if (!fs.existsSync(filePath)) return null;

    const content = fs.readFileSync(filePath, 'utf8');
    return { ...meta, content };
  } catch (error) {
    console.error(`Erro ao ler mensagem com ID ${id}:`, error);
    return null;
  }
}

function getLatestValidMessage() {
  try {
    const messages = getMessages();
    
    if (!messages || messages.length === 0) return null;

    // Ordena por data (mais recente primeiro)
    const sortedMessages = [...messages].sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    // Encontra a primeira mensagem com conteúdo válido
    for (const msg of sortedMessages) {
      const messageWithContent = getMessageById(msg.id);
      if (messageWithContent && messageWithContent.content && messageWithContent.content.trim().length > 20) {
        return messageWithContent.content;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao carregar mensagens:', error);
    return null;
  }
}

function getLastMessage() {
  const messages = getMessages();
  if (messages.length === 0) return null;
  return getMessageById(messages.at(-1).id);
}

function updateMessage(id, newContent) {
  if (!id || !newContent) {
    return { success: false, message: 'ID e conteúdo são obrigatórios' };
  }

  try {
    const messages = getMessages();
    const index = messages.findIndex((msg) => msg.id === id);
    
    if (index === -1) {
      return { success: false, message: 'Mensagem não encontrada' };
    }

    const filePath = path.join(messagesDir, messages[index].filename);
    fs.writeFileSync(filePath, newContent, 'utf8');

    messages[index].updatedAt = new Date().toISOString();
    saveIndex(messages);

    return { success: true, updatedMessage: getMessageById(id) };
  } catch (error) {
    console.error(`Erro ao atualizar mensagem ${id}:`, error);
    return { success: false, message: 'Erro ao atualizar mensagem' };
  }
}

function deleteMessage(id) {
  if (!id) return false;

  try {
    const messages = getMessages();
    const index = messages.findIndex((msg) => msg.id === id);
    
    if (index === -1) return false;

    const filePath = path.join(messagesDir, messages[index].filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    messages.splice(index, 1);
    saveIndex(messages);
    
    return true;
  } catch (error) {
    console.error(`Erro ao deletar mensagem ${id}:`, error);
    return false;
  }
}

function searchMessages(term) {
  if (!term || typeof term !== 'string') return [];

  try {
    const messages = getMessages();
    return messages
      .map((meta) => getMessageById(meta.id))
      .filter((entry) => entry && entry.content.toLowerCase().includes(term.toLowerCase()));
  } catch (error) {
    console.error('Erro na busca de mensagens:', error);
    return [];
  }
}

module.exports = {
  addMessage,
  getMessages,
  getMessageById,
  getLatestValidMessage,
  getLastMessage,
  updateMessage,
  deleteMessage,
  searchMessages
};