// Tipos de mensagens do sistema
const MessageType = {
  // Sistema
  TIMEOUT_WARNING: "timeout_warning",
  TIMEOUT: "timeout",

  // Fluxo
  FAQ: "faq",
  WELCOME: "welcome",
  GROUP_INVITE: "group_invite",
  ALREADY_IN_GROUP: "already_in_group",

  // Erros
  CITY_ERROR: "city_error",
  TIME_ERROR: "time_error",
};

module.exports = MessageType;
