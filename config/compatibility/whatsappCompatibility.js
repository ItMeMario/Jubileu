/**
 * config/compatibility/whatsappCompatibility.js
 *
 * Arquivo de configuração para compatibilidade com versões do WhatsApp Web e whatsapp-web.js.
 * Centraliza opções para contornar bugs conhecidos ou diferenças de versão.
 */

const options = {
  // Desativa o 'marcar como lido' automatico para evitar o erro "Cannot read properties of undefined (reading 'markedUnread')"
  // Bug observado em versões recentes do WhatsApp Web com a lib atual.
  sendSeen: false,
};

module.exports = {
  sendMessageOptions: options,
};
