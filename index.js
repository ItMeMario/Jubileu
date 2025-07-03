const client = require('./client');
const qrcode = require('qrcode-terminal');
const messageHandler = require('./handlers/message');

client.on('qr', qr => qrcode.generate(qr, { small: true }));
client.on('ready', () => console.log('Tudo certo! WhatsApp conectado.'));
client.on('message', messageHandler);

client.initialize();
