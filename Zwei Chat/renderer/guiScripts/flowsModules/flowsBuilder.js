// renderer/guiScripts/flowsModules/flowsBuilder.js

export default class FlowsBuilder {
  constructor(manager) {
    this.manager = manager;
  }

  /**
   * Abre o formulário do construtor de blocos
   */
  openFlowBuilder(flow) {
    if (flow) {
      this.manager.currentFlow = JSON.parse(JSON.stringify(flow));
    } else {
      this.manager.currentFlow = {
        name: "",
        definition: {
          trigger: {
            type: "exact",
            keywords: []
          },
          steps: []
        }
      };
    }
    
    this.manager.flowNameInput.value = this.manager.currentFlow.name;
    this.manager.flowListView.classList.remove("active");
    this.manager.flowBuilderView.classList.add("active");
    
    this.renderSteps();
  }

  /**
   * Desenha os blocos sequencialmente na tela
   */
  renderSteps() {
    const container = this.manager.flowStepsContainer;
    if (!container) return;
    container.innerHTML = "";
    
    // 1. Renderiza o Bloco de Gatilho (Fixo no topo)
    const trigger = this.manager.currentFlow.definition.trigger || { type: "exact", keywords: [] };
    const triggerCard = document.createElement("div");
    triggerCard.className = "step-card trigger-block";
    triggerCard.innerHTML = `
      <div class="step-card-header">
        <span class="step-card-title">🔑 GATILHO (Disparador do Fluxo)</span>
      </div>
      <div class="step-card-body">
        <div class="step-row-flex">
          <label class="step-label">
            Regra de Disparo:
            <select id="trigger-type-select" class="step-input">
              <option value="exact" ${trigger.type === "exact" ? "selected" : ""}>Mensagem idêntica a</option>
              <option value="contains" ${trigger.type === "contains" ? "selected" : ""}>Mensagem contém palavra</option>
              <option value="starts_with" ${trigger.type === "starts_with" ? "selected" : ""}>Mensagem começa com</option>
              <option value="all" ${trigger.type === "all" ? "selected" : ""}>Qualquer mensagem recebida</option>
            </select>
          </label>
          
          <label class="step-label" id="trigger-keywords-label" style="display: ${trigger.type === "all" ? "none" : "flex"}">
            Palavras-chave (separadas por vírgula):
            <input type="text" id="trigger-keywords-input" class="step-input" placeholder="ex: oi, ola, bom dia" value="${trigger.keywords ? trigger.keywords.join(", ") : ""}">
          </label>
        </div>
        <p class="step-help-text" id="trigger-help-text">
          O fluxo será iniciado assim que o cliente mandar exatamente uma dessas mensagens de gatilho.
        </p>
      </div>
    `;

    // Ouvintes para o Gatilho
    const selectType = triggerCard.querySelector("#trigger-type-select");
    const inputKeywords = triggerCard.querySelector("#trigger-keywords-input");
    const labelKeywords = triggerCard.querySelector("#trigger-keywords-label");
    const textHelp = triggerCard.querySelector("#trigger-help-text");

    const helpTexts = {
      exact: "O fluxo será iniciado assim que o cliente mandar exatamente uma das palavras cadastradas.",
      contains: "O fluxo iniciará se qualquer palavra da mensagem do cliente coincidir com as cadastradas.",
      starts_with: "O fluxo iniciará se a mensagem do cliente começar com qualquer um dos termos cadastrados.",
      all: "Qualquer mensagem recebida iniciará este fluxo (Cuidado: pode conflitar com outros fluxos)."
    };

    selectType.addEventListener("change", (e) => {
      const val = e.target.value;
      this.manager.currentFlow.definition.trigger.type = val;
      textHelp.textContent = helpTexts[val] || "";
      
      if (val === "all") {
        labelKeywords.style.display = "none";
        this.manager.currentFlow.definition.trigger.keywords = [];
      } else {
        labelKeywords.style.display = "flex";
        const terms = inputKeywords.value.split(",").map(t => t.trim()).filter(Boolean);
        this.manager.currentFlow.definition.trigger.keywords = terms;
      }
    });

    inputKeywords.addEventListener("input", (e) => {
      const terms = e.target.value.split(",").map(t => t.trim()).filter(Boolean);
      this.manager.currentFlow.definition.trigger.keywords = terms;
    });

    container.appendChild(triggerCard);

    // 2. Renderiza os passos dinâmicos subsequentes (Ações)
    const steps = this.manager.currentFlow.definition.steps || [];
    steps.forEach((step, index) => {
      const card = document.createElement("div");
      card.className = `step-card ${step.type}-block`;
      
      let blockTitle = "AÇÃO";
      let blockBody = "";
      
      if (step.type === "send_message") {
        blockTitle = "💬 ENVIAR MENSAGEM SIMPLES";
        blockBody = `
          <label class="step-label">
            Texto da Mensagem:
            <textarea class="step-input action-text-input" placeholder="Digite o texto que o bot irá mandar...">${this.manager.escapeHTML(step.text)}</textarea>
          </label>
          <div class="step-row-flex">
            <label class="step-label">
              Delay para envio (segundos):
              <div class="delay-control">
                <input type="range" class="delay-slider" min="0" max="15" value="${step.delay || 0}">
                <span class="delay-value">${step.delay || 0}s</span>
              </div>
            </label>
          </div>
          <p class="step-desc">Envia uma resposta de texto de volta ao cliente após o delay estipulado.</p>
        `;
      } else if (step.type === "options_menu") {
        blockTitle = "📋 ENVIAR MENU DE OPÇÕES";
        blockBody = `
          <label class="step-label">
            Texto de Introdução / Pergunta:
            <textarea class="step-input action-text-input" placeholder="ex: Escolha uma das opções abaixo:\n1. Suporte\n2. Vendas">${this.manager.escapeHTML(step.text)}</textarea>
          </label>
          
          <div class="options-builder-container">
            <span style="font-size:12px; font-weight:600; display:block; margin-bottom:8px; color:var(--text-main);">Construir Gatilhos de Resposta:</span>
            <div class="options-builder-list">
              <!-- Entradas de opções geradas dinamicamente -->
            </div>
            <button type="button" class="btn-add-option">➕ Adicionar Nova Resposta</button>
          </div>

          <div class="step-row-flex">
            <label class="step-label">
              Mensagem de Erro (Entrada inválida):
              <input type="text" class="step-input action-fallback-input" placeholder="Opção inválida. Escolha novamente." value="${this.manager.escapeHTML(step.fallback)}">
            </label>
            <label class="step-label">
              Delay para envio (segundos):
              <div class="delay-control">
                <input type="range" class="delay-slider" min="0" max="15" value="${step.delay || 0}">
                <span class="delay-value">${step.delay || 0}s</span>
              </div>
            </label>
          </div>
          <p class="step-desc">Apresenta uma pergunta e aguarda a resposta do cliente. Se a resposta casar com um gatilho, executa a ação respectiva.</p>
        `;
      }

      card.innerHTML = `
        <div class="step-card-header">
          <span class="step-card-title">${blockTitle}</span>
          <div class="step-card-actions">
            <button class="icon-btn control-btn move-up" title="Mover para cima" ${index === 0 ? "disabled" : ""}>▲</button>
            <button class="icon-btn control-btn move-down" title="Mover para baixo" ${index === steps.length - 1 ? "disabled" : ""}>▼</button>
            <button class="icon-btn control-btn delete" title="Remover bloco">🗑️</button>
          </div>
        </div>
        <div class="step-card-body">
          ${blockBody}
        </div>
      `;

      // Listeners de Reordenação e Remoção do Bloco
      card.querySelector(".move-up").addEventListener("click", () => this.manager.actions.moveStep(index, -1));
      card.querySelector(".move-down").addEventListener("click", () => this.manager.actions.moveStep(index, 1));
      card.querySelector(".delete").addEventListener("click", () => this.manager.actions.removeStep(index));

      // Listeners do Input de Texto e Delay
      const textInput = card.querySelector(".action-text-input");
      textInput.addEventListener("input", (e) => {
        this.manager.currentFlow.definition.steps[index].text = e.target.value;
      });

      const slider = card.querySelector(".delay-slider");
      const sliderValue = card.querySelector(".delay-value");
      slider.addEventListener("input", (e) => {
        const val = parseInt(e.target.value) || 0;
        sliderValue.textContent = val + "s";
        this.manager.currentFlow.definition.steps[index].delay = val;
      });

      // Se for bloco de opções
      if (step.type === "options_menu") {
        const fallbackInput = card.querySelector(".action-fallback-input");
        fallbackInput.addEventListener("input", (e) => {
          this.manager.currentFlow.definition.steps[index].fallback = e.target.value;
        });

        const optionsListContainer = card.querySelector(".options-builder-list");
        const btnAddOption = card.querySelector(".btn-add-option");
        
        const renderMenuOptions = () => {
          optionsListContainer.innerHTML = "";
          const opts = this.manager.currentFlow.definition.steps[index].options || [];
          
          if (opts.length === 0) {
            optionsListContainer.innerHTML = `<span style="font-size:11px; color:var(--text-dark); text-align:center; display:block;">Nenhuma resposta cadastrada. O menu apenas enviará a pergunta sem aguardar gatilhos.</span>`;
          }

          opts.forEach((opt, optIdx) => {
            const optRow = document.createElement("div");
            optRow.className = "option-builder-row";
            optRow.innerHTML = `
              <input type="text" class="step-input opt-keyword" placeholder="ex: 1" value="${this.manager.escapeHTML(opt.keyword)}">
              <input type="text" class="step-input opt-reply" placeholder="Mensagem de resposta..." value="${this.manager.escapeHTML(opt.reply)}">
              <button type="button" class="btn-remove-option" title="Remover Opção">🗑️</button>
            `;

            // Listener de remoção de opção
            optRow.querySelector(".btn-remove-option").addEventListener("click", () => {
              this.manager.currentFlow.definition.steps[index].options.splice(optIdx, 1);
              renderMenuOptions();
            });

            // Listener de edição da opção
            const optKeyword = optRow.querySelector(".opt-keyword");
            const optReply = optRow.querySelector(".opt-reply");
            
            optKeyword.addEventListener("input", (e) => {
              this.manager.currentFlow.definition.steps[index].options[optIdx].keyword = e.target.value.trim();
            });
            
            optReply.addEventListener("input", (e) => {
              this.manager.currentFlow.definition.steps[index].options[optIdx].reply = e.target.value;
            });
            
            optionsListContainer.appendChild(optRow);
          });
        };
        
        // Clique em Adicionar Opção
        btnAddOption.addEventListener("click", () => {
          if (!this.manager.currentFlow.definition.steps[index].options) {
            this.manager.currentFlow.definition.steps[index].options = [];
          }
          this.manager.currentFlow.definition.steps[index].options.push({ keyword: "", reply: "" });
          renderMenuOptions();
        });
        
        renderMenuOptions();
      }
      
      container.appendChild(card);
    });

    // Placeholder intuitivo se não houver passos
    if (steps.length === 0) {
      const emptyPlaceholder = document.createElement("div");
      emptyPlaceholder.className = "empty-steps-placeholder";
      emptyPlaceholder.innerHTML = `
        <span class="placeholder-emoji">👇</span>
        <p>Nenhuma ação adicionada ainda. Clique no botão de adicionar abaixo para criar respostas simples ou menus de opções para este fluxo!</p>
      `;
      container.appendChild(emptyPlaceholder);
    }
  }
}
