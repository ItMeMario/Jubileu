// utils/lastActivity.js
let lastMenuSentTime = null;

function updateLastMenuTime() {
  const agora = new Date();
  lastMenuSentTime = agora.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function getLastMenuTime() {
  return lastMenuSentTime;
}

module.exports = {
  updateLastMenuTime,
  getLastMenuTime
};