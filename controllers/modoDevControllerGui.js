const modoDevService = require("../services/modoDevService");
const groupService = require("../services/groupService");

async function toggleDevMode() {
  try {
    return await modoDevService.toggleDevMode();
  } catch (error) {
    console.error("Erro ao alternar modo Dev:", error);
    return { success: false, error: error.message };
  }
}

async function toggleDebugMode() {
  try {
    return await modoDevService.toggleDebugMode();
  } catch (error) {
    console.error("Erro ao alternar modo debug:", error);
    return { success: false, error: error.message };
  }
}

async function setScoutTime(timeInput) {
  try {
    if (!timeInput || timeInput.trim() === "") {
      return { success: false, error: "Tempo ÃƒÂ© obrigatÃƒÂ³rio" };
    }
    return await modoDevService.setScoutTime(timeInput);
  } catch (error) {
    console.error("Erro ao configurar Scout:", error);
    return { success: false, error: error.message };
  }
}

async function getScoutConfig() {
  try {
    const config = await modoDevService.getScoutConfig();
    return { success: true, data: config };
  } catch (error) {
    console.error("Erro ao obter configuraÃƒÂ§ÃƒÂ£o do Scout:", error);
    return { success: false, error: error.message };
  }
}

async function getCurrentMode() {
  try {
    const mode = await modoDevService.getCurrentMode();
    const groupMode = groupService.getCurrentMode();

    return {
      success: true,
      data: {
        ...mode,
        groupMode: groupMode,
      },
    };
  } catch (error) {
    console.error("Erro ao obter modo atual:", error);
    return { success: false, error: error.message };
  }
}

async function toggleGroupMode() {
  try {
    const currentMode = groupService.getCurrentMode();
    const newMode = currentMode === "SINGLE" ? "MULTI" : "SINGLE";

    await groupService.setMode(newMode);

    // Se mudou para SINGLE e nÃƒÂ£o hÃƒÂ¡ grupo primÃƒÂ¡rio, definir o primeiro como primÃƒÂ¡rio
    if (newMode === "SINGLE") {
      const groups = await groupService.getAllGroups();
      if (groups.length > 0 && !groups.some((g) => g.isPrimary)) {
        await groupService.setPrimaryGroup(groups[0].id);
      }
    }

    return {
      success: true,
      data: {
        previousMode: currentMode,
        currentMode: newMode,
        message: `Modo alterado para ${newMode}`,
      },
    };
  } catch (error) {
    console.error("Erro ao alternar modo de grupo:", error);
    return { success: false, error: error.message };
  }
}

async function getCurrentLocale() {
  try {
    const locale = await modoDevService.getCurrentLocale();
    return { success: true, data: locale };
  } catch (error) {
    console.error("Erro ao obter locale atual:", error);
    return { success: false, error: error.message };
  }
}

async function getAvailableLocales() {
  try {
    const locales = modoDevService.getAvailableLocales();
    return { success: true, data: locales };
  } catch (error) {
    console.error("Erro ao obter locales disponÃ­veis:", error);
    return { success: false, error: error.message };
  }
}

async function setLocale(selectedIndex) {
  try {
    if (!selectedIndex || selectedIndex.trim() === "") {
      return { success: false, error: "SeleÃ§Ã£o Ã© obrigatÃ³ria" };
    }
    return await modoDevService.setLocale(selectedIndex);
  } catch (error) {
    console.error("Erro ao alterar locale:", error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  toggleDevMode,
  toggleDebugMode,
  setScoutTime,
  getScoutConfig,
  getCurrentMode,
  toggleGroupMode,
  getCurrentLocale,
  getAvailableLocales,
  setLocale,
};
