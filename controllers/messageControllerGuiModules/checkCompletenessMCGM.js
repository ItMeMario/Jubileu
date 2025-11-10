const messageService = require("../../services/messageService");

async function handleCheckMessageCompletenessGUI(specificLocale = null) {
  try {
    const report = await messageService.checkMessageCompleteness();

    // Melhorar validação do specificLocale
    if (specificLocale && typeof specificLocale === "string") {
      const cleanLocale = specificLocale.trim();

      if (!cleanLocale) {
        return {
          success: false,
          error: "Locale não pode estar vazio",
        };
      }

      if (!report.byLocale[cleanLocale]) {
        return {
          success: false,
          error: `Locale '${cleanLocale}' não encontrado. Locales disponíveis: ${Object.keys(
            report.byLocale
          ).join(", ")}`,
        };
      }

      return {
        success: true,
        data: {
          locale: cleanLocale,
          stats: report.byLocale[cleanLocale],
          messageTypes: messageService.getAvailableMessageTypes(),
        },
      };
    }

    // Retorna relatório completo se specificLocale for null/undefined
    return {
      success: true,
      data: {
        summary: report.summary,
        byLocale: report.byLocale,
        missing: report.missing,
        locales: messageService.getAvailableLocales(),
        messageTypes: messageService.getAvailableMessageTypes(),
      },
    };
  } catch (error) {
    console.error("Erro ao verificar completude das mensagens:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  handleCheckMessageCompletenessGUI,
};
