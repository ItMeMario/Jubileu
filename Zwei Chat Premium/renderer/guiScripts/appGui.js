// renderer/guiScripts/appGui.js
// Controlador de Interface Gráfica (Frontend) do Zwei Chat Premium

document.addEventListener("DOMContentLoaded", async () => {
  console.log("⚡ Inicializando interface do Zwei Chat Premium...");

  const api = window.zweiPremiumApi;
  if (!api) {
    console.error("❌ API do Zwei Chat Premium não está disponível no contexto global.");
    return;
  }

  // ==========================================
  // ELEMENTOS DO DOM
  // ==========================================

  // Navegação por Abas
  const navItems = document.querySelectorAll(".nav-item");
  const tabPanes = document.querySelectorAll(".tab-pane");

  // Dashboard
  const dashConnStatus = document.getElementById("dash-conn-status");
  const dashPhoneNumber = document.getElementById("dash-phone-number");
  const dashQualityRating = document.getElementById("dash-quality-rating");
  const dashLimitTier = document.getElementById("dash-limit-tier");
  const dashVerifiedName = document.getElementById("dash-verified-name");
  const btnRefreshHealth = document.getElementById("btn-refresh-health");

  // Templates & Simulador da Aba Templates
  const btnSyncTemplates = document.getElementById("btn-sync-templates-action");
  const templateSelect = document.getElementById("template-select");
  const templateMetaInfo = document.getElementById("template-meta-info");
  const tmplBadgeStatus = document.getElementById("tmpl-badge-status");
  const tmplBadgeCat = document.getElementById("tmpl-badge-cat");
  const tmplBadgeLang = document.getElementById("tmpl-badge-lang");
  const templateVariablesInputs = document.getElementById("template-variables-inputs");
  const simBubbleHeader = document.getElementById("sim-bubble-header");
  const simBubbleBody = document.getElementById("sim-bubble-body");
  const simBubbleFooter = document.getElementById("sim-bubble-footer");
  const simBubbleButtons = document.getElementById("sim-bubble-buttons");

  // Disparador Oficial (Broadcast)
  const broadcastTemplateSelect = document.getElementById("broadcast-template-select");
  const broadcastRecipientsInput = document.getElementById("broadcast-recipients-input");
  const btnStartBroadcast = document.getElementById("btn-start-broadcast");
  const btnPauseBroadcast = document.getElementById("btn-pause-broadcast");
  const btnResumeBroadcast = document.getElementById("btn-resume-broadcast");
  const btnStopBroadcast = document.getElementById("btn-stop-broadcast");
  const broadcastProgressPanel = document.getElementById("broadcast-progress-panel");
  const broadcastProgressBar = document.getElementById("broadcast-progress-bar");
  const broadcastPercentLabel = document.getElementById("broadcast-percent-label");
  const broadcastStatusLabel = document.getElementById("broadcast-status-label");
  const bcTotal = document.getElementById("bc-total");
  const bcSent = document.getElementById("bc-sent");
  const bcFailed = document.getElementById("bc-failed");
  const broadcastHistoryTbody = document.getElementById("broadcast-history-tbody");

  // Fluxos & Flow Builder
  const toggleBotSwitch = document.getElementById("toggle-bot-switch");
  const flowListView = document.getElementById("flow-list-view");
  const flowBuilderView = document.getElementById("flow-builder-view");
  const flowsGridContainer = document.getElementById("flows-grid-container");
  const btnCreateNewFlow = document.getElementById("btn-create-new-flow");
  const btnBackToFlowsList = document.getElementById("btn-back-to-flows-list");
  const builderFlowName = document.getElementById("builder-flow-name");
  const builderTriggerKeywords = document.getElementById("builder-trigger-keywords");
  const btnSaveCurrentFlow = document.getElementById("btn-save-current-flow");
  const builderStepsContainer = document.getElementById("builder-steps-container");
  const btnToggleAddStep = document.getElementById("btn-toggle-add-step");
  const addStepMenu = document.getElementById("add-step-menu");
  const builderSimHeader = document.getElementById("builder-sim-header");
  const builderSimBody = document.getElementById("builder-sim-body");
  const builderSimFooter = document.getElementById("builder-sim-footer");
  const builderSimButtons = document.getElementById("builder-sim-buttons");
  const simStepBadge = document.getElementById("sim-step-badge");

  // Configurações da Meta
  const formMetaConfig = document.getElementById("form-meta-config");
  const cfgPhoneId = document.getElementById("cfg-phone-id");
  const cfgWabaId = document.getElementById("cfg-waba-id");
  const cfgAccessToken = document.getElementById("cfg-access-token");
  const cfgAppSecret = document.getElementById("cfg-app-secret");
  const cfgVerifyToken = document.getElementById("cfg-verify-token");
  const btnTestMetaConfig = document.getElementById("btn-test-meta-config");

  let loadedTemplates = [];
  let currentEditingFlow = null;
  let activeEditingStepId = null;

  // ==========================================
  // 1. GERENCIAMENTO DE NAVEGAÇÃO ENTRE ABAS
  // ==========================================
  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const targetTabId = item.getAttribute("data-tab");

      navItems.forEach((n) => n.classList.remove("active"));
      tabPanes.forEach((p) => p.classList.remove("active"));

      item.classList.add("active");
      const targetPane = document.getElementById(targetTabId);
      if (targetPane) targetPane.classList.add("active");
    });
  });

  // Ações Rápidas no Dashboard
  document.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const action = e.currentTarget.getAttribute("data-action");
      if (action === "sync-templates") {
        document.querySelector('.nav-item[data-tab="tab-templates"]')?.click();
        btnSyncTemplates?.click();
      } else if (action === "new-broadcast") {
        document.querySelector('.nav-item[data-tab="tab-broadcast"]')?.click();
      } else if (action === "edit-flows") {
        document.querySelector('.nav-item[data-tab="tab-flows"]')?.click();
      }
    });
  });

  // ==========================================
  // 2. MONITORAMENTO DE SAÚDE DA CONTA
  // ==========================================
  async function refreshAccountHealth() {
    try {
      dashConnStatus.textContent = "Verificando...";
      const health = await api.getAccountHealth();

      if (health.success && health.data) {
        dashConnStatus.textContent = "Conectado";
        dashConnStatus.className = "metric-value status-green";

        dashPhoneNumber.textContent = health.data.displayPhoneNumber || "-";
        dashVerifiedName.textContent = health.data.verifiedName || "-";
        dashQualityRating.textContent = health.data.qualityRating || "GREEN";
        dashLimitTier.textContent = health.data.messagingLimitTier || "TIER_1K";

        if (health.data.qualityRating === "GREEN") {
          dashQualityRating.className = "metric-value status-green";
        } else if (health.data.qualityRating === "YELLOW") {
          dashQualityRating.className = "metric-value status-yellow";
        } else {
          dashQualityRating.className = "metric-value status-red";
        }
      } else {
        dashConnStatus.textContent = "Desconectado";
        dashConnStatus.className = "metric-value status-red";
      }
    } catch (error) {
      console.error("Erro ao verificar saúde da conta:", error);
      dashConnStatus.textContent = "Erro";
      dashConnStatus.className = "metric-value status-red";
    }
  }

  if (btnRefreshHealth) {
    btnRefreshHealth.addEventListener("click", refreshAccountHealth);
  }

  // ==========================================
  // 3. GESTÃO DE TEMPLATES & SIMULADOR
  // ==========================================
  async function loadTemplatesList() {
    try {
      loadedTemplates = await api.getTemplates();
      templateSelect.innerHTML = '<option value="">Selecione um template aprovado...</option>';
      broadcastTemplateSelect.innerHTML = '<option value="">Selecione um template aprovado...</option>';

      if (!loadedTemplates || loadedTemplates.length === 0) {
        templateMetaInfo.style.display = "none";
        return;
      }

      loadedTemplates.forEach((t) => {
        const opt = document.createElement("option");
        opt.value = t.name;
        opt.textContent = `[${t.status}] ${t.name} (${t.language})`;
        templateSelect.appendChild(opt);

        if (t.status === "APPROVED") {
          const bOpt = document.createElement("option");
          bOpt.value = t.name;
          bOpt.textContent = `${t.name} (${t.category})`;
          broadcastTemplateSelect.appendChild(bOpt);
        }
      });
    } catch (error) {
      console.error("Erro ao carregar templates:", error);
    }
  }

  if (btnSyncTemplates) {
    btnSyncTemplates.addEventListener("click", async () => {
      btnSyncTemplates.disabled = true;
      btnSyncTemplates.textContent = "Sincronizando...";

      try {
        const res = await api.syncTemplates();
        if (res.success) {
          alert(`✅ Sincronização concluída! ${res.count} templates encontrados.`);
          await loadTemplatesList();
        } else {
          alert(`⚠️ Falha ao sincronizar: ${res.error}`);
        }
      } catch (err) {
        alert(`❌ Erro: ${err.message}`);
      } finally {
        btnSyncTemplates.disabled = false;
        btnSyncTemplates.textContent = "🔄 Sincronizar da Meta";
      }
    });
  }

  if (templateSelect) {
    templateSelect.addEventListener("change", () => {
      const selectedName = templateSelect.value;
      const tmpl = loadedTemplates.find((t) => t.name === selectedName);

      if (!tmpl) {
        templateMetaInfo.style.display = "none";
        renderTemplateSimulator(null);
        return;
      }

      templateMetaInfo.style.display = "flex";
      tmplBadgeStatus.textContent = tmpl.status;
      tmplBadgeStatus.className = `status-pill ${tmpl.status === "APPROVED" ? "status-green" : "status-yellow"}`;
      tmplBadgeCat.textContent = tmpl.category;
      tmplBadgeLang.textContent = tmpl.language;

      generateVariableInputs(tmpl);
      renderTemplateSimulator(tmpl);
    });
  }

  function generateVariableInputs(tmpl) {
    templateVariablesInputs.innerHTML = "";
    const bodyComp = (tmpl.components || []).find((c) => c.type === "BODY");
    if (!bodyComp || !bodyComp.text) return;

    const matches = bodyComp.text.match(/\{\{(\d+)\}\}/g) || [];
    const uniqueVars = [...new Set(matches)];

    if (uniqueVars.length > 0) {
      const title = document.createElement("div");
      title.style.fontSize = "12px";
      title.style.fontWeight = "600";
      title.style.color = "var(--text-muted)";
      title.style.marginBottom = "8px";
      title.textContent = "Variáveis Dinâmicas do Template:";
      templateVariablesInputs.appendChild(title);

      uniqueVars.forEach((v) => {
        const varNum = v.replace(/[{}]/g, "");
        const group = document.createElement("div");
        group.className = "form-group";
        group.style.marginBottom = "10px";

        group.innerHTML = `
          <label style="font-size: 11px;">Variável {{${varNum}}}:</label>
          <input type="text" class="form-control tmpl-var-input" data-var="${varNum}" placeholder="Ex: João Silva">
        `;
        templateVariablesInputs.appendChild(group);
      });

      templateVariablesInputs.querySelectorAll(".tmpl-var-input").forEach((inp) => {
        inp.addEventListener("input", () => renderTemplateSimulator(tmpl));
      });
    }
  }

  function renderTemplateSimulator(tmpl) {
    if (!tmpl) {
      simBubbleHeader.style.display = "none";
      simBubbleBody.textContent = "Selecione um template para visualizar o conteúdo.";
      simBubbleFooter.style.display = "none";
      simBubbleButtons.innerHTML = "";
      return;
    }

    const varInputs = templateVariablesInputs.querySelectorAll(".tmpl-var-input");
    const values = {};
    varInputs.forEach((inp) => {
      values[inp.getAttribute("data-var")] = inp.value;
    });

    const comps = tmpl.components || [];
    const header = comps.find((c) => c.type === "HEADER");
    const body = comps.find((c) => c.type === "BODY");
    const footer = comps.find((c) => c.type === "FOOTER");
    const buttonsComp = comps.find((c) => c.type === "BUTTONS");

    if (header && header.text) {
      simBubbleHeader.style.display = "block";
      simBubbleHeader.textContent = header.text;
    } else {
      simBubbleHeader.style.display = "none";
    }

    if (body && body.text) {
      let rendered = body.text;
      for (const [k, v] of Object.entries(values)) {
        rendered = rendered.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v || `{{${k}}}`);
      }
      simBubbleBody.textContent = rendered;
    } else {
      simBubbleBody.textContent = "";
    }

    if (footer && footer.text) {
      simBubbleFooter.style.display = "block";
      simBubbleFooter.textContent = footer.text;
    } else {
      simBubbleFooter.style.display = "none";
    }

    simBubbleButtons.innerHTML = "";
    if (buttonsComp && buttonsComp.buttons) {
      buttonsComp.buttons.forEach((b) => {
        const btnDiv = document.createElement("div");
        btnDiv.className = "wa-btn";
        btnDiv.textContent = b.text || "Botão";
        simBubbleButtons.appendChild(btnDiv);
      });
    }
  }

  // ==========================================
  // 4. DISPARADOR OFICIAL EM LOTE (BROADCAST)
  // ==========================================
  async function loadBroadcastHistory() {
    try {
      const history = await api.getCampaignHistory();
      broadcastHistoryTbody.innerHTML = "";

      if (!history || history.length === 0) {
        broadcastHistoryTbody.innerHTML =
          '<tr><td colspan="7" style="text-align: center; color: var(--text-dim);">Nenhuma campanha executada ainda.</td></tr>';
        return;
      }

      history.forEach((camp) => {
        const tr = document.createElement("tr");
        const dateStr = new Date(camp.startedAt).toLocaleString("pt-BR");

        tr.innerHTML = `
          <td><b>${camp.campaignId}</b></td>
          <td><span class="status-pill status-green">${camp.templateName}</span></td>
          <td>${camp.total}</td>
          <td style="color: var(--status-green); font-weight: bold;">${camp.sent}</td>
          <td style="color: var(--status-red); font-weight: bold;">${camp.failed}</td>
          <td>${dateStr}</td>
          <td>
            <button class="btn btn-secondary btn-export-csv" data-id="${camp.campaignId}" style="padding: 4px 8px; font-size: 11px;">
              📥 CSV
            </button>
          </td>
        `;
        broadcastHistoryTbody.appendChild(tr);
      });

      document.querySelectorAll(".btn-export-csv").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          const campId = e.currentTarget.getAttribute("data-id");
          const res = await api.exportCampaignCsv(campId);
          if (res.success && res.csv) {
            const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `relatorio_${campId}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }
        });
      });
    } catch (error) {
      console.error("Erro ao carregar histórico de disparos:", error);
    }
  }

  if (btnStartBroadcast) {
    btnStartBroadcast.addEventListener("click", async () => {
      const templateName = broadcastTemplateSelect.value;
      const rawText = broadcastRecipientsInput.value.trim();

      if (!templateName) {
        alert("Por favor, selecione um template aprovado para o disparo.");
        return;
      }

      if (!rawText) {
        alert("Por favor, insira a lista de destinatários.");
        return;
      }

      const lines = rawText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
      const recipients = lines.map((line) => {
        const parts = line.split(",").map((p) => p.trim());
        const phone = parts[0];
        const name = parts[1] || "";
        const variables = parts.slice(1);
        return { phone, name, variables };
      });

      if (recipients.length === 0) {
        alert("Nenhum contato válido informado.");
        return;
      }

      broadcastProgressPanel.style.display = "block";
      btnStartBroadcast.style.display = "none";
      btnPauseBroadcast.style.display = "inline-flex";
      btnStopBroadcast.style.display = "inline-flex";

      const selectedTmpl = loadedTemplates.find((t) => t.name === templateName);
      const language = selectedTmpl ? selectedTmpl.language : "pt_BR";

      try {
        await api.startBroadcast({
          templateName,
          language,
          recipients,
          delayBetweenMessagesMs: 1500,
        });
      } catch (err) {
        alert(`❌ Falha ao iniciar disparo: ${err.message}`);
        resetBroadcastControls();
      }
    });
  }

  if (btnPauseBroadcast) {
    btnPauseBroadcast.addEventListener("click", async () => {
      await api.pauseBroadcast();
      btnPauseBroadcast.style.display = "none";
      btnResumeBroadcast.style.display = "inline-flex";
      broadcastStatusLabel.textContent = "Disparo Pausado";
    });
  }

  if (btnResumeBroadcast) {
    btnResumeBroadcast.addEventListener("click", async () => {
      await api.resumeBroadcast();
      btnResumeBroadcast.style.display = "none";
      btnPauseBroadcast.style.display = "inline-flex";
      broadcastStatusLabel.textContent = "Enviando mensagens...";
    });
  }

  if (btnStopBroadcast) {
    btnStopBroadcast.addEventListener("click", async () => {
      if (confirm("Deseja realmente interromper esta campanha?")) {
        await api.stopBroadcast();
        resetBroadcastControls();
      }
    });
  }

  function resetBroadcastControls() {
    btnStartBroadcast.style.display = "inline-flex";
    btnPauseBroadcast.style.display = "none";
    btnResumeBroadcast.style.display = "none";
    btnStopBroadcast.style.display = "none";
  }

  api.onBroadcastProgress((stats) => {
    broadcastProgressBar.style.width = `${stats.progressPercent}%`;
    broadcastPercentLabel.textContent = `${stats.progressPercent}%`;
    bcTotal.textContent = stats.total;
    bcSent.textContent = stats.sent;
    bcFailed.textContent = stats.failed;
  });

  api.onBroadcastCompleted((stats) => {
    resetBroadcastControls();
    broadcastStatusLabel.textContent = "✅ Campanha Concluída!";
    alert(`🎉 Campanha finalizada!\nEnviados com sucesso: ${stats.sent}\nFalhas: ${stats.failed}`);
    loadBroadcastHistory();
  });

  // ==========================================
  // 5. FLUXOS E CHATBOT (FLOW BUILDER COMPLETO)
  // ==========================================

  // 5.1 Carrega e renderiza todos os fluxos na Visão de Lista
  async function loadFlowsList() {
    try {
      const flows = await api.getAllFlows();
      flowsGridContainer.innerHTML = "";

      if (!flows || flows.length === 0) {
        flowsGridContainer.innerHTML = `
          <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
            <div style="font-size: 36px; margin-bottom: 12px;">🤖</div>
            <h3>Nenhum fluxo encontrado</h3>
            <p style="color: var(--text-muted); margin-bottom: 20px;">Crie seu primeiro fluxo com botões e menus da Meta!</p>
            <button class="btn btn-primary" onclick="document.getElementById('btn-create-new-flow').click()">➕ Criar Primeiro Fluxo</button>
          </div>
        `;
        return;
      }

      flows.forEach((flow) => {
        const stepCount = Object.keys(flow.steps || {}).length;
        const triggers = flow.triggerKeywords || [];
        const card = document.createElement("div");
        card.className = `flow-card ${flow.isActive ? "is-active" : ""}`;

        const triggersHtml = triggers
          .map((kw) => `<span class="trigger-tag">${kw}</span>`)
          .join("");

        card.innerHTML = `
          <div class="flow-card-header">
            <div>
              <h3>${flow.name || "Sem Nome"}</h3>
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
              <input type="radio" name="active_flow_radio" class="radio-set-active" data-id="${flow.id}" ${flow.isActive ? "checked" : ""}>
              <span>Ativar no Bot</span>
            </label>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary btn-edit-flow" data-id="${flow.id}" style="padding: 6px 10px; font-size: 12px;">✏️ Editar</button>
              <button class="btn btn-secondary btn-duplicate-flow" data-id="${flow.id}" style="padding: 6px 10px; font-size: 12px;" title="Duplicar">📋</button>
              <button class="btn btn-danger btn-delete-flow" data-id="${flow.id}" style="padding: 6px 10px; font-size: 12px;" title="Excluir">🗑️</button>
            </div>
          </div>
        `;

        flowsGridContainer.appendChild(card);
      });

      // Vincula eventos dos cartões
      document.querySelectorAll(".radio-set-active").forEach((radio) => {
        radio.addEventListener("change", async (e) => {
          const flowId = e.target.getAttribute("data-id");
          await api.setActiveFlow(flowId);
          await loadFlowsList();
        });
      });

      document.querySelectorAll(".btn-edit-flow").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          const flowId = e.currentTarget.getAttribute("data-id");
          const flow = await api.getFlowById(flowId);
          if (flow) openFlowBuilder(flow);
        });
      });

      document.querySelectorAll(".btn-duplicate-flow").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          const flowId = e.currentTarget.getAttribute("data-id");
          await api.duplicateFlow(flowId);
          await loadFlowsList();
        });
      });

      document.querySelectorAll(".btn-delete-flow").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          const flowId = e.currentTarget.getAttribute("data-id");
          if (confirm("Tem certeza que deseja excluir este fluxo?")) {
            await api.deleteFlow(flowId);
            await loadFlowsList();
          }
        });
      });
    } catch (error) {
      console.error("Erro ao listar fluxos:", error);
    }
  }

  // 5.2 Criação de Novo Fluxo em Branco
  if (btnCreateNewFlow) {
    btnCreateNewFlow.addEventListener("click", async () => {
      const newFlow = await api.createEmptyFlow("Novo Fluxo de Atendimento");
      if (newFlow) {
        openFlowBuilder(newFlow);
      }
    });
  }

  // 5.3 Abertura do Builder
  function openFlowBuilder(flow) {
    currentEditingFlow = JSON.parse(JSON.stringify(flow));
    flowListView.style.display = "none";
    flowBuilderView.style.display = "block";

    builderFlowName.value = currentEditingFlow.name || "";
    builderTriggerKeywords.value = (currentEditingFlow.triggerKeywords || []).join(", ");

    const stepKeys = Object.keys(currentEditingFlow.steps || {});
    activeEditingStepId = stepKeys[0] || null;

    renderBuilderSteps();
    updateBuilderSimulator(activeEditingStepId);
  }

  // 5.4 Voltar para Lista
  if (btnBackToFlowsList) {
    btnBackToFlowsList.addEventListener("click", () => {
      flowBuilderView.style.display = "none";
      flowListView.style.display = "block";
      loadFlowsList();
    });
  }

  // 5.5 Renderização dos Blocos no Canvas do Builder
  function renderBuilderSteps() {
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

    stepKeys.forEach((stepId) => {
      const step = steps[stepId];
      const isSelected = stepId === activeEditingStepId;
      const stepCard = document.createElement("div");
      stepCard.className = `builder-step-card ${isSelected ? "active-editing" : ""}`;
      stepCard.setAttribute("data-step-id", stepId);

      let typeBadge = '<span class="step-type-pill">🔘 Botões Rápidos</span>';
      if (step.type === "interactive_list") {
        typeBadge = '<span class="step-type-pill" style="color: var(--accent-purple); border-color: rgba(139,92,246,0.3); background: rgba(139,92,246,0.15);">📋 Menu de Lista</span>';
      } else if (step.type === "text") {
        typeBadge = '<span class="step-type-pill" style="color: var(--status-green); border-color: rgba(16,185,129,0.3); background: rgba(16,185,129,0.15);">💬 Texto Simples</span>';
      }

      // Monta as opções de destino
      const destinationOptions = [
        '<option value="">-- Encerrar Atendimento --</option>',
        ...stepKeys
          .filter((k) => k !== stepId)
          .map((k) => `<option value="${k}">${k}</option>`),
      ];

      let contentEditorHtml = "";

      if (step.type === "interactive_buttons") {
        const buttons = step.buttons || [];
        const buttonsRowsHtml = buttons
          .map((btn, btnIdx) => `
            <div class="step-item-row" data-btn-idx="${btnIdx}">
              <span style="font-size: 12px; color: var(--text-dim); width: 16px;">${btnIdx + 1}.</span>
              <input type="text" class="form-control btn-title-input" value="${btn.title || ""}" placeholder="Título do Botão (máx 20)" maxlength="20" style="flex: 2;">
              <select class="form-control btn-dest-select" style="flex: 2;">
                ${destinationOptions
                  .map((opt) => opt.replace(`value="${btn.nextStepId}"`, `value="${btn.nextStepId}" selected`))
                  .join("")}
              </select>
              <button class="btn-icon-delete btn-remove-button" data-btn-idx="${btnIdx}" title="Excluir Botão">✕</button>
            </div>
          `)
          .join("");

        contentEditorHtml = `
          <div class="form-group" style="margin-bottom: 10px;">
            <label style="font-size: 11px;">Cabeçalho (Opcional):</label>
            <input type="text" class="form-control step-header-input" value="${step.header || ""}" placeholder="Ex: Atendimento Zwei Chat">
          </div>
          <div class="form-group" style="margin-bottom: 10px;">
            <label style="font-size: 11px;">Mensagem Principal:</label>
            <textarea class="form-control step-body-input" rows="3" placeholder="Digite o texto da mensagem...">${step.body || ""}</textarea>
          </div>
          <div class="form-group" style="margin-bottom: 12px;">
            <label style="font-size: 11px;">Rodapé (Opcional):</label>
            <input type="text" class="form-control step-footer-input" value="${step.footer || ""}" placeholder="Ex: Selecione uma opção abaixo:">
          </div>
          <div class="step-items-builder">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-size: 12px; font-weight: 600;">Botões Clicáveis (${buttons.length}/3):</span>
              ${buttons.length < 3 ? `<button class="btn btn-secondary btn-add-button-action" style="padding: 2px 8px; font-size: 11px;">➕ Botão</button>` : ""}
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
              <div class="step-item-row" data-sec-idx="${sIdx}" data-row-idx="${rIdx}">
                <input type="text" class="form-control list-row-title-input" value="${row.title || ""}" placeholder="Opção (máx 24)" maxlength="24" style="flex: 2;">
                <input type="text" class="form-control list-row-desc-input" value="${row.description || ""}" placeholder="Descrição (máx 72)" maxlength="72" style="flex: 3;">
                <select class="form-control list-row-dest-select" style="flex: 2;">
                  ${destinationOptions
                    .map((opt) => opt.replace(`value="${row.nextStepId}"`, `value="${row.nextStepId}" selected`))
                    .join("")}
                </select>
                <button class="btn-icon-delete btn-remove-row" data-sec-idx="${sIdx}" data-row-idx="${rIdx}" title="Excluir Linha">✕</button>
              </div>
            `;
          });
        });

        contentEditorHtml = `
          <div class="form-group" style="margin-bottom: 10px;">
            <label style="font-size: 11px;">Mensagem Principal:</label>
            <textarea class="form-control step-body-input" rows="2" placeholder="Digite a orientação do menu...">${step.body || ""}</textarea>
          </div>
          <div class="form-group" style="margin-bottom: 10px;">
            <label style="font-size: 11px;">Texto do Botão que Abre o Menu (máx 20):</label>
            <input type="text" class="form-control step-button-title-input" value="${step.buttonTitle || "Ver Opções"}" maxlength="20" placeholder="Ex: Ver Catálogo">
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
          <div class="form-group" style="margin-bottom: 10px;">
            <label style="font-size: 11px;">Mensagem de Texto:</label>
            <textarea class="form-control step-body-input" rows="3" placeholder="Digite a resposta que o bot enviará...">${step.body || ""}</textarea>
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
            <span class="step-id-badge"># ${stepId}</span>
            ${typeBadge}
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-secondary btn-select-step-preview" data-step-id="${stepId}" style="padding: 4px 8px; font-size: 11px;">👁️ Ver no Celular</button>
            ${stepKeys.length > 1 ? `<button class="btn-icon-delete btn-delete-step-card" data-step-id="${stepId}" title="Excluir Bloco">🗑️</button>` : ""}
          </div>
        </div>
        ${contentEditorHtml}
      `;

      builderStepsContainer.appendChild(stepCard);
    });

    bindBuilderStepEvents();
  }

  // 5.6 Eventos dentro dos Blocos do Builder
  function bindBuilderStepEvents() {
    document.querySelectorAll(".btn-select-step-preview").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const stepId = e.currentTarget.getAttribute("data-step-id");
        activeEditingStepId = stepId;
        renderBuilderSteps();
        updateBuilderSimulator(stepId);
      });
    });

    document.querySelectorAll(".btn-delete-step-card").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const stepId = e.currentTarget.getAttribute("data-step-id");
        if (confirm(`Excluir o bloco "${stepId}"?`)) {
          delete currentEditingFlow.steps[stepId];
          const remaining = Object.keys(currentEditingFlow.steps);
          activeEditingStepId = remaining[0] || null;
          renderBuilderSteps();
          updateBuilderSimulator(activeEditingStepId);
        }
      });
    });

    document.querySelectorAll(".builder-step-card").forEach((card) => {
      const stepId = card.getAttribute("data-step-id");
      const step = currentEditingFlow.steps[stepId];
      if (!step) return;

      const headerInput = card.querySelector(".step-header-input");
      if (headerInput) {
        headerInput.addEventListener("input", (e) => {
          step.header = e.target.value;
          if (activeEditingStepId === stepId) updateBuilderSimulator(stepId);
        });
      }

      const bodyInput = card.querySelector(".step-body-input");
      if (bodyInput) {
        bodyInput.addEventListener("input", (e) => {
          step.body = e.target.value;
          if (activeEditingStepId === stepId) updateBuilderSimulator(stepId);
        });
      }

      const footerInput = card.querySelector(".step-footer-input");
      if (footerInput) {
        footerInput.addEventListener("input", (e) => {
          step.footer = e.target.value;
          if (activeEditingStepId === stepId) updateBuilderSimulator(stepId);
        });
      }

      const buttonTitleInput = card.querySelector(".step-button-title-input");
      if (buttonTitleInput) {
        buttonTitleInput.addEventListener("input", (e) => {
          step.buttonTitle = e.target.value;
          if (activeEditingStepId === stepId) updateBuilderSimulator(stepId);
        });
      }

      const nextDestSelect = card.querySelector(".step-next-dest-select");
      if (nextDestSelect) {
        nextDestSelect.addEventListener("change", (e) => {
          step.nextStepId = e.target.value || null;
        });
      }

      const btnAddButton = card.querySelector(".btn-add-button-action");
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

      card.querySelectorAll(".btn-title-input").forEach((inp) => {
        inp.addEventListener("input", (e) => {
          const idx = parseInt(e.target.closest(".step-item-row").getAttribute("data-btn-idx"), 10);
          if (step.buttons?.[idx]) {
            step.buttons[idx].title = e.target.value;
            if (activeEditingStepId === stepId) updateBuilderSimulator(stepId);
          }
        });
      });

      card.querySelectorAll(".btn-dest-select").forEach((sel) => {
        sel.addEventListener("change", (e) => {
          const idx = parseInt(e.target.closest(".step-item-row").getAttribute("data-btn-idx"), 10);
          if (step.buttons?.[idx]) {
            step.buttons[idx].nextStepId = e.target.value || null;
          }
        });
      });

      card.querySelectorAll(".btn-remove-button").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const idx = parseInt(e.currentTarget.getAttribute("data-btn-idx"), 10);
          step.buttons.splice(idx, 1);
          renderBuilderSteps();
          updateBuilderSimulator(stepId);
        });
      });

      const btnAddRow = card.querySelector(".btn-add-row-action");
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

      card.querySelectorAll(".list-row-title-input").forEach((inp) => {
        inp.addEventListener("input", (e) => {
          const sIdx = parseInt(e.target.closest(".step-item-row").getAttribute("data-sec-idx"), 10);
          const rIdx = parseInt(e.target.closest(".step-item-row").getAttribute("data-row-idx"), 10);
          if (step.sections?.[sIdx]?.rows?.[rIdx]) {
            step.sections[sIdx].rows[rIdx].title = e.target.value;
            if (activeEditingStepId === stepId) updateBuilderSimulator(stepId);
          }
        });
      });

      card.querySelectorAll(".list-row-desc-input").forEach((inp) => {
        inp.addEventListener("input", (e) => {
          const sIdx = parseInt(e.target.closest(".step-item-row").getAttribute("data-sec-idx"), 10);
          const rIdx = parseInt(e.target.closest(".step-item-row").getAttribute("data-row-idx"), 10);
          if (step.sections?.[sIdx]?.rows?.[rIdx]) {
            step.sections[sIdx].rows[rIdx].description = e.target.value;
          }
        });
      });

      card.querySelectorAll(".list-row-dest-select").forEach((sel) => {
        sel.addEventListener("change", (e) => {
          const sIdx = parseInt(e.target.closest(".step-item-row").getAttribute("data-sec-idx"), 10);
          const rIdx = parseInt(e.target.closest(".step-item-row").getAttribute("data-row-idx"), 10);
          if (step.sections?.[sIdx]?.rows?.[rIdx]) {
            step.sections[sIdx].rows[rIdx].nextStepId = e.target.value || null;
          }
        });
      });

      card.querySelectorAll(".btn-remove-row").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const sIdx = parseInt(e.currentTarget.getAttribute("data-sec-idx"), 10);
          const rIdx = parseInt(e.currentTarget.getAttribute("data-row-idx"), 10);
          step.sections[sIdx].rows.splice(rIdx, 1);
          renderBuilderSteps();
          updateBuilderSimulator(stepId);
        });
      });
    });
  }

  // 5.7 Menu para Adicionar Novo Passo
  if (btnToggleAddStep) {
    btnToggleAddStep.addEventListener("click", () => {
      const isHidden = addStepMenu.style.display === "none";
      addStepMenu.style.display = isHidden ? "flex" : "none";
    });
  }

  document.querySelectorAll(".add-step-option").forEach((opt) => {
    opt.addEventListener("click", (e) => {
      const type = e.currentTarget.getAttribute("data-type");
      addStepMenu.style.display = "none";

      const stepCount = Object.keys(currentEditingFlow.steps || {}).length + 1;
      const newStepId = `step_${stepCount}`;

      let newStepData = {
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

  // 5.8 Atualizador do Simulador de WhatsApp ao Vivo
  function updateBuilderSimulator(stepId) {
    const step = currentEditingFlow?.steps?.[stepId];
    if (!step) {
      builderSimHeader.style.display = "none";
      builderSimBody.textContent = "Selecione ou crie um bloco para pré-visualizar.";
      builderSimFooter.style.display = "none";
      builderSimButtons.innerHTML = "";
      simStepBadge.textContent = "NENHUM PASSO";
      return;
    }

    simStepBadge.textContent = `# ${stepId.toUpperCase()}`;
    builderSimBody.textContent = step.body || "Mensagem vazia";

    if (step.header) {
      builderSimHeader.style.display = "block";
      builderSimHeader.textContent = step.header;
    } else {
      builderSimHeader.style.display = "none";
    }

    if (step.footer) {
      builderSimFooter.style.display = "block";
      builderSimFooter.textContent = step.footer;
    } else {
      builderSimFooter.style.display = "none";
    }

    builderSimButtons.innerHTML = "";
    if (step.type === "interactive_buttons" && step.buttons) {
      step.buttons.forEach((btn) => {
        const b = document.createElement("div");
        b.className = "wa-btn";
        b.textContent = btn.title || "Botão";
        builderSimButtons.appendChild(b);
      });
    } else if (step.type === "interactive_list") {
      const listBtn = document.createElement("div");
      listBtn.className = "wa-btn";
      listBtn.style.background = "rgba(83, 189, 235, 0.15)";
      listBtn.style.color = "#53bdeb";
      listBtn.textContent = `📋 ${step.buttonTitle || "Ver Opções"}`;
      builderSimButtons.appendChild(listBtn);
    }
  }

  // 5.9 Salvar Fluxo Editado
  if (btnSaveCurrentFlow) {
    btnSaveCurrentFlow.addEventListener("click", async () => {
      const name = builderFlowName.value.trim();
      if (!name) {
        alert("Por favor, dê um nome ao seu fluxo.");
        return;
      }

      const keywords = builderTriggerKeywords.value
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

      await api.saveFlow(currentEditingFlow);
      alert("✅ Fluxo salvo com sucesso!");
      btnBackToFlowsList.click();
    });
  }

  if (toggleBotSwitch) {
    toggleBotSwitch.addEventListener("change", async () => {
      const enabled = toggleBotSwitch.checked;
      await api.toggleBot(enabled);
    });
  }

  // ==========================================
  // 6. CONFIGURAÇÕES DA META
  // ==========================================
  async function loadConfigForm() {
    try {
      const config = await api.getConfig();
      if (config) {
        cfgPhoneId.value = config.phoneNumberId || "";
        cfgWabaId.value = config.wabaId || "";
        cfgAccessToken.value = config.accessToken || "";
        cfgAppSecret.value = config.appSecret || "";
        cfgVerifyToken.value = config.verifyToken || "";
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    }
  }

  if (formMetaConfig) {
    formMetaConfig.addEventListener("submit", async (e) => {
      e.preventDefault();
      const newConfig = {
        phoneNumberId: cfgPhoneId.value.trim(),
        wabaId: cfgWabaId.value.trim(),
        accessToken: cfgAccessToken.value.trim(),
        appSecret: cfgAppSecret.value.trim(),
        verifyToken: cfgVerifyToken.value.trim(),
      };

      const res = await api.saveConfig(newConfig);
      if (res.success) {
        alert("✅ Credenciais salvas com sucesso!");
        await refreshAccountHealth();
        await loadTemplatesList();
      } else {
        alert("❌ Falha ao salvar configurações.");
      }
    });
  }

  if (btnTestMetaConfig) {
    btnTestMetaConfig.addEventListener("click", async () => {
      btnTestMetaConfig.disabled = true;
      btnTestMetaConfig.textContent = "Testando...";

      try {
        const testData = {
          phoneNumberId: cfgPhoneId.value.trim(),
          wabaId: cfgWabaId.value.trim(),
          accessToken: cfgAccessToken.value.trim(),
        };
        const res = await api.testConnection(testData);

        if (res.success && res.data) {
          alert(`✅ Conexão bem-sucedida com a Meta!\nNome Verificado: ${res.data.verified_name || "OK"}\nQuality: ${res.data.quality_rating || "GREEN"}`);
        } else {
          alert(`⚠️ Falha no teste de conexão: ${res.error}`);
        }
      } catch (error) {
        alert(`❌ Erro no teste: ${error.message}`);
      } finally {
        btnTestMetaConfig.disabled = false;
        btnTestMetaConfig.textContent = "🔍 Testar Conexão";
      }
    });
  }

  // ==========================================
  // INICIALIZAÇÃO GERAL DA INTERFACE
  // ==========================================
  await loadConfigForm();
  await refreshAccountHealth();
  await loadTemplatesList();
  await loadBroadcastHistory();
  await loadFlowsList();
});
