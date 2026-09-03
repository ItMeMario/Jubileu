// renderer/guiScripts/appGuiModules/flowsModules/flowsList.js
// Gestão da lista de fluxos (Visão 1), cartões interativos, ativação, duplicação e exclusão

import { $, $$, escapeHtml } from "../domUtils.js";
import { customConfirm } from "../../utils/confirmModal.js";
import { openFlowBuilder } from "./flowsActions.js";

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
        if (flowId) {
          const confirmed = await customConfirm("Tem certeza que deseja excluir este fluxo?", "Excluir Fluxo", "Excluir", "Cancelar", "btn-danger");
          if (confirmed) {
            await api.deleteFlow(flowId);
            await loadFlowsList(api);
          }
        }
      });
    });
  } catch (error) {
    console.error("Erro ao listar fluxos:", error);
  }
}

// Compatibilidade para testes em ambiente Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    loadFlowsList,
  };
}
