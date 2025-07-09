const messageController = require('../controllers/messageEditor');
const { displayWelcome } = require('../utils/displayUtils');


async function setupMessage() {
    try {
        displayWelcome();
        await messageController.startMessageEditor();
    } catch (error) {
        console.log('\n❌ Error:', error.message);
    }
}

module.exports = setupMessage;