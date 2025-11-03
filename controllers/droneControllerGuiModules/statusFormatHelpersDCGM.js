// controllers/droneControllerGuiModules/statusFormatHelpersDCGM.js

class StatusFormatHelpersDCGM {
  constructor() {
    console.log("StatusFormatHelpersDCGM inicializado");
  }

  /**
   * Retorna texto legível para o status
   * @param {string} status - Status do cliente
   * @returns {string} - Texto formatado
   */
  getStatusTexto(status) {
    const textos = {
      pending: "Pendente",
      sent: "Enviado",
      failed: "Falhou",
    };
    return textos[status] || "Desconhecido";
  }

  /**
   * Retorna ícone para o status
   * @param {string} status - Status do cliente
   * @returns {string} - Emoji/ícone
   */
  getStatusIcon(status) {
    const icons = {
      pending: "⏳",
      sent: "✅",
      failed: "❌",
    };
    return icons[status] || "❓";
  }

  /**
   * Retorna classe CSS para o status
   * @param {string} status - Status do cliente
   * @returns {string} - Nome da classe
   */
  getStatusClass(status) {
    const classes = {
      pending: "status-pending",
      sent: "status-sent",
      failed: "status-failed",
    };
    return classes[status] || "status-unknown";
  }
}

module.exports = new StatusFormatHelpersDCGM();
