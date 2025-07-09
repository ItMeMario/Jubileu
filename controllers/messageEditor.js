const { startMessageEditor } = require('../controllers/messageController');
const { displayWelcome } = require('../utils/displayUtils');

async function setupMessage() {
    try {
        displayWelcome();
        await startMessageEditor();
    } catch (error) {
        console.log('\n❌ Error:', error.message);
    }
}

module.exports = setupMessage;