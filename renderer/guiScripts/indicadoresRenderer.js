class IndicadoresRenderer {
  constructor() {
    this.isLoading = false;
    this.currentData = null;
    this.init();
  }

  init() {
    this.bindEvents();
    console.log("IndicadoresRenderer inicializado");

    // Verifica se já está na seção de indicadores ao carregar
    if (
      document
        .getElementById("indicators-section")
        ?.classList.contains("active")
    ) {
      this.loadIndicadores();
    }
  }

  bindEvents() {
    // Evento para quando a seção de indicadores for ativada
    const indicatorsMenuItem = document.querySelector(
      '[data-section="indicators"]'
    );
    if (indicatorsMenuItem) {
      indicatorsMenuItem.addEventListener("click", () => {
        console.log("Menu indicadores clicado - carregando dados...");
        setTimeout(() => this.loadIndicadores(), 100); // Pequeno delay para garantir que a seção foi ativada
      });
    }

    // Bind dos botões (serão criados dinamicamente)
    document.addEventListener("click", (e) => {
      if (e.target.id === "btn-refresh-stats") {
        this.loadIndicadores();
      } else if (e.target.id === "btn-export-txt") {
        this.exportToTxt();
      } else if (e.target.id === "btn-clear-stats") {
        this.confirmClearStatistics();
      } else if (e.target.id === "btn-view-hourly") {
        this.toggleView("hourly");
      } else if (e.target.id === "btn-view-complete") {
        this.toggleView("complete");
      }
    });
  }

  async loadIndicadores() {
    console.log("loadIndicadores chamado");

    if (this.isLoading) {
      console.log("Já está carregando, ignorando...");
      return;
    }

    // Verifica se a API existe
    if (!window.indicadoresAPI) {
      console.error("indicadoresAPI não encontrada");
      this.showError("API de indicadores não está disponível");
      return;
    }

    try {
      this.isLoading = true;
      this.showLoading();
      console.log("Chamando indicadoresAPI.getStatistics()...");

      const response = await window.indicadoresAPI.getStatistics();
      console.log("Resposta recebida:", response);

      if (response.success) {
        this.currentData = response.data;
        this.renderCompleteView(response.data);
        this.showStatus("Estatísticas carregadas com sucesso!", "success");
      } else {
        console.error("Erro na resposta:", response.error);
        this.showError(response.error || "Erro ao carregar estatísticas");
      }
    } catch (error) {
      console.error("Erro ao carregar indicadores:", error);
      this.showError("Erro ao carregar indicadores: " + error.message);
    } finally {
      this.isLoading = false;
    }
  }

  async loadHourlyStatistics() {
    if (this.isLoading) return;

    try {
      this.isLoading = true;
      this.showLoading();

      const response = await window.indicadoresAPI.getHourlyStatistics();

      if (response.success) {
        this.renderHourlyView(response.data);
        this.showStatus("Estatísticas de horários carregadas!", "success");
      } else {
        this.showError(
          response.error || "Erro ao carregar estatísticas de horários"
        );
      }
    } catch (error) {
      console.error("Erro ao carregar estatísticas de horários:", error);
      this.showError(
        "Erro ao carregar estatísticas de horários: " + error.message
      );
    } finally {
      this.isLoading = false;
    }
  }

  async exportToTxt() {
    if (this.isLoading) return;

    try {
      this.isLoading = true;
      this.showStatus("Exportando arquivo...", "info");

      const response = await window.indicadoresAPI.exportToTxt();

      if (response.success) {
        this.showStatus(
          response.message || "Arquivo exportado com sucesso!",
          "success"
        );
      } else {
        this.showError(response.error || "Erro ao exportar arquivo");
      }
    } catch (error) {
      console.error("Erro ao exportar arquivo:", error);
      this.showError("Erro ao exportar arquivo: " + error.message);
    } finally {
      this.isLoading = false;
    }
  }

  async confirmClearStatistics() {
    if (this.isLoading) return;

    const confirmed = confirm(
      "Tem certeza que deseja limpar todas as estatísticas?\n\n" +
        "Esta ação não pode ser desfeita!"
    );

    if (confirmed) {
      const doubleConfirmed = confirm(
        "CONFIRMAÇÃO FINAL:\n\n" +
          'Digite "CONFIRMAR" na próxima tela para prosseguir.\n' +
          "Deseja continuar?"
      );

      if (doubleConfirmed) {
        const finalConfirmation = prompt(
          'Digite "CONFIRMAR" (em maiúsculas) para limpar as estatísticas:'
        );

        if (finalConfirmation === "CONFIRMAR") {
          await this.clearStatistics();
        } else {
          this.showStatus(
            "Operação cancelada - confirmação incorreta",
            "warning"
          );
        }
      } else {
        this.showStatus("Operação cancelada pelo usuário", "warning");
      }
    }
  }

  async clearStatistics() {
    try {
      this.isLoading = true;
      this.showStatus("Limpando estatísticas...", "info");

      const response = await window.indicadoresAPI.clearStatistics();

      if (response.success) {
        this.currentData = response.data;
        this.renderCompleteView(response.data);
        this.showStatus(
          response.message || "Estatísticas limpas com sucesso!",
          "success"
        );
      } else {
        this.showError(response.error || "Erro ao limpar estatísticas");
      }
    } catch (error) {
      console.error("Erro ao limpar estatísticas:", error);
      this.showError("Erro ao limpar estatísticas: " + error.message);
    } finally {
      this.isLoading = false;
    }
  }

  toggleView(viewType) {
    if (viewType === "hourly") {
      this.loadHourlyStatistics();
    } else {
      this.loadIndicadores();
    }
  }

  renderCompleteView(data) {
    const section = document.getElementById("indicators-section");
    if (!section) {
      console.error("Seção indicators-section não encontrada");
      return;
    }

    console.log("Renderizando view completa com dados:", data);
    const processedData = this.processCompleteStatistics(data);

    section.innerHTML = `
      <div class="content-header">
        <h1>📊 Indicadores</h1>
        <p>Estatísticas completas do sistema</p>
      </div>

      <div class="indicators-controls">
        <button id="btn-refresh-stats" class="btn btn-primary">🔄 Atualizar</button>
        <button id="btn-view-hourly" class="btn btn-secondary">⏰ Ver Horários</button>
        <button id="btn-export-txt" class="btn btn-secondary">📄 Exportar TXT</button>
        <button id="btn-clear-stats" class="btn btn-danger">🗑️ Limpar Dados</button>
      </div>

      <div class="stats-summary">
        <div class="stat-card">
          <div class="stat-number">${processedData.clientesAtendidos}</div>
          <div class="stat-label">Clientes Atendidos</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${processedData.clientesConvidados}</div>
          <div class="stat-label">Clientes Convidados</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${processedData.taxaConversao}%</div>
          <div class="stat-label">Taxa de Conversão</div>
        </div>
      </div>

      ${
        processedData.horarioStats
          ? this.renderHorarioStats(processedData.horarioStats)
          : ""
      }

      <div class="stats-info">
        <p><strong>Última atualização:</strong> ${processedData.lastUpdated}</p>
      </div>
    `;
  }

  renderHourlyView(data) {
    const section = document.getElementById("indicators-section");
    if (!section) return;

    const processedData = this.processHourlyStatistics(data);

    section.innerHTML = `
      <div class="content-header">
        <h1>⏰ Estatísticas de Horários</h1>
        <p>Análise detalhada dos horários escolhidos</p>
      </div>

      <div class="indicators-controls">
        <button id="btn-refresh-stats" class="btn btn-primary">🔄 Atualizar</button>
        <button id="btn-view-complete" class="btn btn-secondary">📊 Ver Completo</button>
        <button id="btn-export-txt" class="btn btn-secondary">📄 Exportar TXT</button>
        <button id="btn-clear-stats" class="btn btn-danger">🗑️ Limpar Dados</button>
      </div>

      ${this.renderHourlyStats(processedData)}
    `;
  }

  renderHorarioStats(horarioStats) {
    if (!horarioStats || horarioStats.totalHorarios === 0) {
      return `
        <div class="horario-stats">
          <h3>📅 Estatísticas de Horários</h3>
          <div class="empty-state">Nenhum horário foi escolhido ainda.</div>
        </div>
      `;
    }

    return `
      <div class="horario-stats">
        <h3>📅 Estatísticas de Horários (Total: ${
          horarioStats.totalHorarios
        })</h3>
        
        <div class="horario-highlights">
          <div class="highlight-card popular">
            <div class="highlight-title">🏆 Mais Popular</div>
            <div class="highlight-value">${
              horarioStats.horarioMaisPopular.horario
            }</div>
            <div class="highlight-count">${
              horarioStats.horarioMaisPopular.count
            } escolhas</div>
          </div>
          
          ${
            horarioStats.horarioMenosPopular
              ? `
            <div class="highlight-card least">
              <div class="highlight-title">📉 Menos Popular</div>
              <div class="highlight-value">${horarioStats.horarioMenosPopular.horario}</div>
              <div class="highlight-count">${horarioStats.horarioMenosPopular.count} escolhas</div>
            </div>
          `
              : ""
          }
        </div>

        <div class="horario-list">
          ${horarioStats.horariosProcessados
            .map(
              (h) => `
            <div class="horario-item">
              <div class="horario-info">
                <span class="horario-time">${h.horario}</span>
                <span class="horario-count">${h.count} escolhas (${h.percentual}%)</span>
              </div>
              <div class="horario-bar">
                <div class="horario-progress" style="width: ${h.percentual}%"></div>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  renderHourlyStats(processedData) {
    if (!processedData.hasData) {
      return `
        <div class="hourly-stats">
          <h3>📅 Estatísticas de Horários</h3>
          ${
            processedData.hasHorarios
              ? `
            <div class="available-hours">
              <h4>Horários Disponíveis:</h4>
              <ul>
                ${processedData.horariosDisponiveis
                  .map((h) => `<li>${h.horario}</li>`)
                  .join("")}
              </ul>
            </div>
          `
              : ""
          }
          <div class="empty-state">Nenhum horário foi escolhido ainda.</div>
        </div>
      `;
    }

    return `
      <div class="hourly-stats">
        <div class="hourly-summary">
          <div class="summary-item">
            <span class="summary-number">${processedData.totalHorarios}</span>
            <span class="summary-label">Total de Escolhas</span>
          </div>
          <div class="summary-item">
            <span class="summary-number">${
              processedData.horariosComEscolhas
            }</span>
            <span class="summary-label">Horários Escolhidos</span>
          </div>
          <div class="summary-item">
            <span class="summary-number">${processedData.horariosZerados}</span>
            <span class="summary-label">Sem Escolhas</span>
          </div>
        </div>

        <div class="hourly-ranking">
          <h4>🏆 Ranking de Horários</h4>
          ${processedData.horariosOrdenados
            .map(
              (h) => `
            <div class="ranking-item ${h.count === 0 ? "zero-count" : ""}">
              <div class="ranking-position">#${h.posicao}</div>
              <div class="ranking-info">
                <span class="ranking-time">${h.horario}</span>
                <span class="ranking-stats">${h.count} escolhas (${
                h.percentual
              }%)</span>
              </div>
              <div class="ranking-bar">
                <div class="ranking-progress" style="width: ${
                  h.count > 0 ? h.percentual : "0"
                }%"></div>
              </div>
            </div>
          `
            )
            .join("")}
        </div>

        ${
          processedData.horariosNaoEscolhidos.length > 0
            ? `
          <div class="unused-hours">
            <h4>⏰ Horários Não Escolhidos</h4>
            <ul>
              ${processedData.horariosNaoEscolhidos
                .map((h) => `<li>${h}</li>`)
                .join("")}
            </ul>
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  processCompleteStatistics(stats) {
    const taxaConversao =
      stats.clientesAtendidos > 0
        ? ((stats.clientesConvidados / stats.clientesAtendidos) * 100).toFixed(
            1
          )
        : "0.0";

    let horarioStats = null;

    if (stats.horariosEscolhidos) {
      let totalHorarios = 0;
      Object.values(stats.horariosEscolhidos).forEach((horario) => {
        totalHorarios += horario.count;
      });

      if (totalHorarios > 0) {
        const horariosProcessados = Object.entries(
          stats.horariosEscolhidos
        ).map(([id, horario]) => {
          const percentual = ((horario.count / totalHorarios) * 100).toFixed(1);
          return {
            id,
            horario: horario.horario,
            count: horario.count,
            percentual,
          };
        });

        const horarioMaisPopular = Object.entries(
          stats.horariosEscolhidos
        ).reduce((prev, current) =>
          prev[1].count > current[1].count ? prev : current
        );

        const horariosComEscolhas = Object.entries(
          stats.horariosEscolhidos
        ).filter(([_, horario]) => horario.count > 0);

        let horarioMenosPopular = null;
        if (horariosComEscolhas.length > 1) {
          horarioMenosPopular = horariosComEscolhas.reduce((prev, current) =>
            prev[1].count < current[1].count ? prev : current
          );
        }

        horarioStats = {
          horariosProcessados,
          totalHorarios,
          horarioMaisPopular: {
            horario: horarioMaisPopular[1].horario,
            count: horarioMaisPopular[1].count,
          },
          horarioMenosPopular: horarioMenosPopular
            ? {
                horario: horarioMenosPopular[1].horario,
                count: horarioMenosPopular[1].count,
              }
            : null,
        };
      }
    }

    return {
      clientesAtendidos: stats.clientesAtendidos,
      clientesConvidados: stats.clientesConvidados,
      taxaConversao,
      lastUpdated: stats.lastUpdated || "N/A",
      horarioStats,
    };
  }

  processHourlyStatistics(hourlyStats) {
    if (Object.keys(hourlyStats).length === 0) {
      return { hasData: false };
    }

    let totalHorarios = 0;
    Object.values(hourlyStats).forEach((horario) => {
      totalHorarios += horario.count;
    });

    if (totalHorarios === 0) {
      const horariosDisponiveis = Object.entries(hourlyStats).map(
        ([id, horario]) => ({
          id,
          horario: horario.horario,
        })
      );

      return {
        hasData: false,
        hasHorarios: true,
        horariosDisponiveis,
      };
    }

    const horariosOrdenados = Object.entries(hourlyStats)
      .sort(([, a], [, b]) => b.count - a.count)
      .map(([id, horario], index) => {
        const percentual = ((horario.count / totalHorarios) * 100).toFixed(1);
        return {
          posicao: index + 1,
          id,
          horario: horario.horario,
          count: horario.count,
          percentual,
        };
      });

    const horariosComEscolhas = horariosOrdenados.filter((h) => h.count > 0);
    const horariosZerados = horariosOrdenados.filter((h) => h.count === 0);

    return {
      hasData: true,
      horariosOrdenados,
      totalHorarios,
      horariosComEscolhas: horariosComEscolhas.length,
      horariosZerados: horariosZerados.length,
      horariosNaoEscolhidos: horariosZerados.map((h) => h.horario),
    };
  }

  showLoading() {
    const section = document.getElementById("indicators-section");
    if (section) {
      section.innerHTML = `
        <div class="content-header">
          <h1>📊 Indicadores</h1>
          <p>Carregando estatísticas...</p>
        </div>
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Carregando dados...</p>
        </div>
      `;
    }
  }

  showStatus(message, type = "info") {
    const statusEl = document.getElementById("status");
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.className = `status-message ${type}`;
      statusEl.style.display = "block";

      setTimeout(() => {
        statusEl.style.display = "none";
      }, 5000);
    }
  }

  showError(message) {
    this.showStatus(message, "error");
    console.error("IndicadoresRenderer Error:", message);
  }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener("DOMContentLoaded", () => {
  if (window.indicadoresAPI) {
    window.indicadoresRenderer = new IndicadoresRenderer();
  } else {
    console.warn("indicadoresAPI não encontrada - aguardando...");

    // Tenta novamente após um tempo
    setTimeout(() => {
      if (window.indicadoresAPI) {
        console.log("indicadoresAPI encontrada após delay");
        window.indicadoresRenderer = new IndicadoresRenderer();
      } else {
        console.error("indicadoresAPI ainda não encontrada após delay");
      }
    }, 1000);
  }
});
