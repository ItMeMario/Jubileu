// menuMessage.js (novo papel: roteador)
const groupService = require("../services/groupService");

const singleMenu = require("./menuSingle");
const multiMenu = require("./menuMulti");

function enviarMensagemMenu(client, msg, chat) {
  const currentMode = groupService.getCurrentMode();

  if (currentMode === "MULTI") {
    return multiMenu.enviarMensagemMenu(client, msg, chat);
  } else {
    return singleMenu.enviarMensagemMenu(client, msg, chat);
  }
}

module.exports = {
  enviarMensagemMenu,
  enviarMenuHorarios: singleMenu.enviarMenuHorarios, // Compartilhada
  chatContext: require("./menuSingle").chatContext // Centraliza para manter compatibilidade
};
