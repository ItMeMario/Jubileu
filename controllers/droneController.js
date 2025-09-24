// controllers/droneController.js
const droneService = require("../services/droneService");

async function listarMensagens() {
  try {
    const mensagens = await droneService.listarMensagensDisponiveis();

    if (!mensagens || mensagens.length === 0) {
      return ["Nenhuma mensagem disponível."];
    }

    // monta as mensagens já formatadas para a view
    return mensagens.map(
      (mensagem, index) =>
        `${index + 1}. (${mensagem.locale}) ${mensagem.message_content}`
    );
  } catch (error) {
    console.error("Erro no controller de mensagens:", error);
    return ["Erro ao carregar mensagens."];
  }
}

module.exports = {
  listarMensagens,
};
