// renderer/guiScripts/appGuiModules/flowsModules/flowsBuilderCanvas.js
// Canvas visual de blocos/passos do Flow Builder e vinculação de eventos de edição

import { $, $$, escapeHtml } from "../domUtils.js";
import { customConfirm } from "../../utils/confirmModal.js";
import {
  getCurrentEditingFlow,
  getActiveEditingStepId,
  setActiveEditingStepId,
} from "./flowsState.js";
import { updateBuilderSimulator } from "./flowsSimulator.js";
import {
  getAvailableFlowVariables,
  updateAllVariableChips,
  bindChipsClickEvents,
} from "./flowsVariables.js";

/**
 * Renderiza os blocos/passos no Canvas do Flow Builder
 */
export function renderBuilderSteps() {
  const builderStepsContainer = $("#builder-steps-container");
  const currentEditingFlow = getCurrentEditingFlow();
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
  const activeEditingStepId = getActiveEditingStepId();

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
  const currentEditingFlow = getCurrentEditingFlow();
  if (!builderStepsContainer || !currentEditingFlow) return;

  // Selecionar passo para prévia
  $$(".btn-select-step-preview", builderStepsContainer).forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const stepId = e.currentTarget.getAttribute("data-step-id");
      if (stepId) {
        setActiveEditingStepId(stepId);
        renderBuilderSteps();
        updateBuilderSimulator(stepId);
      }
    });
  });

  // Excluir bloco
  $$(".btn-delete-step-card", builderStepsContainer).forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const stepId = e.currentTarget.getAttribute("data-step-id");
      if (stepId) {
        const confirmed = await customConfirm(`Excluir o bloco "${stepId}"?`, "Excluir Bloco", "Excluir", "Cancelar", "btn-danger");
        if (confirmed) {
          delete currentEditingFlow.steps[stepId];
          const remaining = Object.keys(currentEditingFlow.steps);
          const nextActiveId = remaining[0] || null;
          setActiveEditingStepId(nextActiveId);
          renderBuilderSteps();
          updateBuilderSimulator(nextActiveId);
        }
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
        if (getActiveEditingStepId() === stepId) updateBuilderSimulator(stepId);
      });
    }

    // Body
    const bodyInput = $(".step-body-input", card);
    if (bodyInput) {
      bodyInput.addEventListener("input", (e) => {
        step.body = e.target.value;
        if (getActiveEditingStepId() === stepId) updateBuilderSimulator(stepId);
      });
    }

    // Footer
    const footerInput = $(".step-footer-input", card);
    if (footerInput) {
      footerInput.addEventListener("input", (e) => {
        step.footer = e.target.value;
        if (getActiveEditingStepId() === stepId) updateBuilderSimulator(stepId);
      });
    }

    // Button Title (Lista)
    const buttonTitleInput = $(".step-button-title-input", card);
    if (buttonTitleInput) {
      buttonTitleInput.addEventListener("input", (e) => {
        step.buttonTitle = e.target.value;
        if (getActiveEditingStepId() === stepId) updateBuilderSimulator(stepId);
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
          if (getActiveEditingStepId() === stepId) updateBuilderSimulator(stepId);
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
          if (getActiveEditingStepId() === stepId) updateBuilderSimulator(stepId);
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

// Compatibilidade para testes em ambiente Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    renderBuilderSteps,
    bindBuilderStepEvents,
  };
}
