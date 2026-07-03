// renderer/guiScripts/flowsModules/flowsList.js

export default class FlowsList {
  constructor(manager) {
    this.manager = manager;
  }

  /**
   * Carrega a lista de fluxos do banco e renderiza na tela
   */
  async loadFlowsList() {
    const listContainer = this.manager.flowsList;
    if (!listContainer) return;
    
    listContainer.innerHTML = `<div class="qr-loading active" style="position:static; background:transparent;"><div class="spinner"></div><p>Carregando fluxos...</p></div>`;
    
    try {
      const flows = await window.electronAPI.getFlows();
      listContainer.innerHTML = "";
      
      if (!flows || flows.length === 0) {
        listContainer.innerHTML = `
          <div class="flow-placeholder-card">
            <div class="placeholder-icon">🤖</div>
            <p>Nenhum fluxo criado. Clique em "Novo Fluxo" para começar!</p>
          </div>
        `;
        return;
      }
      
      flows.forEach((flow) => {
        const card = document.createElement("div");
        card.className = "flow-card";
        
        const trigger = flow.definition.trigger || {};
        const typeLabel = {
          exact: "Mensagem é igual a",
          contains: "Mensagem contém",
          starts_with: "Mensagem começa com",
          all: "Qualquer mensagem"
        }[trigger.type || "exact"] || "Gatilho";
        
        const keywordsText = trigger.type === "all" ? "" : `: "${trigger.keywords.join(", ")}"`;
        
        card.innerHTML = `
          <div class="flow-card-info">
            <span class="flow-card-name">${this.manager.escapeHTML(flow.name)}</span>
            <span class="flow-card-trigger">⚡ ${typeLabel}${this.manager.escapeHTML(keywordsText)}</span>
          </div>
          <div class="flow-card-actions">
            <label class="switch">
              <input type="checkbox" class="toggle-status-btn" ${flow.active ? "checked" : ""}>
              <span class="slider round"></span>
            </label>
            <button class="icon-btn edit-btn" title="Editar Fluxo">✏️</button>
            <button class="icon-btn delete delete-btn" title="Excluir Fluxo">🗑️</button>
          </div>
        `;
        
        // Toggle de Ativo/Inativo
        card.querySelector(".toggle-status-btn").addEventListener("change", async (e) => {
          const active = e.target.checked;
          try {
            await window.electronAPI.toggleFlow(flow.id, active);
          } catch (err) {
            alert("Erro ao alternar status do fluxo: " + err.message);
            e.target.checked = !active;
          }
        });
        
        // Editar
        card.querySelector(".edit-btn").addEventListener("click", () => {
          this.manager.builder.openFlowBuilder(flow);
        });
        
        // Deletar
        card.querySelector(".delete-btn").addEventListener("click", async () => {
          const confirmed = await window.customConfirm(`Tem certeza de que deseja deletar o fluxo "${flow.name}"?`);
          if (confirmed) {
            try {
              await window.electronAPI.deleteFlow(flow.id);
              this.loadFlowsList();
            } catch (err) {
              alert("Erro ao deletar fluxo: " + err.message);
            }
          }
        });
        
        listContainer.appendChild(card);
      });
    } catch (error) {
      listContainer.innerHTML = `<p style="color:var(--error); text-align:center; padding:20px;">Erro ao carregar fluxos: ${error.message}</p>`;
    }
  }
}
