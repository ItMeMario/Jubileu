const messageDB = require('../database/messageDB');
const clipboardy = require('clipboardy');

async function getLastMessages(limit) {
    return await messageDB.getLastMessages(limit);
}

async function saveMessage(content) {
    return await messageDB.saveMessage(content);
}

async function setDefaultMessage(id) {
    return await messageDB.setDefaultMessage(id);
}

async function getMessageById(id) {
    return await messageDB.getMessageById(id);
}

async function updateMessage(id, content) {
    return await messageDB.updateMessage(id, content);
}

async function getAllMessages() {
    return await messageDB.getAllMessages();
}

async function getLastMessage() {
    return await messageDB.getLastMessage();
}

async function readFromClipboard() {
    return clipboardy.readSync();
}

module.exports = {
    getLastMessages,
    saveMessage,
    setDefaultMessage,
    getMessageById,
    updateMessage,
    getAllMessages,
    getLastMessage,
    readFromClipboard
};