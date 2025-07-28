// util/scout.js
const devMode = require('../data/devMode.json');
const { getLastMenuTime } = require('../utils/lastActivity');
const { debug } = require('../services/debugService');

function startScout(client) {
  const isDev = devMode.isDevMode;
  const scoutEnabled = devMode.scoutConfig?.enabled;

  if (!scoutEnabled) {
    debug('[SCOUT] Scout desativado em devMode.json');
    return;
  }

  const interval = isDev ? 10000 : (devMode.scoutConfig.timeSeconds || 60) * 1000;

  client.on('ready', () => {
    debug('[SCOUT] Client pronto, iniciando scout...');

    const chatId = client.info?.wid?._serialized;

    if (!chatId) {
      debug('[SCOUT] Não foi possível obter o ID do bot via client.info');
      return;
    }

    setInterval(async () => {
      try {
        const agora = new Date();
        const horaAtual = agora.toLocaleString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });

        let mensagem = 'oi eu to online';
        
        const lastMenuTime = getLastMenuTime();
        if (lastMenuTime) {
          mensagem += `\n⏰ Último menu enviado: ${lastMenuTime}`;
        } else {
          mensagem += '\n⏰ Nenhum menu enviado ainda nesta sessão';
        }

        await client.sendMessage(chatId, mensagem);
        
        await debug(`[SCOUT] Mensagem enviada para ${chatId} às ${horaAtual}`);
      } catch (err) {
        await debug('[SCOUT] Erro ao enviar mensagem:', err.message);
      }
    }, interval);
  });
}

module.exports = startScout;