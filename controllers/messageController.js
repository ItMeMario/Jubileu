const messageService = require('../services/messageService');
const inputHandler = require('../utils/inputHandler');
const { displayMenu, displayRecentMessages } = require('../utils/displayUtils');

async function startMessageEditor() {
    const lastMessages = await messageService.getLastMessages(3);
    await displayRecentMessages(lastMessages);
    await handleMainMenu(lastMessages);
}

async function handleMainMenu(lastMessages) {
    while (true) {
        displayMenu();
        const choice = await inputHandler.askQuestion('Choose an option: ');

        switch (choice) {
            case '1':
                await createNewMessage();
                return;
            case '2':
                await editMessage(lastMessages);
                return;
            case '3':
                await pasteFromClipboard();
                return;
            case '4':
                await viewAllMessages();
                break;
            case '5':
                await checkLastInsertedMessage();
                break;
            case '0':
                console.log('\nOperation completed.');
                return;
            default:
                console.log('\n❌ Invalid option. Please try again.');
        }
    }
}

async function createNewMessage() {
    console.log('\n--- Create New Message ---');
    const message = await inputHandler.getMultiLineInput();
    
    if (message.trim()) {
        const messageId = await messageService.saveMessage(message);
        await messageService.setDefaultMessage(messageId);
        console.log('\n✅ Message saved successfully!');
        console.log(`Message ID: ${messageId}`);
        
        const savedMessage = await messageService.getMessageById(messageId);
        console.log('\nSaved message:');
        console.log(savedMessage.content);
    } else {
        console.log('\n❌ Empty message was not saved.');
    }
}

async function editMessage(messages) {
    if (messages.length === 0) {
        console.log('\n❌ No messages available for editing.');
        return;
    }

    console.log('\n--- Edit Message ---');
    await viewAllMessages();

    const choice = parseInt(await inputHandler.askQuestion(`\nWhich message to edit? (ID): `));
    
    if (isNaN(choice)) {
        console.log('\n❌ Invalid ID.');
        return;
    }

    try {
        const originalMessage = await messageService.getMessageById(choice);
        if (!originalMessage) {
            console.log('\n❌ Message not found.');
            return;
        }

        console.log('\nOriginal message:');
        console.log(originalMessage.content);
        
        const editedMessage = await inputHandler.getMultiLineInput(originalMessage.content);
        if (editedMessage.trim()) {
            await messageService.updateMessage(originalMessage.id, editedMessage);
            console.log('\n✅ Message updated successfully!');
            
            const updatedMessage = await messageService.getMessageById(originalMessage.id);
            console.log('\nUpdated message:');
            console.log(updatedMessage.content);
        } else {
            console.log('\n❌ Empty message was not saved.');
        }
    } catch (error) {
        console.log('\n❌ Error editing message:', error.message);
    }
}

async function pasteFromClipboard() {
    try {
        const content = await messageService.readFromClipboard();
        console.log('\n--- Paste from Clipboard ---');
        console.log('\nClipboard content:\n');
        console.log(content + '\n');

        const confirm = await inputHandler.askQuestion('Use this message? (y/n): ');
        if (confirm.toLowerCase() === 'y') {
            const messageId = await messageService.saveMessage(content);
            await messageService.setDefaultMessage(messageId);
            console.log('\n✅ Message saved successfully!');
            
            const savedMessage = await messageService.getMessageById(messageId);
            console.log('\nSaved message:');
            console.log(savedMessage.content);
        } else {
            console.log('\nOperation canceled.');
        }
    } catch (e) {
        console.log('\n❌ Could not access clipboard:', e.message);
    }
}

async function viewAllMessages() {
    try {
        console.log('\n--- All Messages in Database ---');
        const allMessages = await messageService.getAllMessages();
        
        if (allMessages.length === 0) {
            console.log('\nℹ️ No messages found in database.');
            return;
        }

        allMessages.forEach(msg => {
            console.log(`\nID: ${msg.id} ${msg.is_default ? '⭐' : ''}`);
            console.log(`Date: ${new Date(msg.created_at).toLocaleString()}`);
            console.log(`Content: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
        });

        console.log(`\nTotal messages: ${allMessages.length}`);
    } catch (error) {
        console.log('\n❌ Error retrieving messages:', error.message);
    }
}

async function checkLastInsertedMessage() {
    try {
        console.log('\n--- Last Inserted Message ---');
        const lastMessage = await messageService.getLastMessage();
        
        if (!lastMessage) {
            console.log('\nℹ️ No messages found in database.');
            return;
        }

        console.log(`\nID: ${lastMessage.id}`);
        console.log(`Date: ${new Date(lastMessage.created_at).toLocaleString()}`);
        console.log(`Default: ${lastMessage.is_default ? '✅' : '❌'}`);
        console.log('\nFull content:');
        console.log(lastMessage.content);
    } catch (error) {
        console.log('\n❌ Error checking last message:', error.message);
    }
}

module.exports = {
    startMessageEditor,
    createNewMessage,
    editMessage,
    pasteFromClipboard,
    viewAllMessages,
    checkLastInsertedMessage
};