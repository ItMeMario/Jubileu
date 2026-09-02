// renderer/guiScripts/appGui.js
// Controlador de Interface Gráfica (Frontend) do Zwei Chat Premium

document.addEventListener("DOMContentLoaded", async () => {
  console.log("⚡ Inicializando interface do Zwei Chat Premium...");

  const api = window.zweiPremiumApi;
  if (!api) {
    console.error("❌ API do Zwei Chat Premium não está disponível no contexto global.");
    return;
  }

  // Elementos de Navegação por Abas
  const navItems = document.querySelectorAll(".nav-item");
  const tabPanes = document.querySelectorAll(".tab-pane");

  // Elementos do Dashboard
  const dashConnStatus = document.getElementById("dash-conn-status");
  const dashPhoneNumber = document.getElementById("dash-phone-number");
  const dashQualityRating = document.getElementById("dash-quality-rating");
  const dashLimitTier = document.getElementById("dash-limit-tier");
  const dashVerifiedName = document.getElementById("dash-verified-name");
  const btnRefreshHealth = document.getElementById("btn-refresh-health");

  // Elementos de Templates & Simulador
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

  // Elementos do Disparador (Broadcast)
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

  // Elementos de Fluxos & Bot (Flow Builder)
  const toggleBotSwitch = document.getElementById("toggle-bot-switch");
  const flowListView = document.getElementById("flow-list-view");
  const flowBuilderView = document.getElementById("flow-builder-view");
  const flowsCardsContainer = document.getElementById("flows-cards-container");
  const btnCreateNewFlow = document.getElementById("btn-create-new-flow");
  const btnBackToFlowsList = document.getElementById("btn-back-to-flows-list");
  const builderFlowName = document.getElementById("builder-flow-name");
  const btnSaveBuilderFlow = document.getElementById("btn-save-builder-flow");
  const triggerTypeSelect = document.getElementById("trigger-type-select");
  const triggerKeywordsInput = document.getElementById("trigger-keywords-input");
  const triggerKeywordsGroup = document.getElementById("trigger-keywords-group");
  const builderStepsContainer = document.getElementById("builder-steps-container");
  const btnAddStepButtons = document.getElementById("btn-add-step-buttons");
  const btnAddStepList = document.getElementById("btn-add-step-list");
  const btnAddStepText = document.getElementById("btn-add-step-text");

  let currentEditingFlow = null;

  // Elementos de Configurações
  const formMetaConfig = document.getElementById("form-meta-config");
  const cfgPhoneId = document.getElementById("cfg-phone-id");
  const cfgWabaId = document.getElementById("cfg-waba-id");
  const cfgAccessToken = document.getElementById("cfg-access-token");
  const cfgAppSecret = document.getElementById("cfg-app-secret");
  const cfgVerifyToken = document.getElementById("cfg-verify-token");
  const btnTestMetaConfig = document.getElementById("btn-test-meta-config");

  let loadedTemplates = [];

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

  // Ações Rápidas do Dashboard
  document.getElementById("btn-quick-sync-templates")?.addEventListener("click", () => {
    document.getElementById("nav-templates")?.click();
    btnSyncTemplates?.click();
  });
  document.getElementById("btn-quick-new-broadcast")?.addEventListener("click", () => {
    document.getElementById("nav-broadcast")?.click();
  });
  document.getElementById("btn-quick-config")?.addEventListener("click", () => {
    document.getElementById("nav-settings")?.click();
  });

  // ==========================================
  // 2. DIAGNÓSTICO E SAÚDE DA CONTA
  // ==========================================
  async function refreshAccountHealth() {
    dashConnStatus.innerHTML = '<span class="status-pill status-yellow"><span class="status-dot"></span> Verificando...</span>';

    try {
      const response = await api.getAccountHealth();

      if (response.success && response.data) {
        const data = response.data;
        dashConnStatus.innerHTML = '<span class="status-pill status-green"><span class="status-dot"></span> CONECTADO</span>';
        dashPhoneNumber.textContent = `Telefone: ${data.displayPhoneNumber || "OK"}`;
        dashVerifiedName.textContent = data.verifiedName || "Conta WABA";
        dashLimitTier.textContent = data.messagingLimitTier || "TIER_1K";

        const rating = (data.qualityRating || "GREEN").toUpperCase();
        let ratingClass = "status-green";
        if (rating === "YELLOW") ratingClass = "status-yellow";
        if (rating === "RED") ratingClass = "status-red";

        dashQualityRating.innerHTML = `<span class="status-pill ${ratingClass}"><span class="status-dot"></span> ${rating}</span>`;
      } else {
        dashConnStatus.innerHTML = '<span class="status-pill status-red"><span class="status-dot"></span> DESCONECTADO</span>';
        dashPhoneNumber.textContent = response.error || "Verifique as credenciais";
      }
    } catch (error) {
      dashConnStatus.innerHTML = '<span class="status-pill status-red"><span class="status-dot"></span> ERRO</span>';
      dashPhoneNumber.textContent = error.message;
    }
  }

  btnRefreshHealth.addEventListener("click", refreshAccountHealth);

  // ==========================================
  // 3. GERENCIAMENTO DE TEMPLATES & SIMULADOR
  // ==========================================
  async function loadTemplatesList() {
    try {
      const templates = await api.getApprovedTemplates();
      loadedTemplates = templates || [];

      templateSelect.innerHTML = '<option value="">Selecione um template...</option>';
      broadcastTemplateSelect.innerHTML = '<option value="">Selecione um template aprovado...</option>';

      if (loadedTemplates.length === 0) {
        templateSelect.innerHTML = '<option value="">Nenhum template sincronizado. Clique em Sincronizar.</option>';
        return;
      }

      loadedTemplates.forEach((tmpl) => {
        const opt = document.createElement("option");
        opt.value = tmpl.name;
        opt.textContent = `${tmpl.name} (${tmpl.category}) - ${tmpl.language}`;
        templateSelect.appendChild(opt);

        const optBc = opt.cloneNode(true);
        broadcastTemplateSelect.appendChild(optBc);
      });
    } catch (error) {
      console.error("Erro ao listar templates:", error);
    }
  }

  btnSyncTemplates.addEventListener("click", async () => {
    btnSyncTemplates.disabled = true;
    btnSyncTemplates.innerHTML = "<span>⏳</span> Sincronizando...";

    try {
      const result = await api.syncTemplates();
      if (result.success) {
        alert(`✅ ${result.count} templates sincronizados com sucesso da Meta!`);
        await loadTemplatesList();
      } else {
        alert(`⚠️ Falha na sincronização: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Erro: ${error.message}`);
    } finally {
      btnSyncTemplates.disabled = false;
      btnSyncTemplates.innerHTML = "<span>🔄</span> Sincronizar com a Meta";
    }
  });

  templateSelect.addEventListener("change", () => {
    const selectedName = templateSelect.value;
    const tmpl = loadedTemplates.find((t) => t.name === selectedName);

    if (!tmpl) {
      templateMetaInfo.style.display = "none";
      templateVariablesInputs.innerHTML = "";
      simBubbleHeader.style.display = "none";
      simBubbleFooter.style.display = "none";
      simBubbleButtons.innerHTML = "";
      simBubbleBody.textContent = "Selecione um template para visualizar a mensagem aqui.";
      return;
    }

    templateMetaInfo.style.display = "block";
    tmplBadgeStatus.textContent = tmpl.status;
    tmplBadgeCat.textContent = tmpl.category;
    tmplBadgeLang.textContent = tmpl.language;

    // Constrói inputs para variáveis do corpo
    const variables = tmpl.components?.body?.variables || [];
    templateVariablesInputs.innerHTML = "";

    if (variables.length > 0) {
      const title = document.createElement("h4");
      title.textContent = "Preenchimento de Variáveis:";
      title.style.margin = "12px 0 8px 0";
      title.style.fontSize = "13px";
      title.style.color = "#9ca3af";
      templateVariablesInputs.appendChild(title);

      variables.forEach((varIdx) => {
        const formGroup = document.createElement("div");
        formGroup.className = "form-group";
        formGroup.style.marginBottom = "10px";

        formGroup.innerHTML = `
          <label style="font-size: 12px;">Variável {{${varIdx}}}:</label>
          <input type="text" class="form-control tmpl-var-input" data-var="${varIdx}" placeholder="Valor para {{${varIdx}}}" value="Exemplo ${varIdx}">
        `;
        templateVariablesInputs.appendChild(formGroup);
      });

      // Adiciona listeners para atualizar preview em tempo real
      document.querySelectorAll(".tmpl-var-input").forEach((input) => {
        input.addEventListener("input", updateSimulatorPreview);
      });
    }

    updateSimulatorPreview();
  });

  async function updateSimulatorPreview() {
    const selectedName = templateSelect.value;
    const tmpl = loadedTemplates.find((t) => t.name === selectedName);
    if (!tmpl) return;

    // Coleta valores das variáveis
    const values = {};
    document.querySelectorAll(".tmpl-var-input").forEach((input) => {
      const varIdx = input.getAttribute("data-var");
      values[varIdx] = input.value || `{{${varIdx}}}`;
    });

    const renderedText = await api.renderTemplatePreview(selectedName, values);
    simBubbleBody.textContent = renderedText || tmpl.components?.body?.text || "";

    // Cabeçalho
    if (tmpl.components?.header?.text) {
      simBubbleHeader.style.display = "block";
      simBubbleHeader.textContent = tmpl.components.header.text;
    } else {
      simBubbleHeader.style.display = "none";
    }

    // Rodapé
    if (tmpl.components?.footer?.text) {
      simBubbleFooter.style.display = "block";
      simBubbleFooter.textContent = tmpl.components.footer.text;
    } else {
      simBubbleFooter.style.display = "none";
    }

    // Botões
    simBubbleButtons.innerHTML = "";
    if (tmpl.components?.buttons && tmpl.components.buttons.length > 0) {
      tmpl.components.buttons.forEach((btn) => {
        const btnElem = document.createElement("div");
        btnElem.className = "wa-btn";
        btnElem.textContent = btn.text || "Botão";
        simBubbleButtons.appendChild(btnElem);
      });
    }
  }

  // ==========================================
  // 4. DISPARADOR OFICIAL (BROADCAST)
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

      // Vincula botões de exportação CSV
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

    // Atualiza controles da interface
    btnStartBroadcast.style.display = "none";
    btnPauseBroadcast.style.display = "inline-flex";
    btnStopBroadcast.style.display = "inline-flex";
    broadcastProgressPanel.style.display = "block";

    try {
      await api.startBroadcast({
        campaignId: `campanha_${Date.now()}`,
        templateName,
        recipients,
        delayBetweenMs: 80,
      });
    } catch (error) {
      alert(`❌ Erro no disparo: ${error.message}`);
      resetBroadcastControls();
    }
  });

  btnPauseBroadcast.addEventListener("click", async () => {
    await api.pauseBroadcast();
    btnPauseBroadcast.style.display = "none";
    btnResumeBroadcast.style.display = "inline-flex";
    broadcastStatusLabel.textContent = "Campanha Pausada";
  });

  btnResumeBroadcast.addEventListener("click", async () => {
    await api.resumeBroadcast();
    btnResumeBroadcast.style.display = "none";
    btnPauseBroadcast.style.display = "inline-flex";
    broadcastStatusLabel.textContent = "Enviando mensagens...";
  });

  btnStopBroadcast.addEventListener("click", async () => {
    if (confirm("Deseja realmente interromper esta campanha?")) {
      await api.stopBroadcast();
      resetBroadcastControls();
    }
  });

  function resetBroadcastControls() {
    btnStartBroadcast.style.display = "inline-flex";
    btnPauseBroadcast.style.display = "none";
    btnResumeBroadcast.style.display = "none";
    btnStopBroadcast.style.display = "none";
  }

  // Listeners de Progresso e Conclusão do Disparo
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
  // 5. FLUXOS E CHATBOT
  // ==========================================
  async function loadFlows() {
    try {
      const activeFlow = await api.getActiveFlow();
      if (!activeFlow) return;

      activeFlowTitle.textContent = activeFlow.name || "Fluxo Interativo";
      flowStepsTbody.innerHTML = "";

      const steps = activeFlow.steps || {};
      for (const [stepKey, step] of Object.entries(steps)) {
        const tr = document.createElement("tr");
        let optionsText = "-";

        if (step.buttons) {
          optionsText = step.buttons.map((b) => `🔘 ${b.title}`).join("<br>");
        } else if (step.sections) {
          optionsText = step.sections
            .map((s) => s.rows.map((r) => `📋 ${r.title}`).join("<br>"))
            .join("<br>");
        }

        tr.innerHTML = `
          <td><b>${stepKey}</b></td>
          <td><span class="status-pill status-green">${step.type}</span></td>
          <td>${(step.body || "").substring(0, 60)}...</td>
          <td>${optionsText}</td>
        `;
        flowStepsTbody.appendChild(tr);
      }
    } catch (error) {
      console.error("Erro ao carregar fluxos:", error);
    }
  }

  toggleBotSwitch.addEventListener("change", async () => {
    const enabled = toggleBotSwitch.checked;
    await api.toggleBot(enabled);
  });

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

  // Inicialização Geral da Interface
  await loadConfigForm();
  await refreshAccountHealth();
  await loadTemplatesList();
  await loadBroadcastHistory();
  await loadFlows();
});
