const client = require('./client/client');
const { initializeApp } = require('./controllers/configController');
const messageHandler = require('./handlers/message');

async function startApp() {
    try {
        const shouldContinue = await initializeApp();
        if (!shouldContinue) return;

        // Configura handlers
        client.on('qr', qr => {
            const qrcode = require('qrcode-terminal');
            qrcode.generate(qr, { small: true });
        });
        
        client.on('ready', () => {
            console.log('Tudo certo! WhatsApp conectado.');
        });
        
        client.on('message', messageHandler);
        
        client.initialize();
    } catch (error) {
        console.error('Erro durante a inicialização:', error);
        process.exit(1);
    }
}

startApp();