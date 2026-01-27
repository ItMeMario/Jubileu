const messageReader = require("../../utils/messageReader");
const MessageType = require("../../config/messageType");
const { debug } = require("../../services/debugService");
const { MessageMedia } = require("whatsapp-web.js");
const path = require("path");
const fs = require("fs");
const { sendMessageOptions } = require("../../config/compatibility/whatsappCompatibility");

class AudioManagerNHM {
  /**
   * Busca e envia áudio AUDIO_INVITE se existir para o locale atual
   */
  async sendAudioInviteIfExists(client, userNumber) {
    try {
      const currentLocale = messageReader.getConfigLocale();

      // Verificar se existe mensagem AUDIO_INVITE para o locale atual
      const audioExists = await messageReader.messageExists(
        MessageType.AUDIO_INVITE,
        currentLocale
      );

      if (!audioExists) {
        // Não há áudio para este locale, não fazer nada
        return false;
      }

      // Buscar o nome do arquivo de áudio
      const audioFileName = await messageReader.getMessage(
        MessageType.AUDIO_INVITE,
        {},
        currentLocale
      );

      if (!audioFileName || audioFileName.includes("[ERRO:")) {
        return false;
      }

      // Construir o caminho completo do arquivo
      const { DATA_DIR } = require("../../config/initialize");
      const audioPath = path.join(DATA_DIR, "audio", audioFileName);

      // Verificar se o arquivo realmente existe
      if (!fs.existsSync(audioPath)) {
        await debug(`⚠️ Arquivo de áudio não encontrado: ${audioPath}`);
        return false;
      }

      // Criar MessageMedia e enviar o áudio
      const audioMedia = MessageMedia.fromFilePath(audioPath);
      await client.sendMessage(userNumber, audioMedia, sendMessageOptions);

      await debug(`🎵 Áudio enviado: ${audioFileName} para ${userNumber}`);
      return true;
    } catch (error) {
      await debug(`❌ Erro ao enviar áudio AUDIO_INVITE: ${error.message}`);
      return false;
    }
  }
}

module.exports = new AudioManagerNHM();
