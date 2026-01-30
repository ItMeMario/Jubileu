// renderer/guiScripts/dataBaseRenderer.js
class DatabaseManager {
  constructor() {
    this.currentTable = null;
    this.tables = [];
    this.databaseInfo = null;
    this.tableCounts = {};
    this.overview = null;

    this.initializeElements();
    this.setupEventListeners();
    this.loadInitialData();
  }

  initializeElements() {
    this.databaseSection = document.getElementById("database-section");
    this.statusDiv = document.getElementById("status");
    this.databaseOverview = null; // Será criado dinamicamente
    this.tablesContainer = null; // Será criado dinamicamente
    this.tableDetailsContainer = null; // Será criado dinamicamente
    this.btnRefresh = null; // Será criado dinamicamente
  }

  setupEventListeners() {
    // Event listeners serão configurados após criação dos elementos
  }

  async loadInitialData() {
    try {
      this.showLoadingState();
      await this.loadDatabaseOverview();
      this.renderDatabaseInterface();
    } catch (error) {
      this.showStatus("Erro ao carregar dados do banco", "error");
      console.error("Error loading initial data:", error);
      this.showErrorState();
    }
  }

  async loadDatabaseOverview() {
    try {
      const result = await window.databaseAPI.getDatabaseOverview();

      if (result.success) {
        this.overview = result.data;
        this.tables = this.overview.tables || [];
        this.tableCounts = this.overview.tableCounts || {};
        this.databaseInfo = this.overview.database || {};
      } else {
        throw new Error(
          result.error || "Erro ao carregar visão geral do banco"
        );
      }
    } catch (error) {
      console.error("Error loading database overview:", error);
      throw error;
    }
  }

  renderDatabaseInterface() {
    this.databaseSection.innerHTML = `
      <div class="content-header">
        <h1>🗄️ Banco de Dados</h1>
        <p>Visualize informações e estrutura do banco de dados</p>
        <div class="header-actions">
          <button id="btn-refresh-database" class="btn btn-secondary">
            🔄 Atualizar
          </button>
        </div>
      </div>

      <!-- Database Overview -->
      <div class="database-overview">
        <h3>📊 Visão Geral</h3>
        <div class="overview-grid">
          <div class="overview-card">
            <div class="card-header">
              <span class="card-icon">🗃️</span>
              <h4>Informações do Banco</h4>
            </div>
            <div class="card-content">
              <div class="info-row">
                <span class="info-label">Localização:</span>
                <span class="info-value">${this.truncateText(
                  this.databaseInfo.path || "N/A",
                  50
                )}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Tamanho:</span>
                <span class="info-value">${
                  this.databaseInfo.sizeFormatted || "N/A"
                }</span>
              </div>
              <div class="info-row">
                <span class="info-label">Tipo:</span>
                <span class="info-value">${
                  this.databaseInfo.type || "N/A"
                }</span>
              </div>
              <div class="info-row">
                <span class="info-label">Modificado:</span>
                <span class="info-value">${
                  this.databaseInfo.modified || "N/A"
                }</span>
              </div>
            </div>
          </div>

          <div class="overview-card">
            <div class="card-header">
              <span class="card-icon">📈</span>
              <h4>Estatísticas</h4>
            </div>
            <div class="card-content">
              <div class="info-row">
                <span class="info-label">Total de Tabelas:</span>
                <span class="info-value highlight">${
                  this.overview.summary?.totalTables || 0
                }</span>
              </div>
              <div class="info-row">
                <span class="info-label">Total de Registros:</span>
                <span class="info-value highlight">${this.formatNumber(
                  this.overview.summary?.totalRecords || 0
                )}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Cidade Primária:</span>
                <span class="info-value ${
                  this.overview.summary?.hasPrimaryCity ? "success" : "warning"
                }">
                  ${
                    this.overview.summary?.hasPrimaryCity
                      ? "✅ Configurada"
                      : "⚠️ Não configurada"
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tables List -->
      <div class="tables-section">
        <h3>📋 Tabelas do Banco</h3>
        <div class="tables-grid" id="tables-grid">
          ${this.renderTablesGrid()}
        </div>
      </div>

      <!-- Table Details -->
      <div class="table-details-section" id="table-details-section" style="display: none;">
        <h3>🔍 Detalhes da Tabela</h3>
        <div class="table-details-content" id="table-details-content">
          <!-- Detalhes serão carregados aqui -->
        </div>
      </div>
    `;

    this.setupDynamicEventListeners();
  }

  renderTablesGrid() {
    if (!this.tables || this.tables.length === 0) {
      return '<div class="empty-state">Nenhuma tabela encontrada</div>';
    }

    return this.tables
      .map(
        (table) => `
      <div class="table-card" data-table="${table}">
        <div class="table-header">
          <span class="table-icon">🗂️</span>
          <h4 class="table-name">${table}</h4>
        </div>
        <div class="table-info">
          <div class="table-count">
            <span class="count-label">Registros:</span>
            <span class="count-value">${this.formatNumber(
              this.tableCounts[table] || 0
            )}</span>
          </div>
          <div class="table-actions">
            <button class="btn-table-details btn-small" data-table="${table}">
              Ver Detalhes
            </button>
          </div>
        </div>
      </div>
    `
      )
      .join("");
  }

  setupDynamicEventListeners() {
    // Refresh button
    const btnRefresh = document.getElementById("btn-refresh-database");
    if (btnRefresh) {
      btnRefresh.addEventListener("click", () => this.refreshDatabase());
    }

    // Table cards click
    document.querySelectorAll(".table-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (!e.target.classList.contains("btn-table-details")) {
          const tableName = card.dataset.table;
          this.selectTable(tableName);
        }
      });
    });

    // Table details buttons
    document.querySelectorAll(".btn-table-details").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const tableName = btn.dataset.table;
        this.showTableDetails(tableName);
      });
    });
  }

  selectTable(tableName) {
    // Remove seleção anterior
    document.querySelectorAll(".table-card").forEach((card) => {
      card.classList.remove("selected");
    });

    // Adiciona seleção na nova tabela
    const selectedCard = document.querySelector(`[data-table="${tableName}"]`);
    if (selectedCard) {
      selectedCard.classList.add("selected");
      this.currentTable = tableName;
    }
  }

  async showTableDetails(tableName) {
    try {
      this.selectTable(tableName);
      this.showLoadingInElement(
        document.getElementById("table-details-content")
      );

      const result = await window.databaseAPI.getTableInfo(tableName);

      if (result.success) {
        this.renderTableDetails(tableName, result.data.columns);
        document.getElementById("table-details-section").style.display =
          "block";

        // Scroll suave para a seção de detalhes
        document.getElementById("table-details-section").scrollIntoView({
          behavior: "smooth",
        });
      } else {
        throw new Error(result.error || "Erro ao carregar detalhes da tabela");
      }
    } catch (error) {
      console.error("Error loading table details:", error);
      this.showStatus(
        `Erro ao carregar detalhes da tabela ${tableName}`,
        "error"
      );
      document.getElementById("table-details-content").innerHTML =
        '<div class="empty-state error">Erro ao carregar detalhes da tabela</div>';
    }
  }

  renderTableDetails(tableName, columns) {
    const recordCount = this.tableCounts[tableName] || 0;

    document.getElementById("table-details-content").innerHTML = `
      <div class="table-details-header">
        <div class="table-title">
          <h4>📋 ${tableName}</h4>
          <span class="table-record-count">${this.formatNumber(
            recordCount
          )} registros</span>
        </div>
        <button class="btn btn-secondary btn-small" id="btn-close-details">
          ✕ Fechar
        </button>
      </div>

      <div class="table-columns">
        <h5>🏗️ Estrutura da Tabela</h5>
        <div class="columns-table">
          <div class="columns-header">
            <div class="col-name">Nome da Coluna</div>
            <div class="col-type">Tipo</div>
            <div class="col-null">Permite NULL</div>
            <div class="col-key">Chave</div>
            <div class="col-default">Valor Padrão</div>
          </div>
          ${columns
            .map(
              (col) => `
            <div class="column-row">
              <div class="col-name">
                <span class="column-name">${col.name}</span>
              </div>
              <div class="col-type">
                <span class="column-type">${col.type}</span>
              </div>
              <div class="col-null">
                <span class="column-null ${
                  col.notnull ? "not-null" : "nullable"
                }">
                  ${col.notnull ? "❌ NOT NULL" : "✅ NULL"}
                </span>
              </div>
              <div class="col-key">
                <span class="column-key ${col.pk ? "primary-key" : ""}">
                  ${col.pk ? "🔑 PK" : ""}
                </span>
              </div>
              <div class="col-default">
                <span class="column-default">${col.dflt_value || "-"}</span>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;

    // Setup close button
    document
      .getElementById("btn-close-details")
      .addEventListener("click", () => {
        document.getElementById("table-details-section").style.display = "none";
        document.querySelectorAll(".table-card").forEach((card) => {
          card.classList.remove("selected");
        });
        this.currentTable = null;
      });
  }

  async refreshDatabase() {
    try {
      const btnRefresh = document.getElementById("btn-refresh-database");
      this.showButtonLoading(btnRefresh);

      await this.loadDatabaseOverview();
      this.renderDatabaseInterface();
      this.showStatus("Dados do banco atualizados com sucesso", "success");
    } catch (error) {
      console.error("Error refreshing database:", error);
      this.showStatus("Erro ao atualizar dados do banco", "error");
    }
  }

  showLoadingState() {
    this.databaseSection.innerHTML = `
      <div class="content-header">
        <h1>🗄️ Banco de Dados</h1>
        <p>Carregando informações do banco...</p>
      </div>
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Carregando dados...</p>
      </div>
    `;
  }

  showErrorState() {
    this.databaseSection.innerHTML = `
      <div class="content-header">
        <h1>🗄️ Banco de Dados</h1>
        <p>Erro ao carregar informações</p>
      </div>
      <div class="empty-state error">
        <span class="error-icon">⚠️</span>
        <p>Não foi possível carregar as informações do banco de dados</p>
        <button onclick="window.databaseManager.loadInitialData()" class="btn btn-primary">
          Tentar Novamente
        </button>
      </div>
    `;
  }

  showLoadingInElement(element) {
    element.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Carregando...</p>
      </div>
    `;
  }

  showButtonLoading(button) {
    const originalText = button.textContent;
    button.innerHTML = '<div class="loading"></div>' + originalText;
    button.disabled = true;
    button.dataset.originalText = originalText;
  }

  hideButtonLoading(button) {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }

  showStatus(message, type) {
    this.statusDiv.textContent = message;
    this.statusDiv.className = `status-message ${type} show`;

    setTimeout(() => {
      this.statusDiv.classList.remove("show");
    }, 3000);
  }

  formatNumber(num) {
    return new Intl.NumberFormat("pt-BR").format(num);
  }

  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }
}

// Inicializa quando o DOM estiver pronto
document.addEventListener("DOMContentLoaded", () => {
  // Só inicializa se estivermos na seção de database
  if (document.getElementById("database-section")) {
    window.databaseManager = new DatabaseManager();
  }
});
