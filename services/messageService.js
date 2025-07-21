const fs = require('fs');
const path = require('path');
const { ensureDataDirectory, readJsonFile, saveJsonFile } = require('../utils/initialize');

// Configurações de caminhos
const baseDir = path.join(__dirname, '../data');
const messagesDir = path.join(baseDir, 'messagesTxt');
const storagePath = path.join(baseDir, 'messages.json');

// Verifica e cria diretório messagesTxt se necessário
function ensureMessagesTxtDirectory() {
  if (fs.existsSync(messagesDir) && !fs.lstatSync(messagesDir).isDirectory()) {
    throw new Error(`'${messagesDir}' deve ser um diretório, não um arquivo`);
  }

  if (!fs.existsSync(messagesDir)) {
    fs.mkdirSync(messagesDir, { recursive: true });
  }
}

// Inicializa o armazenamento usando o sistema do initialize
async function initializeStorage() {
  await ensureDataDirectory();
  ensureMessagesTxtDirectory();

  try {
    return await readJsonFile('messages.json', []);
  } catch (error) {
    console.error('Erro ao inicializar storage de mensagens:', error);
    return [];
  }
}

// Funções principais
async function saveIndex(messages) {
  try {
    const success = await saveJsonFile('messages.json', messages);
    if (!success) {
      throw new Error('Falha ao salvar índice');
    }
  } catch (error) {
    console.error('Erro ao salvar índice de mensagens:', error);
    throw error;
  }
}

async function addMessage(rawContent) {
  if (!rawContent || typeof rawContent !== 'string') {
    throw new Error('Conteúdo da mensagem inválido');
  }

  const id = Date.now().toString();
  const filename = `${id}.txt`;
  const filePath = path.join(messagesDir, filename);

  try {
    ensureMessagesTxtDirectory();
    fs.writeFileSync(filePath, rawContent, 'utf8');
    
    const messages = await initializeStorage();
    const newMeta = {
      id,
      filename,
      createdAt: new Date().toISOString(),
      updatedAt: null
    };
    
    messages.push(newMeta);
    await saveIndex(messages);
    
    return newMeta;
  } catch (error) {
    console.error('Erro ao adicionar mensagem:', error);
    throw error;
  }
}

async function getMessages() {
  return await initializeStorage();
}

async function getMessageById(id) {
  if (!id) return null;

  const messages = await getMessages();
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

async function getLatestValidMessage() {
  try {
    const messages = await getMessages();
    
    if (!messages || messages.length === 0) return null;

    // Ordena por data (mais recente primeiro)
    const sortedMessages = [...messages].sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    // Encontra a primeira mensagem com conteúdo válido
    for (const msg of sortedMessages) {
      const messageWithContent = await getMessageById(msg.id);
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

async function getLastMessage() {
  const messages = await getMessages();
  if (messages.length === 0) return null;
  return await getMessageById(messages.at(-1).id);
}

async function updateMessage(id, newContent) {
  if (!id || !newContent) {
    return { success: false, message: 'ID e conteúdo são obrigatórios' };
  }

  try {
    const messages = await getMessages();
    const index = messages.findIndex((msg) => msg.id === id);
    
    if (index === -1) {
      return { success: false, message: 'Mensagem não encontrada' };
    }

    const filePath = path.join(messagesDir, messages[index].filename);
    fs.writeFileSync(filePath, newContent, 'utf8');

    messages[index].updatedAt = new Date().toISOString();
    await saveIndex(messages);

    return { success: true, updatedMessage: await getMessageById(id) };
  } catch (error) {
    console.error(`Erro ao atualizar mensagem ${id}:`, error);
    return { success: false, message: 'Erro ao atualizar mensagem' };
  }
}

async function deleteMessage(id) {
  if (!id) return false;

  try {
    const messages = await getMessages();
    const index = messages.findIndex((msg) => msg.id === id);
    
    if (index === -1) return false;

    const filePath = path.join(messagesDir, messages[index].filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    messages.splice(index, 1);
    await saveIndex(messages);
    
    return true;
  } catch (error) {
    console.error(`Erro ao deletar mensagem ${id}:`, error);
    return false;
  }
}

async function searchMessages(term) {
  if (!term || typeof term !== 'string') return [];

  try {
    const messages = await getMessages();
    const results = [];
    
    for (const meta of messages) {
      const messageWithContent = await getMessageById(meta.id);
      if (messageWithContent && messageWithContent.content.toLowerCase().includes(term.toLowerCase())) {
        results.push(messageWithContent);
      }
    }
    
    return results;
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