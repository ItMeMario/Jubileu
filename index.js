const client = require('./client');
const qrcode = require('qrcode-terminal');
const messageHandler = require('./handlers/message');
const setupMessage = require('./controllers/messageEditor');
const readline = require('readline');

async function initializeApp() {
    // Verifica se deve entrar no modo de configuração de mensagem
    if (process.argv.includes('--setup-message')) {
        await setupMessage();
        process.exit(0);
    }

    // Pergunta antes de gerar o QR Code
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const answer = await new Promise(resolve => {
        rl.question('Pressione Enter para continuar ou digite "config" para configurar a mensagem: ', resolve);
    });

    if (answer.toLowerCase() === 'config') {
        await setupMessage();
        console.log('Reinicialize o bot para aplicar as mudanças.');
        rl.close();
        process.exit(0);
    }
    rl.close();

    // Configuração normal do cliente WhatsApp
    client.on('qr', qr => qrcode.generate(qr, { small: true }));
    client.on('ready', () => {
        console.log('Tudo certo! WhatsApp conectado.');
    });
    client.on('message', messageHandler);

    client.initialize();
}

// Inicializa a aplicação
initializeApp().catch(err => {
    console.error('Erro durante a inicialização:', err);
    process.exit(1);
});