// util/scout.js
const devMode = require('../data/devMode.json');

function startScout(client) {
  const isDev = devMode.isDevMode;
  const scoutEnabled = devMode.scoutConfig?.enabled;

  if (!scoutEnabled) {
    console.log('[SCOUT] Scout desativado em devMode.json');
    return;
  }

  const interval = isDev ? 10000 : (devMode.scoutConfig.timeSeconds || 60) * 1000;

  client.on('ready', () => {
    console.log('[SCOUT] Client pronto, iniciando scout...');

    const chatId = client.info?.wid?._serialized;

    if (!chatId) {
      console.error('[SCOUT] Não foi possível obter o ID do bot via client.info');
      return;
    }

    setInterval(async () => {
      try {
        await client.sendMessage(chatId, 'oi eu to online');
        console.log(`[SCOUT] Mensagem enviada para ${chatId}`);
      } catch (err) {
        console.error('[SCOUT] Erro ao enviar mensagem:', err.message);
      }
    }, interval);
  });
}

module.exports = startScout;
