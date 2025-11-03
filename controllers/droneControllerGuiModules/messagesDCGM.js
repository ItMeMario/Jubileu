// controllers/droneControllerGuiModules/messagesDCGM.js
const droneService = require("../../services/droneService");

class MessagesDCGM {
  constructor() {
    console.log("MessagesDCGM inicializado");
  }

  /**
   * Lista todas as mensagens disponíveis
   * @returns {Promise<Object>} - Lista de mensagens formatadas
   */
  async listarMensagens() {
    try {
      console.log("Listando mensagens disponíveis...");
      const mensagens = await droneService.listarMensagensDisponiveis();

      if (!mensagens || mensagens.length === 0) {
        return {
          success: true,
          mensagens: [],
          total: 0,
        };
      }

      // Formata mensagens para a GUI
      const mensagensFormatadas = mensagens.map((mensagem, index) => ({
        indice: index + 1,
        id: mensagem.id,
        locale: mensagem.locale,
        conteudo: mensagem.message_content,
        textoExibicao: `${index + 1}. (${mensagem.locale}) ${
          mensagem.message_content
        }`,
      }));

      return {
        success: true,
        mensagens: mensagensFormatadas,
        total: mensagens.length,
      };
    } catch (error) {
      console.error("Erro ao listar mensagens:", error);
      return {
        success: false,
        error: error.message,
        mensagens: [],
        total: 0,
      };
    }
  }
}

module.exports = new MessagesDCGM();
