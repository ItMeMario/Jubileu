const messageService = require("../services/messageService");

// Importar todos os módulos
const {
  handleListMessagesGUI,
} = require("./messageControllerGuiModules/listMessagesMCGM");
const {
  handleAddMessageGUI,
} = require("./messageControllerGuiModules/addMessageMCGM");
const {
  handleEditMessageGUI,
} = require("./messageControllerGuiModules/editMessageMCGM");
const {
  handleDeleteMessageGUI,
} = require("./messageControllerGuiModules/deleteMessageMCGM");
const {
  handleShowLastMessageGUI,
} = require("./messageControllerGuiModules/showLastMessageMCGM");
const {
  getAvailableOptionsGUI,
} = require("./messageControllerGuiModules/availableOptionsMCGM");
const {
  handleCheckMessageCompletenessGUI,
} = require("./messageControllerGuiModules/checkCompletenessMCGM");

// ============================================
// EXPORTAÇÕES
// ============================================

module.exports = {
  // Funções dos módulos
  handleListMessagesGUI,
  handleAddMessageGUI,
  handleEditMessageGUI,
  handleDeleteMessageGUI,
  handleShowLastMessageGUI,
  getAvailableOptionsGUI,
  handleCheckMessageCompletenessGUI,

  // Re-exportar funções de áudio direto do messageService
  handleAddMessageWithAudioGUI: messageService.addMessageWithAudio,
  handleEditMessageWithAudioGUI: messageService.updateMessageWithAudio,
  getExistingAudioFilesGUI: messageService.getExistingAudioFiles,
  isValidAudioFormat: messageService.isValidAudioFormat,
  handleAudioFileUpload: messageService.handleAudioFileUpload,
};
