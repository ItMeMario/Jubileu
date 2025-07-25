const { Client } = require('whatsapp-web.js');
const startScout = require('../utils/scout')

const client = new Client();

module.exports = client;

startScout(client);
