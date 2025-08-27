const modoDevController = require("../../controllers/modoDevController");

class ModoDevHandlers {
  constructor() {
    console.log("ModoDevHandlers inicializado");
  }

  // Alternar modo Dev/Produção
  async toggleDevMode() {
    try {
      console.log("Alternando modo Dev/Produção...");
      return await modoDevController.toggleDevMode();
    } catch (error) {
      console.error("Erro ao alternar modo Dev:", error);
      return { success: false, error: error.message };
    }
  }

  // Alternar debug
  async toggleDebugMode() {
    try {
      console.log("Alternando modo debug...");
      return await modoDevController.toggleDebugMode();
    } catch (error) {
      console.error("Erro ao alternar debug:", error);
      return { success: false, error: error.message };
    }
  }

  // Configurar tempo do Scout - CORRIGIDO: removido parâmetro event desnecessário
  async setScoutTime(event, timeInput) {
    try {
      console.log("Configurando tempo do Scout:", timeInput);
      // Validação básica antes de enviar para o controller
      if (
        !timeInput ||
        typeof timeInput !== "string" ||
        timeInput.trim() === ""
      ) {
        return { success: false, error: "Tempo é obrigatório" };
      }
      return await modoDevController.setScoutTime(timeInput.trim());
    } catch (error) {
      console.error("Erro ao configurar Scout:", error);
      return { success: false, error: error.message };
    }
  }

  // Obter configuração do Scout
  async getScoutConfig() {
    try {
      console.log("Obtendo configuração do Scout...");
      return await modoDevController.getScoutConfig();
    } catch (error) {
      console.error("Erro ao obter configuração do Scout:", error);
      return { success: false, error: error.message };
    }
  }

  // Obter modo atual
  async getCurrentMode() {
    try {
      console.log("Obtendo modo atual...");
      return await modoDevController.getCurrentMode();
    } catch (error) {
      console.error("Erro ao obter modo atual:", error);
      return { success: false, error: error.message };
    }
  }
  // Alternar modo de grupo (SINGLE/MULTI) - CORRIGIDO: melhor tratamento de erros
  async toggleGroupMode() {
    try {
      console.log("Alternando modo de grupo...");
      const result = await modoDevController.toggleGroupMode();

      // Garantir que sempre retornamos uma estrutura consistente
      if (result && result.success) {
        return {
          success: true,
          data: {
            previousMode: result.data.previousMode,
            currentMode: result.data.currentMode,
            message: result.data.message,
          },
        };
      } else {
        return {
          success: false,
          error: result?.error || "Erro desconhecido ao alternar modo de grupo",
        };
      }
    } catch (error) {
      console.error("Erro ao alternar modo de grupo:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = ModoDevHandlers;
