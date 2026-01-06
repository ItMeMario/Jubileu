//system messages types

const MessageType = {
  // Sistema

  TIMEOUT: "timeout",
  SUSPEND: "suspend",
  SUSPENDED: "suspended",
  REMINDER: "reminder",
  DRONE: "drone",

  // Fluxo
  SEND_FAQ: "send_faq",
  WELCOME: "welcome",
  GROUP_MULTI_INVITE: "group_MULTI_invite",
  ALREADY_IN_GROUP: "already_in_group",
  TIME_MENU: "time_menu",
  CITY_MENU: "city_menu",
  NAME_MENU: "name_menu",
  AUDIO_INVITE: "audio_invite",
  SOCIAL_LINK: "social_link",

  // Erros
  CITY_ERROR: "city_error",
  TIME_ERROR: "time_error",
  GROUP_ERROR: "group_error",

  // Unsuported types

  UNSUPORTED_AUDIO: "unsuported_audio",
  UNSUPORTED_VIDEO: "unsuported_video",
  UNSUPORTED_DOCUMENT: "unsuported_document",
  UNSUPORTED_STICKER: "unsuported_sticker",
  UNSUPORTED_EMOJI: "unsported_emoji",
};

module.exports = MessageType;
