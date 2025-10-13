// renderer/guiScripts/droneModules/droneMessage.js

export default class DroneMessage {
  constructor(manager) {
    this.manager = manager;
  }

  async loadMessages() {
    try {
      const result = await window.droneAPI.listarMensagens();

      if (!result.success) {
        this.manager.utility.showStatus(
          result.error || "Erro ao carregar mensagens",
          "error"
        );
        return;
      }

      if (!result.mensagens || result.mensagens.length === 0) {
        this.manager.messagesList.innerHTML =
          '<div class="empty-state">Nenhuma mensagem disponível</div>';
        return;
      }

      // Armazena as mensagens para uso posterior
      this.manager.allMessages = result.mensagens;
      this.renderMessages(result.mensagens);

      // Atualiza o status total de mensagens
      if (this.manager.statusMessages) {
        this.manager.statusMessages.textContent = result.mensagens.length;
      }
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
      this.manager.utility.showStatus("Erro ao carregar mensagens", "error");
    }
  }

  renderMessages(mensagens) {
    // Renderiza as mensagens apenas para VISUALIZAÇÃO (sem seleção)
    this.manager.messagesList.innerHTML = mensagens
      .map(
        (msg) => `
      <div class="message-item" data-index="${msg.indice}" data-id="${msg.id}">
        <div class="message-header">
          <span class="message-locale">${msg.locale}</span>
          <span class="message-index">#${msg.indice}</span>
        </div>
        <div class="message-content">${this.manager.utility.escapeHtml(
          msg.conteudo
        )}</div>
      </div>
    `
      )
      .join("");

    // NÃO adiciona event listeners - apenas visualização
    // A seleção agora acontece apenas na seção de Disparo
  }
}
