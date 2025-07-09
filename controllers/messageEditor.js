const MessageController = require('../controllers/messageController');
const { displayWelcome } = require('../utils/displayUtils');

async function setupMessage() {
    displayWelcome();
    const controller = new MessageController();
    await controller.start();
}

module.exports = setupMessage;
