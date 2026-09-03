// renderer/guiScripts/appGuiModules/flowsModule.js
// Construtor Visual de Fluxos de Atendimento (Flow Builder), nós interativos e gestão do Bot

import { $, $$, escapeHtml } from "./domUtils.js";
import { renderWhatsAppBubble } from "./whatsAppPreviewHelper.js";

let currentEditingFlow = null;
let activeEditingStepId = null;

/**
 * Retorna o fluxo atualmente em edição no Flow Builder
 * @returns {object|null}
 */
export function getCurrentEditingFlow() {
  return currentEditingFlow;
}

/**
 * Retorna o ID do passo atualmente selecionado para prévia
 * @returns {string|null}
 */
export function getActiveEditingStepId() {
  return activeEditingStepId;
}

/**
 * Carrega e renderiza todos os fluxos na visão de lista
 * @param {object} api - Instância da API
 */
export async function loadFlowsList(api) {
  if (!api || typeof api.getAllFlows !== "function") return;

  const flowsGridContainer = $("#flows-grid-container");
  if (!flowsGridContainer) return;

  try {
    const flows = await api.getAllFlows();
    flowsGridContainer.innerHTML = "";

    if (!Array.isArray(flows) || flows.length === 0) {
      flowsGridContainer.innerHTML = `
        <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
          <div style="font-size: 36px; margin-bottom: 12px;">🤖</div>
          <h3>Nenhum fluxo encontrado</h3>
          <p style="color: var(--text-muted); margin-bottom: 20px;">Crie seu primeiro fluxo com botões e menus da Meta!</p>
          <button class="btn btn-primary" id="btn-create-first-flow">➕ Criar Primeiro Fluxo</button>
        </div>
      `;

      $("#btn-create-first-flow")?.addEventListener("click", () => {
        $("#btn-create-new-flow")?.click();
      });
      return;
    }

    flows.forEach((flow) => {
      const stepCount = Object.keys(flow.steps || {}).length;
      const triggers = flow.triggerKeywords || [];
      const card = document.createElement("div");
      card.className = `flow-card ${flow.isActive ? "is-active" : ""}`;

      const triggersHtml = triggers
        .map((kw) => `<span class="trigger-tag">${escapeHtml(kw)}</span>`)
        .join("");

      card.innerHTML = `
        <div class="flow-card-header">
          <div>
            <h3>${escapeHtml(flow.name || "Sem Nome")}</h3>
            <div style="font-size: 12px; color: var(--text-dim);">${stepCount} passos / nós</div>
          </div>
          <span class="status-pill ${flow.isActive ? "status-green" : "status-yellow"}">
            <span class="status-dot"></span> ${flow.isActive ? "ATIVO" : "INATIVO"}
          </span>
        </div>

        <div>
          <div style="font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">PALAVRAS DE DISPARO:</div>
          <div class="flow-triggers-tags">
            ${triggersHtml || '<span style="color: var(--text-dim); font-size: 11px;">Nenhuma</span>'}
          </div>
        </div>

        <div class="flow-card-footer">
          <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer;">
            <input type="radio" name="active_flow_radio" class="radio-set-active" data-id="${escapeHtml(flow.id)}" ${flow.isActive ? "checked" : ""}>
            <span>Ativar no Bot</span>
          </label>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-secondary btn-edit-flow" data-id="${escapeHtml(flow.id)}" style="padding: 6px 10px; font-size: 12px;">✏️ Editar</button>
            <button class="btn btn-secondary btn-duplicate-flow" data-id="${escapeHtml(flow.id)}" style="padding: 6px 10px; font-size: 12px;" title="Duplicar">📋</button>
            <button class="btn btn-danger btn-delete-flow" data-id="${escapeHtml(flow.id)}" style="padding: 6px 10px; font-size: 12px;" title="Excluir">🗑️</button>
          </div>
        </div>
      `;

      flowsGridContainer.appendChild(card);
    });

    // 1. Ativação de Fluxo
    $$(".radio-set-active", flowsGridContainer).forEach((radio) => {
      radio.addEventListener("change", async (e) => {
        const flowId = e.target.getAttribute("data-id");
        if (flowId) {
          await api.setActiveFlow(flowId);
          await loadFlowsList(api);
        }
      });
    });

    // 2. Edição de Fluxo
    $$(".btn-edit-flow", flowsGridContainer).forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const flowId = e.currentTarget.getAttribute("data-id");
        if (flowId) {
          const flow = await api.getFlowById(flowId);
          if (flow) openFlowBuilder(flow);
        }
      });
    });

    // 3. Duplicação de Fluxo
    $$(".btn-duplicate-flow", flowsGridContainer).forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const flowId = e.currentTarget.getAttribute("data-id");
        if (flowId) {
          await api.duplicateFlow(flowId);
          await loadFlowsList(api);
        }
      });
    });

    // 4. Exclusão de Fluxo
    $$(".btn-delete-flow", flowsGridContainer).forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const flowId = e.currentTarget.getAttribute("data-id");
        if (flowId && confirm("Tem certeza que deseja excluir este fluxo?")) {
          await api.deleteFlow(flowId);
          await loadFlowsList(api);
        }
      });
    });
  } catch (error) {
    console.error("Erro ao listar fluxos:", error);
  }
}

/**
 * Abre o Flow Builder para visualização e edição de um fluxo
 * @param {object} flow
 */
export function openFlowBuilder(flow) {
  if (!flow) return;

  currentEditingFlow = JSON.parse(JSON.stringify(flow));
  const flowListView = $("#flow-list-view");
  const flowBuilderView = $("#flow-builder-view");
  const builderFlowName = $("#builder-flow-name");
  const builderTriggerKeywords = $("#builder-trigger-keywords");

  if (flowListView) flowListView.style.display = "none";
  if (flowBuilderView) flowBuilderView.style.display = "block";

  if (builderFlowName) builderFlowName.value = currentEditingFlow.name || "";
  if (builderTriggerKeywords) {
    builderTriggerKeywords.value = (currentEditingFlow.triggerKeywords || []).join(", ");
  }

  const stepKeys = Object.keys(currentEditingFlow.steps || {});
  activeEditingStepId = stepKeys[0] || null;

  renderBuilderSteps();
  updateBuilderSimulator(activeEditingStepId);
}

/**
 * Extrai dinamicamente todas as variáveis declaradas nos blocos do fluxo atual
 * @param {object} flow
 * @returns {Array<string>}
 */
export function getAvailableFlowVariables(flow) {
  const discovered = new Set(["telefone", "link"]);

  if (flow && flow.steps) {
    for (const [stepId, stepData] of Object.entries(flow.steps)) {
      if (stepData.variableName && stepData.variableName.trim()) {
        discovered.add(stepData.variableName.trim().toLowerCase());
      }
      discovered.add(stepId);

      for (const btn of stepData.buttons || []) {
        if (btn.variableName && btn.variableName.trim()) {
          discovered.add(btn.variableName.trim().toLowerCase());
        }
      }

      for (const sec of stepData.sections || []) {
        for (const row of sec.rows || []) {
          if (row.variableName && row.variableName.trim()) {
            discovered.add(row.variableName.trim().toLowerCase());
          }
        }
      }
    }
  }

  return Array.from(discovered);
}

/**
 * Atualiza todos os botões de chips de variáveis no Canvas em tempo real
 */
export function updateAllVariableChips() {
  const availableVars = getAvailableFlowVariables(currentEditingFlow);
  const chipsContainers = $$(".var-chips-container");
  chipsContainers.forEach((container) => {
    container.innerHTML = `
      <span class="var-chips-label">🏷️ Variáveis disponíveis:</span>
      ${availableVars
        .map(
          (v) =>
            `<button type="button" class="btn-var-chip" data-var="{{${escapeHtml(v)}}}">+ {{${escapeHtml(v)}}}</button>`
        )
        .join("")}
      <button type="button" class="btn-var-chip btn-add-custom-var-chip" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6; border-color: rgba(59, 130, 246, 0.3);">+ Outra Variável</button>
    `;

    bindChipsClickEvents(container);
  });
}

/**
 * Vincula cliques nos chips de variáveis de um container
 */
function bindChipsClickEvents(container) {
  $$(".btn-var-chip:not(.btn-add-custom-var-chip)", container).forEach((chip) => {
    chip.addEventListener("click", (e) => {
      const varTag = e.currentTarget.getAttribute("data-var");
      const card = container.closest(".builder-step-card");
      const bodyInput = $(".step-body-input", card);
      const stepId = card?.getAttribute("data-step-id");
      const step = currentEditingFlow?.steps?.[stepId];
      if (bodyInput && varTag && step) {
        const start = bodyInput.selectionStart || bodyInput.value.length;
        const end = bodyInput.selectionEnd || bodyInput.value.length;
        const text = bodyInput.value;
        bodyInput.value = text.substring(0, start) + varTag + text.substring(end);
        step.body = bodyInput.value;
        bodyInput.focus();
        const newPos = start + varTag.length;
        bodyInput.setSelectionRange(newPos, newPos);
        if (activeEditingStepId === stepId) updateBuilderSimulator(stepId);
      }
    });
  });

  const btnAddCustom = $(".btn-add-custom-var-chip", container);
  if (btnAddCustom) {
    btnAddCustom.addEventListener("click", () => {
      const customName = prompt("Digite o nome da variável desejada (ex: estado, pais, plano, produto):");
      if (customName && customName.trim()) {
        const cleanVar = customName.trim().replace(/[{}]/g, "").toLowerCase();
        const varTag = `{{${cleanVar}}}`;
        const card = container.closest(".builder-step-card");
        const bodyInput = $(".step-body-input", card);
        const stepId = card?.getAttribute("data-step-id");
        const step = currentEditingFlow?.steps?.[stepId];
        if (bodyInput && step) {
          const start = bodyInput.selectionStart || bodyInput.value.length;
          const end = bodyInput.selectionEnd || bodyInput.value.length;
          const text = bodyInput.value;
          bodyInput.value = text.substring(0, start) + varTag + text.substring(end);
          step.body = bodyInput.value;
          bodyInput.focus();
          const newPos = start + varTag.length;
          bodyInput.setSelectionRange(newPos, newPos);
          if (activeEditingStepId === stepId) updateBuilderSimulator(stepId);
        }
      }
    });
  }
}

/**
 * Renderiza os blocos/passos no Canvas do Flow Builder
 */
export function renderBuilderSteps() {
  const builderStepsContainer = $("#builder-steps-container");
  if (!builderStepsContainer || !currentEditingFlow) return;

  builderStepsContainer.innerHTML = "";
  const steps = currentEditingFlow.steps || {};
  const stepKeys = Object.keys(steps);

  if (stepKeys.length === 0) {
    builderStepsContainer.innerHTML = `
      <div class="card" style="text-align: center; padding: 30px; color: var(--text-muted);">
        Nenhum passo adicionado. Use o botão abaixo para inserir um bloco.
      </div>
    `;
    return;
  }

  const availableVars = getAvailableFlowVariables(currentEditingFlow);

  stepKeys.forEach((stepId) => {
    const step = steps[stepId];
    const isSelected = stepId === activeEditingStepId;
    const stepCard = document.createElement("div");
    stepCard.className = `builder-step-card ${isSelected ? "active-editing" : ""}`;
    stepCard.setAttribute("data-step-id", stepId);

    let typeBadge = '<span class="step-type-pill">🔘 Botões Rápidos</span>';
    if (step.type === "interactive_list") {
      typeBadge =
        '<span class="step-type-pill" style="color: var(--accent-purple); border-color: rgba(139,92,246,0.3); background: rgba(139,92,246,0.15);">📋 Menu de Lista</span>';
    } else if (step.type === "text") {
      typeBadge =
        '<span class="step-type-pill" style="color: var(--status-green); border-color: rgba(16,185,129,0.3); background: rgba(16,185,129,0.15);">💬 Texto Simples</span>';
    }

    // Monta as opções de destino
    const destinationOptions = [
      '<option value="">-- Encerrar Atendimento --</option>',
      ...stepKeys
        .filter((k) => k !== stepId)
        .map((k) => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`),
    ];

    let contentEditorHtml = "";
    const variableBoxHtml = `
      <div class="step-variable-box">
        <label>💾 Salvar resposta na variável:</label>
        <input type="text" class="form-control step-var-name-input" value="${escapeHtml(step.variableName || "")}" placeholder="Ex: estado, pais, plano, produto" title="Qualquer palavra que você digitar aqui vira uma variável dinâmica (ex: {{estado}}, {{pais}})">
      </div>
    `;

    const varChipsHtml = `
      <div class="var-chips-container">
        <span class="var-chips-label">🏷️ Variáveis disponíveis:</span>
        ${availableVars
          .map(
            (v) =>
              `<button type="button" class="btn-var-chip" data-var="{{${escapeHtml(v)}}}">+ {{${escapeHtml(v)}}}</button>`
          )
          .join("")}
        <button type="button" class="btn-var-chip btn-add-custom-var-chip" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6; border-color: rgba(59, 130, 246, 0.3);">+ Outra Variável</button>
      </div>
    `;

    if (step.type === "interactive_buttons") {
      const buttons = step.buttons || [];
      const buttonsRowsHtml = buttons
        .map(
          (btn, btnIdx) => `
          <div class="step-item-wrapper">
            <div class="step-item-row" data-btn-idx="${btnIdx}">
              <span style="font-size: 12px; color: var(--text-dim); width: 16px;">${btnIdx + 1}.</span>
              <input type="text" class="form-control btn-title-input" value="${escapeHtml(btn.title || "")}" placeholder="Título do Botão (máx 20)" maxlength="20" style="flex: 2;">
              <select class="form-control btn-dest-select" style="flex: 2;">
                ${destinationOptions
                  .map((opt) => opt.replace(`value="${btn.nextStepId}"`, `value="${btn.nextStepId}" selected`))
                  .join("")}
              </select>
              <button type="button" class="btn-toggle-link ${btn.link ? "is-active" : ""}" data-btn-idx="${btnIdx}" title="${btn.link ? "Editar Link/URL anexado" : "Anexar Link/URL opcional"}">🔗 ${btn.link ? "Link Ativo" : "Link"}</button>
              <button class="btn-icon-delete btn-remove-button" data-btn-idx="${btnIdx}" title="Excluir Botão">✕</button>
            </div>
            <div class="step-item-subrow btn-link-subrow" data-btn-idx="${btnIdx}" style="${btn.link ? "display: flex;" : "display: none;"}">
              <span>🔗 Link / URL ({{link}}):</span>
              <input type="text" class="form-control btn-link-input" value="${escapeHtml(btn.link || "")}" placeholder="Ex: https://chat.whatsapp.com/... ou https://seusite.com/checkout" title="Link ou URL vinculado a esta opção">
            </div>
          </div>
        `
        )
        .join("");

      contentEditorHtml = `
        ${variableBoxHtml}
        <div class="form-group" style="margin-bottom: 10px;">
          <label style="font-size: 11px;">Cabeçalho (Opcional):</label>
          <input type="text" class="form-control step-header-input" value="${escapeHtml(step.header || "")}" placeholder="Ex: Atendimento Zwei Chat">
        </div>
        <div class="form-group" style="margin-bottom: 10px;">
          <label style="font-size: 11px;">Mensagem Principal:</label>
          <textarea class="form-control step-body-input" rows="3" placeholder="Digite o texto da mensagem...">${escapeHtml(step.body || "")}</textarea>
          ${varChipsHtml}
        </div>
        <div class="form-group" style="margin-bottom: 12px;">
          <label style="font-size: 11px;">Rodapé (Opcional):</label>
          <input type="text" class="form-control step-footer-input" value="${escapeHtml(step.footer || "")}" placeholder="Ex: Selecione uma opção abaixo:">
        </div>
        <div class="step-items-builder">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-size: 12px; font-weight: 600;">Botões Clicáveis (${buttons.length}/3):</span>
            ${buttons.length < 3 ? '<button class="btn btn-secondary btn-add-button-action" style="padding: 2px 8px; font-size: 11px;">➕ Botão</button>' : ""}
          </div>
          ${buttonsRowsHtml || '<div style="font-size: 11px; color: var(--text-dim);">Nenhum botão. Clique em "+ Botão" acima.</div>'}
        </div>
      `;
    } else if (step.type === "interactive_list") {
      const sections = step.sections || [];
      let rowsHtml = "";

      sections.forEach((sec, sIdx) => {
        (sec.rows || []).forEach((row, rIdx) => {
          rowsHtml += `
            <div class="step-item-wrapper">
              <div class="step-item-row" data-sec-idx="${sIdx}" data-row-idx="${rIdx}">
                <input type="text" class="form-control list-row-title-input" value="${escapeHtml(row.title || "")}" placeholder="Opção (máx 24)" maxlength="24" style="flex: 2;">
                <input type="text" class="form-control list-row-desc-input" value="${escapeHtml(row.description || "")}" placeholder="Descrição (máx 72)" maxlength="72" style="flex: 3;">
                <select class="form-control list-row-dest-select" style="flex: 2;">
                  ${destinationOptions
                    .map((opt) => opt.replace(`value="${row.nextStepId}"`, `value="${row.nextStepId}" selected`))
                    .join("")}
                </select>
                <button type="button" class="btn-toggle-link ${row.link ? "is-active" : ""}" data-sec-idx="${sIdx}" data-row-idx="${rIdx}" title="${row.link ? "Editar Link/URL anexado" : "Anexar Link/URL opcional"}">🔗 ${row.link ? "Link Ativo" : "Link"}</button>
                <button class="btn-icon-delete btn-remove-row" data-sec-idx="${sIdx}" data-row-idx="${rIdx}" title="Excluir Linha">✕</button>
              </div>
              <div class="step-item-subrow list-link-subrow" data-sec-idx="${sIdx}" data-row-idx="${rIdx}" style="${row.link ? "display: flex;" : "display: none;"}">
                <span>🔗 Link / URL ({{link}}):</span>
                <input type="text" class="form-control list-row-link-input" value="${escapeHtml(row.link || "")}" placeholder="Ex: https://chat.whatsapp.com/... ou https://seusite.com/checkout" title="Link ou URL vinculado a esta opção">
              </div>
            </div>
          `;
        });
      });

      contentEditorHtml = `
        ${variableBoxHtml}
        <div class="form-group" style="margin-bottom: 10px;">
          <label style="font-size: 11px;">Mensagem Principal:</label>
          <textarea class="form-control step-body-input" rows="2" placeholder="Digite a orientação do menu...">${escapeHtml(step.body || "")}</textarea>
          ${varChipsHtml}
        </div>
        <div class="form-group" style="margin-bottom: 10px;">
          <label style="font-size: 11px;">Texto do Botão que Abre o Menu (máx 20):</label>
          <input type="text" class="form-control step-button-title-input" value="${escapeHtml(step.buttonTitle || "Ver Opções")}" maxlength="20" placeholder="Ex: Ver Catálogo">
        </div>
        <div class="step-items-builder">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-size: 12px; font-weight: 600;">Opções da Lista:</span>
            <button class="btn btn-secondary btn-add-row-action" style="padding: 2px 8px; font-size: 11px;">➕ Nova Opção</button>
          </div>
          ${rowsHtml || '<div style="font-size: 11px; color: var(--text-dim);">Nenhuma opção. Clique em "+ Nova Opção".</div>'}
        </div>
      `;
    } else if (step.type === "text") {
      contentEditorHtml = `
        ${variableBoxHtml}
        <div class="form-group" style="margin-bottom: 10px;">
          <label style="font-size: 11px;">Mensagem de Texto:</label>
          <textarea class="form-control step-body-input" rows="3" placeholder="Digite a resposta que o bot enviará...">${escapeHtml(step.body || "")}</textarea>
          ${varChipsHtml}
        </div>
        <div class="form-group">
          <label style="font-size: 11px;">Próximo Passo Automático:</label>
          <select class="form-control step-next-dest-select">
            ${destinationOptions
              .map((opt) => opt.replace(`value="${step.nextStepId}"`, `value="${step.nextStepId}" selected`))
              .join("")}
          </select>
        </div>
      `;
    }

    stepCard.innerHTML = `
      <div class="step-card-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span class="step-id-badge"># ${escapeHtml(stepId)}</span>
          ${typeBadge}
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary btn-select-step-preview" data-step-id="${escapeHtml(stepId)}" style="padding: 4px 8px; font-size: 11px;">👁️ Ver no Celular</button>
          ${stepKeys.length > 1 ? `<button class="btn-icon-delete btn-delete-step-card" data-step-id="${escapeHtml(stepId)}" title="Excluir Bloco">🗑️</button>` : ""}
        </div>
      </div>
      ${contentEditorHtml}
    `;

    builderStepsContainer.appendChild(stepCard);
  });

  bindBuilderStepEvents();
}

/**
 * Vincula todos os eventos de edição de campos dentro dos blocos
 */
export function bindBuilderStepEvents() {
  const builderStepsContainer = $("#builder-steps-container");
  if (!builderStepsContainer || !currentEditingFlow) return;

  // Selecionar passo para prévia
  $$(".btn-select-step-preview", builderStepsContainer).forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const stepId = e.currentTarget.getAttribute("data-step-id");
      if (stepId) {
        activeEditingStepId = stepId;
        renderBuilderSteps();
        updateBuilderSimulator(stepId);
      }
    });
  });

  // Excluir bloco
  $$(".btn-delete-step-card", builderStepsContainer).forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const stepId = e.currentTarget.getAttribute("data-step-id");
      if (stepId && confirm(`Excluir o bloco "${stepId}"?`)) {
        delete currentEditingFlow.steps[stepId];
        const remaining = Object.keys(currentEditingFlow.steps);
        activeEditingStepId = remaining[0] || null;
        renderBuilderSteps();
        updateBuilderSimulator(activeEditingStepId);
      }
    });
  });

  // Eventos nos inputs de cada card
  $$(".builder-step-card", builderStepsContainer).forEach((card) => {
    const stepId = card.getAttribute("data-step-id");
    const step = currentEditingFlow.steps?.[stepId];
    if (!step) return;

    // Nome da variável capturada (com atualização em tempo real dos chips de outros blocos)
    const varNameInput = $(".step-var-name-input", card);
    if (varNameInput) {
      varNameInput.addEventListener("input", (e) => {
        step.variableName = e.target.value.trim() || undefined;
        updateAllVariableChips();
      });
    }

    // Inserção rápida de chips de variáveis
    const chipsContainer = $(".var-chips-container", card);
    if (chipsContainer) {
      bindChipsClickEvents(chipsContainer);
    }

    // Header
    const headerInput = $(".step-header-input", card);
    if (headerInput) {
      headerInput.addEventListener("input", (e) => {
        step.header = e.target.value;
        if (activeEditingStepId === stepId) updateBuilderSimulator(stepId);
      });
    }

    // Body
    const bodyInput = $(".step-body-input", card);
    if (bodyInput) {
      bodyInput.addEventListener("input", (e) => {
        step.body = e.target.value;
        if (activeEditingStepId === stepId) updateBuilderSimulator(stepId);
      });
    }

    // Footer
    const footerInput = $(".step-footer-input", card);
    if (footerInput) {
      footerInput.addEventListener("input", (e) => {
        step.footer = e.target.value;
        if (activeEditingStepId === stepId) updateBuilderSimulator(stepId);
      });
    }

    // Button Title (Lista)
    const buttonTitleInput = $(".step-button-title-input", card);
    if (buttonTitleInput) {
      buttonTitleInput.addEventListener("input", (e) => {
        step.buttonTitle = e.target.value;
        if (activeEditingStepId === stepId) updateBuilderSimulator(stepId);
      });
    }

    // Próximo destino (Texto)
    const nextDestSelect = $(".step-next-dest-select", card);
    if (nextDestSelect) {
      nextDestSelect.addEventListener("change", (e) => {
        step.nextStepId = e.target.value || null;
      });
    }

    // Adicionar Botão
    const btnAddButton = $(".btn-add-button-action", card);
    if (btnAddButton) {
      btnAddButton.addEventListener("click", () => {
        if (!step.buttons) step.buttons = [];
        if (step.buttons.length < 3) {
          const nextIdx = step.buttons.length + 1;
          step.buttons.push({
            id: `btn_${stepId}_${nextIdx}`,
            title: `Opção ${nextIdx}`,
            nextStepId: null,
          });
          renderBuilderSteps();
          updateBuilderSimulator(stepId);
        }
      });
    }

    // Título do Botão
    $$(".btn-title-input", card).forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const row = e.target.closest(".step-item-row");
        const idx = parseInt(row?.getAttribute("data-btn-idx"), 10);
        if (step.buttons?.[idx]) {
          step.buttons[idx].title = e.target.value;
          if (activeEditingStepId === stepId) updateBuilderSimulator(stepId);
        }
      });
    });

    // Toggle de visibilidade do campo de Link/URL
    $$(".btn-toggle-link", card).forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const itemWrapper = e.currentTarget.closest(".step-item-wrapper");
        const subrow = $(".step-item-subrow", itemWrapper);
        if (subrow) {
          const isVisible = subrow.style.display === "flex";
          subrow.style.display = isVisible ? "none" : "flex";
          if (!isVisible) {
            const input = $("input", subrow);
            input?.focus();
          }
        }
      });
    });

    // Link do Botão
    $$(".btn-link-input", card).forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const subrow = e.target.closest(".step-item-subrow");
        const wrapper = e.target.closest(".step-item-wrapper");
        const toggleBtn = $(".btn-toggle-link", wrapper);
        const idx = parseInt(subrow?.getAttribute("data-btn-idx"), 10);
        const val = e.target.value.trim();
        if (step.buttons?.[idx]) {
          step.buttons[idx].link = val || undefined;
        }
        if (toggleBtn) {
          if (val) {
            toggleBtn.classList.add("is-active");
            toggleBtn.textContent = "🔗 Link Ativo";
          } else {
            toggleBtn.classList.remove("is-active");
            toggleBtn.textContent = "🔗 Link";
          }
        }
      });
    });

    // Destino do Botão
    $$(".btn-dest-select", card).forEach((sel) => {
      sel.addEventListener("change", (e) => {
        const row = e.target.closest(".step-item-row");
        const idx = parseInt(row?.getAttribute("data-btn-idx"), 10);
        if (step.buttons?.[idx]) {
          step.buttons[idx].nextStepId = e.target.value || null;
        }
      });
    });

    // Remover Botão
    $$(".btn-remove-button", card).forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = parseInt(e.currentTarget.getAttribute("data-btn-idx"), 10);
        if (!isNaN(idx) && step.buttons) {
          step.buttons.splice(idx, 1);
          renderBuilderSteps();
          updateBuilderSimulator(stepId);
        }
      });
    });

    // Adicionar Linha de Lista
    const btnAddRow = $(".btn-add-row-action", card);
    if (btnAddRow) {
      btnAddRow.addEventListener("click", () => {
        if (!step.sections || step.sections.length === 0) {
          step.sections = [{ title: "Opções", rows: [] }];
        }
        const sec = step.sections[0];
        const nextIdx = (sec.rows || []).length + 1;
        sec.rows.push({
          id: `row_${stepId}_${nextIdx}`,
          title: `Item ${nextIdx}`,
          description: "Descrição da opção",
          nextStepId: null,
        });
        renderBuilderSteps();
        updateBuilderSimulator(stepId);
      });
    }

    // Título da Linha
    $$(".list-row-title-input", card).forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const row = e.target.closest(".step-item-row");
        const sIdx = parseInt(row?.getAttribute("data-sec-idx"), 10);
        const rIdx = parseInt(row?.getAttribute("data-row-idx"), 10);
        if (step.sections?.[sIdx]?.rows?.[rIdx]) {
          step.sections[sIdx].rows[rIdx].title = e.target.value;
          if (activeEditingStepId === stepId) updateBuilderSimulator(stepId);
        }
      });
    });

    // Descrição da Linha
    $$(".list-row-desc-input", card).forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const row = e.target.closest(".step-item-row");
        const sIdx = parseInt(row?.getAttribute("data-sec-idx"), 10);
        const rIdx = parseInt(row?.getAttribute("data-row-idx"), 10);
        if (step.sections?.[sIdx]?.rows?.[rIdx]) {
          step.sections[sIdx].rows[rIdx].description = e.target.value;
        }
      });
    });

    // Link da Linha
    $$(".list-row-link-input", card).forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const subrow = e.target.closest(".step-item-subrow");
        const wrapper = e.target.closest(".step-item-wrapper");
        const toggleBtn = $(".btn-toggle-link", wrapper);
        const sIdx = parseInt(subrow?.getAttribute("data-sec-idx"), 10);
        const rIdx = parseInt(subrow?.getAttribute("data-row-idx"), 10);
        const val = e.target.value.trim();
        if (step.sections?.[sIdx]?.rows?.[rIdx]) {
          step.sections[sIdx].rows[rIdx].link = val || undefined;
        }
        if (toggleBtn) {
          if (val) {
            toggleBtn.classList.add("is-active");
            toggleBtn.textContent = "🔗 Link Ativo";
          } else {
            toggleBtn.classList.remove("is-active");
            toggleBtn.textContent = "🔗 Link";
          }
        }
      });
    });

    // Destino da Linha
    $$(".list-row-dest-select", card).forEach((sel) => {
      sel.addEventListener("change", (e) => {
        const row = e.target.closest(".step-item-row");
        const sIdx = parseInt(row?.getAttribute("data-sec-idx"), 10);
        const rIdx = parseInt(row?.getAttribute("data-row-idx"), 10);
        if (step.sections?.[sIdx]?.rows?.[rIdx]) {
          step.sections[sIdx].rows[rIdx].nextStepId = e.target.value || null;
        }
      });
    });

    // Remover Linha
    $$(".btn-remove-row", card).forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const sIdx = parseInt(e.currentTarget.getAttribute("data-sec-idx"), 10);
        const rIdx = parseInt(e.currentTarget.getAttribute("data-row-idx"), 10);
        if (!isNaN(sIdx) && !isNaN(rIdx) && step.sections?.[sIdx]?.rows) {
          step.sections[sIdx].rows.splice(rIdx, 1);
          renderBuilderSteps();
          updateBuilderSimulator(stepId);
        }
      });
    });
  });
}

/**
 * Atualiza o simulador visual de WhatsApp ao vivo para o passo selecionado
 * @param {string|null} stepId
 */
export function updateBuilderSimulator(stepId) {
  const simStepBadge = $("#sim-step-badge");
  const step = currentEditingFlow?.steps?.[stepId];

  if (simStepBadge) {
    simStepBadge.textContent = stepId ? `# ${stepId.toUpperCase()}` : "NENHUM PASSO";
  }

  const elements = {
    headerEl: $("#builder-sim-header"),
    bodyEl: $("#builder-sim-body"),
    footerEl: $("#builder-sim-footer"),
    buttonsEl: $("#builder-sim-buttons"),
  };

  renderWhatsAppBubble({
    elements,
    data: step,
    emptyBodyMessage: "Selecione ou crie um bloco para pré-visualizar.",
  });
}

/**
 * Inicializa todos os botões, listeners e ações da aba de Fluxos e Flow Builder
 * @param {object} api - Instância da API
 */
export function initFlows(api) {
  const btnCreateNewFlow = $("#btn-create-new-flow");
  const btnBackToFlowsList = $("#btn-back-to-flows-list");
  const btnSaveCurrentFlow = $("#btn-save-current-flow");
  const btnToggleAddStep = $("#btn-toggle-add-step");
  const addStepMenu = $("#add-step-menu");
  const toggleBotSwitch = $("#toggle-bot-switch");
  const builderFlowName = $("#builder-flow-name");
  const builderTriggerKeywords = $("#builder-trigger-keywords");

  // 1. Botão Criar Novo Fluxo em Branco
  if (btnCreateNewFlow) {
    btnCreateNewFlow.addEventListener("click", async () => {
      try {
        const newFlow = await api.createEmptyFlow("Novo Fluxo de Atendimento");
        if (newFlow) {
          openFlowBuilder(newFlow);
        }
      } catch (err) {
        alert(`Erro ao criar novo fluxo: ${err.message}`);
      }
    });
  }

  // 2. Botão Voltar para Lista
  if (btnBackToFlowsList) {
    btnBackToFlowsList.addEventListener("click", () => {
      const flowBuilderView = $("#flow-builder-view");
      const flowListView = $("#flow-list-view");
      if (flowBuilderView) flowBuilderView.style.display = "none";
      if (flowListView) flowListView.style.display = "block";
      loadFlowsList(api);
    });
  }

  // 3. Menu de Adição de Novos Passos
  if (btnToggleAddStep && addStepMenu) {
    btnToggleAddStep.addEventListener("click", () => {
      const isHidden = addStepMenu.style.display === "none";
      addStepMenu.style.display = isHidden ? "flex" : "none";
    });
  }

  $$(".add-step-option").forEach((opt) => {
    opt.addEventListener("click", (e) => {
      const type = e.currentTarget.getAttribute("data-type");
      if (addStepMenu) addStepMenu.style.display = "none";
      if (!currentEditingFlow) return;

      const stepCount = Object.keys(currentEditingFlow.steps || {}).length + 1;
      const newStepId = `step_${stepCount}`;

      const newStepData = {
        id: newStepId,
        type: type,
        body: "Nova mensagem de atendimento",
      };

      if (type === "interactive_buttons") {
        newStepData.header = "Atendimento";
        newStepData.footer = "Selecione uma opção:";
        newStepData.buttons = [
          { id: `btn_${newStepId}_1`, title: "Opção 1", nextStepId: null },
          { id: `btn_${newStepId}_2`, title: "Opção 2", nextStepId: null },
        ];
      } else if (type === "interactive_list") {
        newStepData.buttonTitle = "Abrir Opções";
        newStepData.sections = [
          {
            title: "Categoria 1",
            rows: [
              { id: `row_${newStepId}_1`, title: "Serviço A", description: "Descrição do serviço", nextStepId: null },
              { id: `row_${newStepId}_2`, title: "Serviço B", description: "Descrição do serviço", nextStepId: null },
            ],
          },
        ];
      } else if (type === "text") {
        newStepData.nextStepId = null;
      }

      currentEditingFlow.steps[newStepId] = newStepData;
      activeEditingStepId = newStepId;
      renderBuilderSteps();
      updateBuilderSimulator(newStepId);
    });
  });

  // 4. Salvar Fluxo
  if (btnSaveCurrentFlow) {
    btnSaveCurrentFlow.addEventListener("click", async () => {
      if (!currentEditingFlow) return;

      const name = builderFlowName?.value?.trim();
      if (!name) {
        alert("Por favor, dê um nome ao seu fluxo.");
        return;
      }

      const rawKeywords = builderTriggerKeywords?.value || "";
      const keywords = rawKeywords
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter((k) => k.length > 0);

      currentEditingFlow.name = name;
      currentEditingFlow.triggerKeywords = keywords.length > 0 ? keywords : ["oi", "ola", "menu"];

      const stepKeys = Object.keys(currentEditingFlow.steps || {});
      if (stepKeys.length === 0) {
        alert("O fluxo precisa de ao menos 1 passo/bloco de mensagem.");
        return;
      }

      if (!currentEditingFlow.initialStepId || !currentEditingFlow.steps[currentEditingFlow.initialStepId]) {
        currentEditingFlow.initialStepId = stepKeys[0];
      }

      try {
        await api.saveFlow(currentEditingFlow);
        alert("✅ Fluxo salvo com sucesso!");
        btnBackToFlowsList?.click();
      } catch (err) {
        alert(`Erro ao salvar fluxo: ${err.message}`);
      }
    });
  }

  // 5. Toggle Geral do Bot
  if (toggleBotSwitch) {
    toggleBotSwitch.addEventListener("change", async () => {
      const enabled = toggleBotSwitch.checked;
      try {
        await api.toggleBot(enabled);
      } catch (err) {
        console.error("Erro ao alterar status do bot:", err);
      }
    });
  }

  return {
    loadFlowsList: () => loadFlowsList(api),
    openFlowBuilder,
    getCurrentEditingFlow,
    getActiveEditingStepId,
  };
}

// Compatibilidade para testes em ambiente Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    loadFlowsList,
    openFlowBuilder,
    renderBuilderSteps,
    bindBuilderStepEvents,
    updateBuilderSimulator,
    initFlows,
    getCurrentEditingFlow,
    getActiveEditingStepId,
    getAvailableFlowVariables,
    updateAllVariableChips,
  };
}
